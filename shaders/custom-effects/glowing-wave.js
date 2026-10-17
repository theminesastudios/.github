// lib/custom-effects/CodeComponentId_cd43ef0afb2cac168a28e7f79135150678ccfd25_433
// "Glowing wave" shader, copied verbatim from the Figma design (Cardpost back > STAMP 4 > ACI).

// Property metadata is only used in Figma Design, so this is a no-op.
function defineProperties(
  _component,
  _properties,
) {}

export default function Effect() { }
export function setup(device, frame) {
    var wgsl = `
diagnostic(off,derivative_uniformity);

struct Uniforms {
  frameData:    vec4f,  // x=time, y=width, z=height, w=unused
  waveColor:    vec4f,  // r,g,b,a
  wavelength:   f32,
  zoom:         f32,
  amplitude:    f32,
  glowIntensity:f32,
  thickness:    f32,
  offset:       f32,
  _pad0:        f32,
  _pad1:        f32,
  centerX:      f32,
  centerY:      f32,
  angleDeg:     f32,
  _pad2:        f32,
};

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) uv_in: vec2f, @builtin(position) fragCoord: vec4f) -> @location(0) vec4f {
  let time          = u.frameData.x;
  let frameW        = u.frameData.y;
  let frameH        = u.frameData.z;
  let wavelengthPx  = u.wavelength;
  let zoom          = u.zoom;
  let amplitudePx   = u.amplitude;
  let glowIntensity = u.glowIntensity;
  let thickness     = u.thickness;
  let offset        = u.offset;
  let centerX       = u.centerX;
  let centerY       = u.centerY;
  let angleDeg      = u.angleDeg;

  let PI = 3.14159265;

  // Center in pixels
  let cx = centerX * frameW / 100.0;
  let cy = centerY * frameH / 100.0;

  // Translate fragment to center, apply zoom, then normalize into aspect-ratio-
  // corrected space where both axes use frameW as the reference length.
  // This ensures the wave shape (amplitude-to-period ratio) is preserved at any angle.
  let aspect = frameW / frameH;
  let dxN = (fragCoord.x - cx) / zoom;            // already in px along x (ref=frameW)
  let dyN = (fragCoord.y - cy) / zoom * aspect;    // scale y so 1 unit = frameW px

  // Rotate by angle in normalized space
  let a = angleDeg * PI / 180.0;
  let rx =  dxN * cos(a) + dyN * sin(a); // along-wave axis (normalized px)
  let ry = -dxN * sin(a) + dyN * cos(a); // cross-wave axis (normalized px)

  // Wave evaluated in normalized space: amplitudePx and wavelengthPx are in real px,
  // but since x axis is unchanged (ref=frameW), they apply directly.
  let waveY = amplitudePx * sin(2.0 * PI / wavelengthPx * rx + offset / 100.0 * 2.0 * PI);

  // Distance in normalized space, converted back to real pixels for glow/core falloff.
  // The cross-wave axis was scaled by aspect, so divide by aspect to get real px.
  let dNorm = abs(ry - waveY);
  let d = dNorm / aspect;

  // Core: sharp line half-width in pixels
  let lineHalfWidthPx = thickness * 2.0;
  let core = 1.0 - smoothstep(0.0, lineHalfWidthPx, d);

  // Glow bloom: spread in pixels, scaled by glowIntensity
  let glowSpreadPx = 40.0 + glowIntensity * 60.0;
  let glow = pow(1.0 - pow(clamp(d / glowSpreadPx, 0.0, 1.0), 0.4), 1.0);

  let brightness = clamp(core + glow * glowIntensity, 0.0, 1.0);
  let waveColor = u.waveColor;
  let bgColor = vec4f(0.0, 0.0, 0.0, 1.0);
  let waveA = waveColor.a * brightness;
  let bgA   = bgColor.a * (1.0 - waveA);
  let outA  = waveA + bgA;
  let outRGB = select(
      vec3f(0.0),
      (waveColor.rgb * waveA + bgColor.rgb * bgA) / outA,
      outA > 0.0001
  );
  return vec4f(outRGB * outA, outA);
}
`;
    frame.state.module = device.createShaderModule({ code: wgsl });
    frame.state.pipeline = null;
    frame.state.pipelineFormat = null;
    frame.state.quad = device.createBuffer({
        size: 6 * 4 * 4,
        usage: GPUBufferUsage.VERTEX,
        mappedAtCreation: true,
    });
    new Float32Array(frame.state.quad.getMappedRange()).set([
        -1, -1, 0, 1,
        1, -1, 1, 1,
        -1, 1, 0, 0,
        -1, 1, 0, 0,
        1, -1, 1, 1,
        1, 1, 1, 0,
    ]);
    frame.state.quad.unmap();
    // Uniforms: frameData(16) + waveColor(16) + wave scalars(16) + glow scalars(16) + transform scalars(16) = 80 bytes
    frame.state.uniformBuf = device.createBuffer({
        size: 80,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
}
export function render(device, frame) {
    var params = frame.params || {};
    function finiteNumber(value, fallback) {
        var num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }
    function numberParam(name, fallback) {
        return finiteNumber(params[name], fallback);
    }
    var output = frame.output || {};
    var width = Math.max(1, finiteNumber(output.width, 1));
    var height = Math.max(1, finiteNumber(output.height, 1));
    var time = finiteNumber(frame.time, 0);
    var color = params.waveColor || { r: 0, g: 1, b: 0.6, a: 1 };
    var cr = finiteNumber(color.r, 0);
    var cg = finiteNumber(color.g, 1);
    var cb = finiteNumber(color.b, 0.6);
    var ca = finiteNumber(color.a, 1);
    var amplitudeParam = numberParam("amplitude", 15);
    var amplitude = amplitudeParam / 100.0 * width;
    var zoom = numberParam("zoom", 1.0);
    var glowIntensity = numberParam("glowIntensity", 1.0);
    var thickness = 1.0;
    var offset = numberParam("offset", 0.0);
    var transform = params.transform || { x: 50, y: 50, radius: 30, angle: 0 };
    var transformX = finiteNumber(transform.x, 50);
    var transformY = finiteNumber(transform.y, 50);
    var transformRadius = finiteNumber(transform.radius, 30);
    var transformAngle = finiteNumber(transform.angle, 0);
    // radius% of frameWidth = wavelengthPx
    var wavelengthPx = transformRadius * width / 100.0;
    device.queue.writeBuffer(frame.state.uniformBuf, 0, new Float32Array([
        time, width, height, 0, // frameData
        cr, cg, cb, ca, // waveColor
        wavelengthPx, zoom, amplitude, glowIntensity, // wavelength,zoom,amplitude,glowIntensity
        thickness, offset, 0, 0, // thickness,offset,_pad0,_pad1
        transformX, transformY, transformAngle, 0, // centerX,centerY,angleDeg,_pad2
    ]));
    var outputFormat = frame.output.format;
    if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
        frame.state.pipeline = device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: frame.state.module,
                entryPoint: 'vs_main',
                buffers: [{
                        arrayStride: 16,
                        attributes: [
                            { shaderLocation: 0, format: 'float32x2', offset: 0 },
                            { shaderLocation: 1, format: 'float32x2', offset: 8 },
                        ],
                    }],
            },
            fragment: {
                module: frame.state.module,
                entryPoint: 'fs_main',
                targets: [{ format: outputFormat }],
            },
            primitive: { topology: 'triangle-list' },
        });
        frame.state.pipelineFormat = outputFormat;
    }
    var bindGroup = device.createBindGroup({
        layout: frame.state.pipeline.getBindGroupLayout(0),
        entries: [
            { binding: 0, resource: { buffer: frame.state.uniformBuf } },
        ],
    });
    var encoder = device.createCommandEncoder();
    var pass = encoder.beginRenderPass({
        colorAttachments: [{
                view: frame.output.createView(),
                loadOp: 'clear',
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                storeOp: 'store',
            }],
    });
    pass.setPipeline(frame.state.pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.setVertexBuffer(0, frame.state.quad);
    pass.draw(6);
    pass.end();
    device.queue.submit([encoder.finish()]);
}
defineProperties(Effect, {
    "waveColor": {
        type: "color",
        label: "Wave color",
        defaultValue: { r: 0, g: 1, b: 0.6, a: 1 },
    },
    "amplitude": {
        type: "number",
        label: "Amplitude",
        defaultValue: 15,
        control: "slider",
        min: 0,
        max: 30,
        step: 0.1,
    },
    "glowIntensity": {
        type: "number",
        label: "Glow intensity",
        defaultValue: 1,
        control: "slider",
        min: 0,
        max: 2,
        step: 0.01,
    },
    "zoom": {
        type: "number",
        label: "Scale",
        defaultValue: 1,
        control: "slider",
        min: 0.1,
        max: 5,
        step: 0.01,
    },
    "offset": {
        type: "number",
        label: "Phase",
        defaultValue: 0,
        control: "slider",
        min: 0,
        max: 100,
        step: 0.1,
    },
    "transform": {
        type: "point-angle-radius",
        label: "Transform",
        defaultValue: { x: 50, y: 50, angle: 0, radius: 30 },
        mode: "canvas_and_ui",
        positionUnit: "%",
        radiusUnit: "%",
    },
});

export const manifest = {
  "name": "Glowing wave",
  "version": 2,
  "isAnimated": true,
  "usesMouse": false
}
