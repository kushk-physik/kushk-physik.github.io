// ---------- Hero: magnetic field lines ----------
// A 2D magnetic field B = curl(A z) built from a flux function A(x, y, t):
// a set of drifting flux tubes (Gaussian islands) on a sheared background.
// Field lines are traced along B and drawn additively, so dense, strong-field
// regions glow. New lines are added each frame while old ones slowly fade,
// so the pattern evolves as the islands drift.
(() => {
  const canvas = document.getElementById('field');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const BG = '8,12,22';
  let W, H, L, islands = [], t = 0, running = true, raf;
  const rand = (a, b) => a + Math.random() * (b - a);

  function makeIslands() {
    islands = [];
    const n = W < 700 ? 9 : 16;
    for (let i = 0; i < n; i++) {
      const r = rand(0.06, 0.2) * L;
      islands.push({ x: rand(-0.1, 1.1) * W, y: rand(-0.1, 1.1) * H, r, s: rand(0.5, 1.2) * (Math.random() < 0.5 ? -1 : 1) * r,
        vx: rand(-0.25, 0.25), vy: rand(-0.15, 0.15) });
    }
  }

  // B = (dA/dy, -dA/dx)
  function field(x, y) {
    let bx = 0, by = 0;
    for (const k of islands) {
      const dx = x - k.x, dy = y - k.y, r2 = k.r * k.r;
      const g = (k.s * 2 / r2) * Math.exp(-(dx * dx + dy * dy) / r2);
      bx -= g * dy; by += g * dx;
    }
    const ky = (2 * Math.PI) / H, kx = (2 * Math.PI) / W;
    bx += 0.55 * Math.cos(ky * y * 1.5 + t * 0.2);              // sheared background
    by += 0.35 * Math.sin(kx * x * 2.0 + y * ky * 0.5 - t * 0.15);
    return [bx, by];
  }

  const stops = [[70, 20, 150], [130, 50, 230], [175, 110, 255], [205, 185, 255], [240, 245, 255]];
  function color(f, a) {
    f = Math.max(0, Math.min(0.999, f)) * (stops.length - 1);
    const i = Math.floor(f), m = f - i, A = stops[i], B = stops[i + 1];
    return `rgba(${A[0] + (B[0] - A[0]) * m | 0},${A[1] + (B[1] - A[1]) * m | 0},${A[2] + (B[2] - A[2]) * m | 0},${a})`;
  }

  function traceLine() {
    let x = rand(0, W), y = rand(0, H);
    const steps = 160, h = 2.2;
    for (const dir of [1, -1]) {
      let px = x, py = y;
      ctx.beginPath(); ctx.moveTo(px, py);
      let mag = 0;
      for (let i = 0; i < steps; i++) {
        const [bx, by] = field(px, py);
        const b = Math.hypot(bx, by) || 1e-6;
        mag += b;
        // midpoint (RK2) step along the unit field direction
        const mx = px + dir * h * 0.5 * bx / b, my = py + dir * h * 0.5 * by / b;
        const [cx, cy] = field(mx, my);
        const c = Math.hypot(cx, cy) || 1e-6;
        px += dir * h * cx / c; py += dir * h * cy / c;
        ctx.lineTo(px, py);
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) break;
      }
      const strength = mag / steps;          // mean |B| along the line
      ctx.strokeStyle = color(strength / 1.5, 0.11 + Math.min(0.14, strength * 0.07));
      ctx.stroke();
    }
  }

  function draw(lines, fade) {
    if (fade) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(${BG},${fade})`; ctx.fillRect(0, 0, W, H); }
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = 1;
    for (let i = 0; i < lines; i++) traceLine();
    ctx.globalCompositeOperation = 'source-over';
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const rect = canvas.getBoundingClientRect();
    W = rect.width; H = rect.height; L = Math.max(W, H);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = `rgb(${BG})`; ctx.fillRect(0, 0, W, H);
    makeIslands();
    draw(Math.round((W * H) / 520), 0);      // initial dense frame
  }

  function frame() {
    if (!running) return;
    t += 0.016;
    for (const k of islands) {
      k.x += k.vx; k.y += k.vy;
      if (k.x < -0.2 * W) k.x = 1.2 * W; if (k.x > 1.2 * W) k.x = -0.2 * W;
      if (k.y < -0.2 * H) k.y = 1.2 * H; if (k.y > 1.2 * H) k.y = -0.2 * H;
    }
    draw(W < 700 ? 14 : 30, 0.018);
    raf = requestAnimationFrame(frame);
  }

  resize();
  if (!reduce) {
    frame();
    const restart = () => { cancelAnimationFrame(raf); if (running) frame(); };
    new IntersectionObserver(([e]) => { running = e.isIntersecting && !document.hidden; restart(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { running = !document.hidden; restart(); });
  }
  let rt, lastW = innerWidth;
  window.addEventListener('resize', () => {
    if (Math.abs(innerWidth - lastW) < 2) return;   // ignore mobile URL-bar height changes
    lastW = innerWidth; clearTimeout(rt); rt = setTimeout(resize, 200);
  });
})();

// ---------- Mobile nav ----------
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
if (nav && toggle) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('.nav-links a').forEach((a) =>
    a.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', false); })
  );
}
