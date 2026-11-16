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

// ---------- Nav bar: charged dots ----------
// Idle: each dot gyrates around one of two guide "field lines" while drifting
// sideways, with a little Brownian jitter. When the pointer is over the bar the
// dots light up and swarm to it, shedding small sparks as they slow down.
// On a new page the dots start bunched on the link that was clicked, then spread.
(() => {
  const bar = document.querySelector('.nav');
  if (!bar) return;
  const cv = document.createElement('canvas');
  cv.className = 'nav-dots';
  cv.setAttribute('aria-hidden', 'true');
  bar.prepend(cv);
  const ctx = cv.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, dots = [], sparks = [], px = 0, py = 0, hot = false, wasHot = false, raf = null, last = null;
  const SCATTER = 4.5;   // outward kick speed (px/frame) when a cluster breaks up
  function burst(cx, cy) {
    for (const d of dots) {
      let dx = d.x - cx, dy = d.y - cy, r = Math.hypot(dx, dy);
      if (r < 0.5) { const a = rnd(0, Math.PI * 2); dx = Math.cos(a); dy = Math.sin(a); r = 1; }
      const v = SCATTER * rnd(0.6, 1.4);
      d.vx += (dx / r) * v; d.vy += (dy / r) * v * 0.35;
      d.drift = Math.sign(dx || 1) * Math.abs(d.drift);
    }
  }
  const rnd = (a, b) => a + Math.random() * (b - a);

  function size() {
    const r = bar.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    const oldW = W || r.width;
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    dots.forEach((d) => { d.x *= W / oldW; d.y = Math.min(d.y, H - 4); });
  }

  function make(x, y) {
    return {
      x, y, vx: rnd(-0.3, 0.3), vy: rnd(-0.3, 0.3),
      line: Math.random() < 0.5 ? 0 : 1,
      phase: rnd(0, Math.PI * 2), spin: rnd(0.05, 0.1), rg: rnd(3, 7),
      drift: (Math.random() < 0.5 ? -1 : 1) * rnd(0.025, 0.055),
      tw: rnd(0, Math.PI * 2), tws: rnd(0.025, 0.05),
      heat: 0,
    };
  }

  function seed() {
    size();
    const n = W < 600 ? 36 : 75;
    // start on the link of the page we just arrived at (or that was clicked)
    let from = null;
    try { from = sessionStorage.getItem('dotsFrom'); sessionStorage.removeItem('dotsFrom'); } catch (e) {}
    const link = from && [...bar.querySelectorAll('.nav-links a')].find((a) => a.getAttribute('href') === from);
    const lr = link && link.offsetParent ? link.getBoundingClientRect() : null;
    const br = bar.getBoundingClientRect();
    dots = Array.from({ length: n }, () => lr
      ? make(lr.left - br.left + rnd(0, lr.width), lr.top - br.top + rnd(0, lr.height))
      : make(rnd(0, W), rnd(4, H - 4)));
    if (lr) setTimeout(() => burst(lr.left - br.left + lr.width / 2, lr.top - br.top + lr.height / 2), 350);
  }

  const lineY = (i) => (i === 0 ? H * 0.28 : H * 0.72);

  function step(k) {
    if (wasHot && !hot) burst(px, py);
    wasHot = hot;
    for (const d of dots) {
      d.phase += d.spin * k;
      d.tw += d.tws * k;
      const e0 = d.vx * d.vx + d.vy * d.vy;
      if (hot) {
        // swarm to the pointer and orbit it
        const ox = px + Math.cos(d.phase) * (d.rg * 2 + 12), oy = py + Math.sin(d.phase) * (d.rg + 6);
        d.vx += (ox - d.x) * 0.012 * k;
        d.vy += (oy - d.y) * 0.03 * k;
        d.vx *= Math.pow(0.86, k); d.vy *= Math.pow(0.86, k);
        d.heat = Math.min(1, d.heat + 0.06 * k);
        const lost = e0 - (d.vx * d.vx + d.vy * d.vy);
        if (lost > 0.03 && sparks.length < 40 && Math.random() < 0.12 * k) {
          const a = Math.atan2(d.vy, d.vx) + rnd(-0.5, 0.5), s = Math.min(3, lost * 25);
          sparks.push({ x: d.x, y: d.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 });
        }
      } else {
        // gyrate about a guide line, drift sideways, plus Brownian kicks
        const gy = lineY(d.line) + Math.sin(d.phase) * d.rg;
        d.vy += (gy - d.y) * 0.03 * k;
        d.vx += d.drift * k;
        d.vx += rnd(-0.1, 0.1) * k; d.vy += rnd(-0.1, 0.1) * k;
        d.vx *= Math.pow(0.97, k); d.vy *= Math.pow(0.95, k);
        d.heat = Math.max(0, d.heat - 0.02 * k);
      }
      d.x += d.vx * k; d.y += d.vy * k;
      if (d.x < 3) { d.x = 3; d.vx = Math.abs(d.vx); d.drift = Math.abs(d.drift); }
      if (d.x > W - 3) { d.x = W - 3; d.vx = -Math.abs(d.vx); d.drift = -Math.abs(d.drift); }
      if (d.y < 3 || d.y > H - 3) { d.y = Math.max(3, Math.min(H - 3, d.y)); d.vy *= -0.3; }
    }
    for (const s of sparks) { s.x += s.vx * k; s.y += s.vy * k; s.life -= 0.045 * k; }
    sparks = sparks.filter((s) => s.life > 0);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    for (const d of dots) {
      const a = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(d.tw));
      // white when idle, accent blue when hot
      const r = Math.round(255 - 108 * d.heat), g = Math.round(255 - 58 * d.heat), b = Math.round(255 - 2 * d.heat);
      ctx.fillStyle = `rgba(${r},${g},${b},${a * 0.22})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
      ctx.beginPath(); ctx.arc(d.x, d.y, 1.9, 0, Math.PI * 2); ctx.fill();
    }
    for (const s of sparks) {
      ctx.fillStyle = `rgba(147,197,253,${s.life})`;
      ctx.fillRect(s.x - 1, s.y - 1, 2, 2);
    }
  }

  function frame(t) {
    const k = last === null ? 1 : Math.min(2, (t - last) / (1000 / 60));
    last = t;
    step(k); draw();
    raf = requestAnimationFrame(frame);
  }
  function run() {
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null; last = null;
    if (!document.hidden && !still) raf = requestAnimationFrame(frame);
  }

  const where = (e) => { const r = bar.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top; };
  bar.addEventListener('pointermove', (e) => { where(e); hot = true; });
  bar.addEventListener('pointerdown', (e) => { where(e); hot = true; });
  bar.addEventListener('pointerleave', () => { hot = false; });
  bar.addEventListener('pointerup', (e) => { if (e.pointerType !== 'mouse') setTimeout(() => { hot = false; }, 900); });
  bar.querySelectorAll('.nav-links a').forEach((a) => a.addEventListener('click', () => {
    try { sessionStorage.setItem('dotsFrom', a.getAttribute('href')); } catch (e) {}
  }));

  seed();
  new ResizeObserver(size).observe(bar);
  document.addEventListener('visibilitychange', run);
  if (still) draw(); else run();
})();
