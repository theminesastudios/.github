/* Braided progress bar: three grey strands run the full width and get braided into colour
   as the fill advances. The braid itself stays put; only its front edge moves.
   Usage: const bar = braidProgress(canvas); bar.set(0.42); bar.pause(true);
   With { snake: { length, period } } it has no value: a braided stretch `length` (share of
   the width) crawls along the strands forever, one lap every `period` seconds.
   `scale` sizes the whole braid up (1 fits a 32px-high canvas); `value` starts it already
   filled that far, with no fill animation; `shift` (px) slides the weave pattern along, so
   braids side by side don't cross in step. */

// The three strands of one braid as depth-sorted segments, in braid coordinates: `x` runs
// along the braid from its start, `y` across it from its centre line.
function braidGeometry(options = {}) {
  const scale = options.scale || 1;
  const amplitude = 9 * scale;
  const wavelength = 57 * scale;
  const thickness = 5 * scale;
  const spread = 5.5 * scale;
  const looseWidth = 2.75 * scale;
  const swing = wavelength * 0.6;
  const strands = options.colors || ["#0b4fc2", "#1a7dff", "#62adff"];
  const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const greyRgb = rgb(options.grey || "#cfcfd2");
  const strandRgb = strands.map(rgb);
  const ease = (w) => {
    w = Math.min(1, Math.max(0, w));
    return w * w * (3 - 2 * w);
  };

  // `s` is the braid's state: its `length`, where the weave `end`s, how long a loose `tail`
  // it starts with, its pattern `shift`, colour `blend`, idle `sag`/`idle`, and for a snake
  // its `head`, `len` and lap `span`.
  function segments(s, from, to, step = 1) {
    const edge = thickness / 2 + 1;
    const phase = (x, k) => ((x + s.shift) / wavelength) * Math.PI * 2 + (k * Math.PI * 2) / 3;

    // Where x sits relative to the weave: inside it, or `out` px beyond its nearest end `tip`.
    // For the snake both ends count, wrapping round the edges.
    const locate = (x) => {
      if (s.snake) {
        const d = (((s.head - x) % s.span) + s.span) % s.span;
        if (d < s.len) return { inside: true };
        const ahead = s.span - d;
        const behind = d - s.len;
        return ahead < behind ? { out: ahead, tip: x - ahead } : { out: behind, tip: x + behind };
      }
      if (x < s.tail) return { out: s.tail - x, tip: s.tail };
      return x <= s.end ? { inside: true } : { out: x - s.end, tip: s.end };
    };

    // The weave keeps its full shape and colour right up to its end. Past the end each
    // strand carries on along its own curve, over or under the others as it was, while the
    // curve flattens into its lane within `swing` px: the next stitch being laid, with no
    // kink where weave and loose strand meet. Loose strands ahead of a paused fill sway
    // slowly up and down as if idling, each a beat behind the one above; the top strand is
    // the tautest.
    const lane = (x, k) => {
      const at = locate(x);
      const a = phase(x, k);
      if (at.inside) return { e: 1, u: 0, face: -Math.cos(a), y: Math.sin(a) * amplitude, z: -Math.cos(a) };
      const u = ease(at.out / swing);
      const ahead = !s.snake && at.tip === s.end;
      const t = (x - s.end) / Math.max(1, s.length - edge - s.end);
      const sway = Math.sin(s.idle * 1.2 - k * 0.6) * [1.5, 4.5, 7.5][k] * scale;
      const hang = ahead ? Math.sin(Math.PI * t) * s.sag * sway : 0;
      const loose = (k - 1) * spread + hang;
      const y = Math.sin(a) * amplitude + (loose - Math.sin(a) * amplitude) * u;
      return { e: 1 - ease(at.out / s.blend), u, face: -Math.cos(a) * (1 - u), y, z: -Math.cos(a) * (1 - u) - 2 * u };
    };

    // Loose strands sink beneath everything as they settle into their lanes.
    const segs = [];
    for (let x = Math.max(edge, from); x < Math.min(s.length - edge, to); x += step) {
      for (let k = 0; k < 3; k++) {
        const p = lane(x, k);
        segs.push({ x, y1: p.y, y2: lane(x + step, k).y, ...p, k });
      }
    }
    return segs.sort((p, q) => p.z - q.z);
  }

  // Coloured inside the weave, fading to grey over `blend` px past its end. Strands are
  // shaded by depth: the one crossing over a touch wider (and lighter once coloured), the
  // one passing under darker, so every crossing (the one being laid at the front too) reads
  // as one strand over another. Loose strands thin out to their resting width.
  // `toScreen(x, y)` places a braid point on the canvas.
  function paint(ctx, segs, toScreen, step = 1) {
    ctx.lineCap = "round";
    for (const s of segs) {
      const shade = 1 + s.face * 0.14 * (s.face < 0 ? 1 : s.e);
      const c = strandRgb[s.k].map((v, i) =>
        Math.min(255, Math.round((greyRgb[i] + (v - greyRgb[i]) * s.e) * shade)),
      );
      ctx.strokeStyle = `rgb(${c})`;
      ctx.lineWidth = thickness + (looseWidth - thickness) * s.u + s.face * 0.9 * scale;
      ctx.beginPath();
      ctx.moveTo(...toScreen(s.x, s.y1));
      ctx.lineTo(...toScreen(s.x + step * 1.2, s.y2));
      ctx.stroke();
    }
  }

  return { amplitude, wavelength, thickness, swing, segments, paint };
}

function braidProgress(canvas, options = {}) {
  const ctx = canvas.getContext("2d");
  const geo = braidGeometry(options);
  const snake = options.snake;
  let blend = options.blend || 60;

  let value = options.value || 0;
  let shown = value;
  let head = 0;
  let paused = false;
  let sag = 0;
  let idle = 0;
  let last = 0;
  let width = 0;
  let height = 0;
  let raf = 0;
  let dirty = true;

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dirty = true;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const edge = geo.thickness / 2 + 1;
    const span = width - edge * 2;
    const state = {
      length: width,
      end: edge + span * shown,
      tail: 0,
      shift: options.shift || 0,
      blend,
      sag,
      idle,
      snake: !!snake,
      head,
      span,
      len: snake ? span * snake.length : 0,
    };
    geo.paint(ctx, geo.segments(state, 0, width), (x, y) => [x, height / 2 + y]);
  }

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    // A paused braid stops filling where it is until it's resumed.
    if (!paused) shown += (value - shown) * Math.min(1, dt * 8);
    if (Math.abs(value - shown) < 0.0002) shown = value;
    sag += ((paused ? 1 : 0) - sag) * Math.min(1, dt * 5);
    if (sag > 0.001) idle += dt;
    if (snake && !paused) head += (dt * (width - geo.thickness - 2)) / snake.period;
    // Only redraw while something is moving.
    const moving = (shown !== value && !paused) || sag > 0.001 || (snake && !paused);
    if (moving || dirty) draw();
    dirty = moving;
    raf = requestAnimationFrame(frame);
  }

  resize();
  new ResizeObserver(resize).observe(canvas);
  raf = requestAnimationFrame(frame);

  return {
    set(v) {
      value = Math.min(1, Math.max(0, v));
    },
    // Length in px of the colour-to-grey fade on the loose strands past the braid's ends.
    blend(px) {
      blend = px;
      dirty = true;
    },
    pause(on) {
      paused = on;
    },
    stop() {
      cancelAnimationFrame(raf);
    },
  };
}
