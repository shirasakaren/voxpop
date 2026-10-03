// Tiny confetti engine: paper strips, stars and halftone dots.
const COLORS = ['#e63946', '#ffd60a', '#4cc9f0', '#06d6a0', '#ff8fab', '#fbf6ea', '#14111c'];

export class Confetti {
  constructor(canvas) {
    this.c = canvas;
    this.x = canvas.getContext('2d');
    this.p = [];
    this.running = false;
    const resize = () => { const d = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * d; canvas.height = innerHeight * d; this.x.setTransform(d, 0, 0, d, 0, 0); };
    resize();
    addEventListener('resize', resize);
  }
  burst(x, y, n = 80, spread = 1) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) n = Math.min(n, 12);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = (4 + Math.random() * 9) * spread;
      this.p.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 6, r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.4,
        w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, col: COLORS[i % COLORS.length], life: 1, kind: Math.random() < 0.15 ? 'star' : Math.random() < 0.3 ? 'dot' : 'rect',
      });
    }
    if (!this.running) { this.running = true; this.loop(); }
  }
  rain(n = 120) { for (let i = 0; i < n; i++) setTimeout(() => this.burst(Math.random() * innerWidth, -20, 1, 0.4), i * 20); }
  loop() {
    const x = this.x;
    x.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of this.p) {
      p.vy += 0.32; p.vx *= 0.985; p.vy *= 0.985;
      p.x += p.vx; p.y += p.vy; p.r += p.vr; p.life -= 0.006;
      x.save();
      x.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      x.translate(p.x, p.y); x.rotate(p.r);
      x.fillStyle = p.col;
      if (p.kind === 'star') {
        x.beginPath();
        for (let i = 0; i < 10; i++) { const rr = i % 2 ? 3 : 8; const a = (i / 10) * Math.PI * 2; x.lineTo(Math.sin(a) * rr, Math.cos(a) * rr); }
        x.fill();
      } else if (p.kind === 'dot') { x.beginPath(); x.arc(0, 0, p.h * 0.6, 0, Math.PI * 2); x.fill(); }
      else { x.scale(1, Math.cos(p.r * 3)); x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      x.restore();
    }
    this.p = this.p.filter((p) => p.life > 0 && p.y < innerHeight + 40);
    if (this.p.length) requestAnimationFrame(() => this.loop());
    else { this.running = false; x.clearRect(0, 0, innerWidth, innerHeight); }
  }
}
