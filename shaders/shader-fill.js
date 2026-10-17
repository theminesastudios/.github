// Vanilla port of the Figma shader runtime's ShaderFill path
// (custom-effect-runtime: webgpu.ts, useShaderRuntime.ts, components/ShaderFill.tsx).
// This site has no React or build step, so the hooks become one function with the same
// device singleton, DPI handling, resize handling and animation clock. ShaderFill is
// procedural (no DOM input), so the HTML-in-Canvas copy path is not needed.

// --- webgpu.ts: one shared device for every shader on the page ---
let devicePromise = null;

export function acquireDevice() {
  if (!devicePromise) {
    devicePromise = (async () => {
      const gpu = navigator.gpu;
      if (!gpu) {
        throw new Error("WebGPU unsupported.");
      }
      const adapter = await gpu.requestAdapter();
      if (!adapter) {
        throw new Error("Failed to get WebGPU adapter.");
      }
      return adapter.requestDevice();
    })();
    devicePromise.catch(() => {
      devicePromise = null;
    });
  }
  return devicePromise;
}

// --- useShaderRuntime.ts: textures report logical (CSS px) size, keep physical size alongside ---
export function makeDpiIndependent(texture, dpi, logicalWidth, logicalHeight) {
  if (texture.physicalWidth !== undefined && texture.physicalHeight !== undefined) {
    return texture;
  }
  const physicalWidth = texture.width;
  const physicalHeight = texture.height;
  Object.defineProperty(texture, "width", { value: logicalWidth, writable: false, configurable: true, enumerable: true });
  Object.defineProperty(texture, "height", { value: logicalHeight, writable: false, configurable: true, enumerable: true });
  texture.dpi = dpi;
  texture.physicalWidth = physicalWidth;
  texture.physicalHeight = physicalHeight;
  return texture;
}

export const DEFAULT_MANIFEST = { version: 2, isAnimated: false, usesMouse: false, name: "" };

/**
 * Renders a Figma shader ({ setup, render, params, manifest }) into a canvas.
 * Returns a controller with destroy(). If WebGPU is unavailable the canvas is removed,
 * matching ShaderFill returning null on error.
 */
export function createShaderFill(canvas, shader) {
  let destroyed = false;
  let raf = null;
  let lastTs = null;
  let resizeObserver = null;
  let runtime = null;

  const frameState = () => ({
    gpu: runtime.gpu,
    input: runtime.input,
    output: runtime.output,
    time: runtime.time,
    deltaTime: runtime.deltaTime,
    frame: runtime.frame,
    mousePosition: { x: 0, y: 0, down: false },
    renderScale: window.devicePixelRatio || 1,
    params: shader.params,
    state: runtime.state,
  });

  function createInput() {
    const rect = canvas.getBoundingClientRect();
    const dpi = canvas.width / Math.max(rect.width, 1);
    return makeDpiIndependent(
      runtime.gpu.device.createTexture({
        size: [canvas.width, canvas.height, 1],
        format: runtime.gpu.format,
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      }),
      dpi,
      rect.width,
      rect.height,
    );
  }

  function renderCore() {
    if (!runtime || !runtime.setupComplete || !runtime.input) return;
    try {
      const dpi = runtime.input.dpi;
      const outputTexture = runtime.gpu.context.getCurrentTexture();
      runtime.output = makeDpiIndependent(outputTexture, dpi, outputTexture.width / dpi, outputTexture.height / dpi);
      shader.render(runtime.gpu.device, frameState());
    } catch (e) {
      // Transient render failures are logged and retried on the next frame.
      console.warn("Failed to render effect", e);
      return;
    }
    if (runtime.isAnimated) startClock();
    else stopClock();
  }

  function startClock() {
    if (raf != null) return;
    lastTs = null;
    const tick = (ts) => {
      if (!runtime || destroyed) {
        raf = null;
        return;
      }
      raf = requestAnimationFrame(tick);
      runtime.deltaTime = lastTs == null ? 0 : ts - lastTs;
      lastTs = ts;
      runtime.time += runtime.deltaTime;
      runtime.frame += 1;
      renderCore();
    };
    raf = requestAnimationFrame(tick);
  }

  function stopClock() {
    if (raf != null) cancelAnimationFrame(raf);
    raf = null;
    lastTs = null;
  }

  function fail(e) {
    console.warn("Failed to initialize shader runtime", e);
    destroy();
    canvas.remove();
  }

  acquireDevice().then((device) => {
    if (destroyed) return;
    try {
      const context = canvas.getContext("webgpu");
      if (!context) throw new Error("Failed to get WebGPU context.");
      const format = "rgba8unorm";
      context.configure({ device, format, alphaMode: "premultiplied" });

      // CSS-pixel canvas: the glowing-wave shader positions the wave from output.width (the
      // logical size) but evaluates fragCoord in physical pixels, so on HiDPI screens a
      // device-pixel canvas would push the wave into one corner. It is a soft 29% glow, so
      // CSS-pixel resolution is indistinguishable.
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.max(Math.round(rect.width), 1);
      canvas.height = Math.max(Math.round(rect.height), 1);

      runtime = {
        gpu: { device, context, format },
        input: null,
        output: null,
        state: {},
        time: 0,
        deltaTime: 0,
        frame: 0,
        isAnimated: (shader.manifest ?? DEFAULT_MANIFEST).isAnimated,
        setupComplete: false,
      };
      runtime.input = createInput();
      shader.setup(device, frameState());
      runtime.setupComplete = true;
      renderCore();

      // Follow the box size (in CSS pixels, see above).
      resizeObserver = new ResizeObserver(() => {
        const box = canvas.getBoundingClientRect();
        canvas.width = Math.max(Math.round(box.width), 1);
        canvas.height = Math.max(Math.round(box.height), 1);
        if (!runtime) return;
        runtime.input?.destroy();
        try {
          runtime.input = createInput();
        } catch (e) {
          fail(e);
          return;
        }
        renderCore();
      });
      resizeObserver.observe(canvas);
    } catch (e) {
      fail(e);
    }
  }, fail);

  function destroy() {
    destroyed = true;
    stopClock();
    resizeObserver?.disconnect();
    if (runtime) {
      runtime.input?.destroy();
      runtime = null;
    }
  }

  return { destroy };
}
