import * as THREE from 'three';

export const FONT_DISPLAY = '"Dela Gothic One", "Zen Kaku Gothic New", sans-serif';
export const FONT_COND = '"Anton", "Dela Gothic One", sans-serif';

export async function loadFonts() {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load(`64px "Dela Gothic One"`, 'あ星A'),
      document.fonts.load(`64px "Anton"`, 'A'),
      document.fonts.load(`64px "Zen Kaku Gothic New"`, 'あ星'),
      document.fonts.load(`64px "Space Grotesk"`, 'A'),
    ]);
  } catch (e) { /* fonts are a nicety */ }
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Shop signs, banners, neon
export function signTexture(text, { bg = '#e63946', fg = '#fff', w = 512, h = 160, font = FONT_DISPLAY, vertical = false, border = '#14111c', neon = false, sub = '' } = {}) {
  const [c, x] = canvas(w, h);
  if (neon) {
    x.fillStyle = '#0b0a12';
    x.fillRect(0, 0, w, h);
  } else {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
    x.lineWidth = Math.max(6, h * 0.05);
    x.strokeStyle = border;
    x.strokeRect(x.lineWidth / 2, x.lineWidth / 2, w - x.lineWidth, h - x.lineWidth);
  }
  x.fillStyle = fg;
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  if (neon) { x.shadowColor = fg; x.shadowBlur = h * 0.18; }
  if (vertical) {
    const chars = [...text];
    const size = Math.min(w * 0.7, (h * 0.86) / chars.length);
    x.font = `${size}px ${font}`;
    chars.forEach((ch, i) => x.fillText(ch, w / 2, h * 0.07 + size * (i + 0.55)));
  } else {
    let size = h * (sub ? 0.5 : 0.62);
    x.font = `${size}px ${font}`;
    while (x.measureText(text).width > w * 0.88 && size > 8) { size -= 2; x.font = `${size}px ${font}`; }
    x.fillText(text, w / 2, sub ? h * 0.4 : h * 0.54);
    if (sub) {
      x.font = `${h * 0.2}px ${FONT_COND}`;
      x.fillText(sub, w / 2, h * 0.78);
    }
    if (neon) x.fillText(text, w / 2, sub ? h * 0.4 : h * 0.54);
  }
  return tex(c);
}

// Building facade with windows, used on big signs/billboards
export function posterTexture(title, sub, { bg = '#ffd60a', fg = '#14111c', accent = '#e63946' } = {}) {
  const [c, x] = canvas(512, 720);
  x.fillStyle = bg; x.fillRect(0, 0, 512, 720);
  // halftone
  x.fillStyle = accent;
  for (let yy = 0; yy < 720; yy += 18) for (let xx = 0; xx < 512; xx += 18) {
    const r = Math.max(0, 7 * (1 - yy / 720) - 1);
    x.beginPath(); x.arc(xx + ((yy / 18) % 2) * 9, yy, r, 0, Math.PI * 2); x.fill();
  }
  x.save();
  x.translate(256, 380); x.rotate(-0.12);
  x.fillStyle = fg; x.fillRect(-240, -90, 480, 180);
  x.fillStyle = bg; x.font = `110px ${FONT_COND}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(title, 0, 6);
  x.restore();
  x.fillStyle = fg; x.font = `40px ${FONT_DISPLAY}`; x.textAlign = 'center';
  x.fillText(sub, 256, 620);
  return tex(x.canvas);
}

// Anime face painted onto the front of a sphere's UV map.
// Face center sits at u = 0.25 (sphere +Z) and v ~ 0.47.
const faceCache = new Map();
export function faceTexture(look, expr = 'neutral') {
  const key = JSON.stringify([look.eye, look.skin, look.elder, look.tired, look.grey, expr, look.id]);
  if (faceCache.has(key)) return faceCache.get(key);
  const W = 1024, H = 512;
  const [c, x] = canvas(W, H);
  x.fillStyle = look.skin; x.fillRect(0, 0, W, H);
  const cx = W * 0.25, cy = H * 0.545;
  const px = W / 360; // pixels per degree
  const ink = '#1c1420';
  const eyeDX = 18.5 * px, eyeW = 12.5 * px, eyeH = (look.elder ? 9 : 17.5) * px;

  // blush
  x.fillStyle = 'rgba(255,120,140,0.35)';
  [-1, 1].forEach((s) => { x.beginPath(); x.ellipse(cx + s * 24 * px, cy + 14 * px, 8 * px, 4 * px, 0, 0, Math.PI * 2); x.fill(); });

  const drawEye = (s) => {
    const ex = cx + s * eyeDX, ey = cy;
    x.save();
    if (expr === 'blink' || expr === 'happy') {
      x.strokeStyle = ink; x.lineWidth = 3.2 * px; x.lineCap = 'round';
      x.beginPath();
      if (expr === 'happy') x.arc(ex, ey + 3 * px, eyeW * 0.9, Math.PI * 1.1, Math.PI * 1.9);
      else { x.moveTo(ex - eyeW, ey + 2 * px); x.quadraticCurveTo(ex, ey + 6 * px, ex + eyeW, ey + 2 * px); }
      x.stroke();
      x.restore();
      return;
    }
    const h = expr === 'surprised' ? eyeH * 1.1 : eyeH;
    // sclera
    x.fillStyle = '#fffaf6';
    x.beginPath(); x.ellipse(ex, ey, eyeW, h, 0, 0, Math.PI * 2); x.fill();
    // iris with gradient
    const g = x.createLinearGradient(ex, ey - h, ex, ey + h);
    g.addColorStop(0, ink); g.addColorStop(0.35, look.eye); g.addColorStop(1, lighten(look.eye, 0.55));
    x.fillStyle = g;
    const ir = expr === 'surprised' ? eyeW * 0.6 : eyeW * 0.82;
    x.beginPath(); x.ellipse(ex + s * 0.6 * px, ey + 1.5 * px, ir, h * 0.92, 0, 0, Math.PI * 2); x.fill();
    // pupil
    x.fillStyle = ink;
    x.beginPath(); x.ellipse(ex + s * 0.6 * px, ey + 2 * px, ir * 0.42, h * 0.45, 0, 0, Math.PI * 2); x.fill();
    // highlights
    x.fillStyle = '#ffffff';
    x.beginPath(); x.ellipse(ex - s * 2.5 * px + 1.5 * px, ey - h * 0.42, ir * 0.38, ir * 0.48, -0.4, 0, Math.PI * 2); x.fill();
    x.beginPath(); x.arc(ex + 3 * px, ey + h * 0.45, ir * 0.16, 0, Math.PI * 2); x.fill();
    // upper lash line, thick and swept
    x.strokeStyle = ink; x.lineCap = 'round'; x.lineWidth = 3.6 * px;
    x.beginPath();
    x.moveTo(ex - eyeW * 1.15, ey - h * 0.45);
    x.quadraticCurveTo(ex, ey - h * 1.35, ex + eyeW * 1.15, ey - h * 0.55);
    x.stroke();
    // flick
    x.lineWidth = 2.4 * px;
    x.beginPath();
    const fx = ex + s * eyeW * 1.1;
    x.moveTo(fx, ey - h * 0.5); x.lineTo(fx + s * 4 * px, ey - h * 0.85);
    x.stroke();
    if (look.tired) {
      x.lineWidth = 1.2 * px; x.strokeStyle = 'rgba(80,60,90,0.6)';
      x.beginPath(); x.arc(ex, ey + h * 0.9, eyeW * 0.8, 0.2, Math.PI - 0.2); x.stroke();
    }
    x.restore();
  };
  drawEye(-1); drawEye(1);

  // brows
  x.strokeStyle = look.grey ? '#8a8a8a' : darken(look.hairColor || '#333', 0.2);
  x.lineWidth = 2.4 * px; x.lineCap = 'round';
  [-1, 1].forEach((s) => {
    x.beginPath();
    const by = cy - eyeH - (expr === 'surprised' ? 10 : 6) * px;
    x.moveTo(cx + s * (eyeDX - 8 * px), by + 1.5 * px);
    x.quadraticCurveTo(cx + s * eyeDX, by - 2 * px, cx + s * (eyeDX + 9 * px), by + (look.tired ? 3 : 1) * px);
    x.stroke();
  });

  // nose
  x.strokeStyle = darken(look.skin, 0.25); x.lineWidth = 1.6 * px;
  x.beginPath(); x.moveTo(cx + 1 * px, cy + 10 * px); x.lineTo(cx - 0.5 * px, cy + 13 * px); x.stroke();

  // mouth
  x.strokeStyle = ink; x.fillStyle = '#7a2633'; x.lineWidth = 2 * px;
  const my = cy + 21 * px;
  x.beginPath();
  if (expr === 'talk' || expr === 'surprised') {
    x.ellipse(cx, my, 3.5 * px, (expr === 'surprised' ? 4.5 : 3) * px, 0, 0, Math.PI * 2); x.fill(); x.stroke();
  } else if (expr === 'happy') {
    x.moveTo(cx - 6 * px, my - 1 * px); x.quadraticCurveTo(cx, my + 7 * px, cx + 6 * px, my - 1 * px); x.closePath(); x.fill(); x.stroke();
  } else {
    x.moveTo(cx - 4 * px, my); x.quadraticCurveTo(cx, my + 2.5 * px, cx + 4 * px, my); x.stroke();
  }
  if (look.beard) {
    x.fillStyle = 'rgba(200,200,200,0.9)';
    x.beginPath(); x.ellipse(cx, my + 9 * px, 18 * px, 12 * px, 0, 0, Math.PI); x.fill();
  }
  if (look.elder) {
    x.strokeStyle = darken(look.skin, 0.2); x.lineWidth = 1 * px;
    [-1, 1].forEach((s) => { x.beginPath(); x.arc(cx + s * (eyeDX + 14 * px), cy, 4 * px, -0.6, 0.6); x.stroke(); });
  }
  const t = tex(c);
  faceCache.set(key, t);
  return t;
}

export function lighten(hex, amt) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#ffffff'), amt);
  return '#' + c.getHexString();
}
export function darken(hex, amt) {
  const c = new THREE.Color(hex);
  c.lerp(new THREE.Color('#000000'), amt);
  return '#' + c.getHexString();
}

// Soft anime cloud for billboards
export function cloudTexture(seed = 1) {
  const [c, x] = canvas(512, 256);
  const rnd = mulberry(seed);
  const puffs = [];
  for (let i = 0; i < 9; i++) puffs.push([80 + rnd() * 350, 120 + rnd() * 50 - (i % 3) * 20, 40 + rnd() * 55]);
  // shadow layer
  x.fillStyle = '#c9d4f0';
  puffs.forEach(([px, py, r]) => { x.beginPath(); x.arc(px, py + 14, r, 0, Math.PI * 2); x.fill(); });
  x.fillStyle = '#ffffff';
  puffs.forEach(([px, py, r]) => { x.beginPath(); x.arc(px, py, r * 0.94, 0, Math.PI * 2); x.fill(); });
  // flat bottom
  x.globalCompositeOperation = 'destination-out';
  x.fillRect(0, 196, 512, 60);
  const t = tex(c);
  return t;
}

export function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Round soft dot for particles
let _dot;
export function dotTexture() {
  if (_dot) return _dot;
  const [c, x] = canvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  _dot = tex(c);
  return _dot;
}

let _petal;
export function petalTexture() {
  if (_petal) return _petal;
  const [c, x] = canvas(64, 64);
  x.fillStyle = '#ffc2d4';
  x.beginPath(); x.ellipse(32, 32, 14, 24, 0.6, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#ff8fab';
  x.beginPath(); x.ellipse(28, 38, 5, 10, 0.6, 0, Math.PI * 2); x.fill();
  _petal = tex(c);
  return _petal;
}

let _shadow;
export function blobShadowTexture() {
  if (_shadow) return _shadow;
  const [c, x] = canvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(20,10,30,0.55)');
  g.addColorStop(0.6, 'rgba(20,10,30,0.3)');
  g.addColorStop(1, 'rgba(20,10,30,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  _shadow = new THREE.CanvasTexture(c);
  return _shadow;
}

// Speech marker sprite ("!" bubble) for quest targets
export function markerTexture(symbol = '!', bg = '#e63946') {
  const [c, x] = canvas(128, 160);
  x.translate(64, 70);
  x.rotate(-0.08);
  x.fillStyle = '#14111c';
  x.beginPath(); x.moveTo(-50, -52); x.lineTo(56, -60); x.lineTo(50, 46); x.lineTo(10, 46); x.lineTo(-6, 76); x.lineTo(-10, 46); x.lineTo(-54, 50); x.closePath(); x.fill();
  x.fillStyle = bg;
  x.beginPath(); x.moveTo(-42, -44); x.lineTo(48, -50); x.lineTo(42, 38); x.lineTo(4, 38); x.lineTo(-6, 58); x.lineTo(-8, 38); x.lineTo(-46, 42); x.closePath(); x.fill();
  x.fillStyle = '#fff'; x.font = `72px ${FONT_COND}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(symbol, 0, 0);
  return tex(c);
}

// Paper note collectible texture
export function noteTexture() {
  const [c, x] = canvas(128, 160);
  x.fillStyle = '#fbf6ea'; x.fillRect(8, 8, 112, 144);
  x.strokeStyle = '#14111c'; x.lineWidth = 6; x.strokeRect(8, 8, 112, 144);
  x.fillStyle = '#e63946'; x.fillRect(8, 8, 112, 30);
  x.fillStyle = '#fff'; x.font = `22px ${FONT_COND}`; x.textAlign = 'center'; x.fillText('SCOOP', 64, 31);
  x.fillStyle = '#14111c';
  for (let i = 0; i < 6; i++) x.fillRect(22, 54 + i * 15, 84 - (i % 3) * 14, 5);
  return tex(c);
}
