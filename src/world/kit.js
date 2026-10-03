// Reusable low-poly props. All functions draw in local space (x right, y up, z forward/front).
import * as THREE from 'three';
import { darken, lighten, mulberry } from './textures.js';

export const INK = '#14111c';

export function windowsGrid(b, w, h, faceZ, { cols, rows, y0 = 0.9, gap = 1.1, lit = 0.6, seed = 1, ww = 0.55, wh = 0.7, frame = '#f5efe0' }) {
  const rnd = mulberry(seed);
  const c = cols ?? Math.max(1, Math.floor(w / 1.2));
  const r = rows ?? Math.max(1, Math.floor((h - 0.6) / gap));
  const sx = w / c;
  for (let j = 0; j < r; j++) {
    for (let i = 0; i < c; i++) {
      const x = -w / 2 + sx * (i + 0.5);
      const y = y0 + j * gap;
      if (y + wh > h - 0.2) continue;
      b.box(ww + 0.1, wh + 0.1, 0.04, x, y - 0.05, faceZ + 0.01, frame, { outline: false });
      b.box(ww, wh, 0.04, x, y, faceZ + 0.03, rnd() < lit ? '#ffd98a' : '#5d7c99', { glow: true });
    }
  }
}

// Generic building. Front faces +z.
export function building(b, { w = 4, h = 5, d = 4, color = '#e9d8a6', roof = 'flat', roofColor = '#3d405b', trim = '#f8f4ea', windows = true, seed = 1, door = true, lit = 0.6, back = true }) {
  b.box(w, h + 1, d, 0, -1, 0, color);
  b.box(w + 0.2, 0.18, d + 0.2, 0, h - 0.18, 0, trim, { outline: false });
  if (roof === 'flat') {
    b.box(w + 0.1, 0.35, d + 0.1, 0, h, 0, roofColor);
    b.box(w * 0.3, 0.6, d * 0.3, w * 0.2, h + 0.35, -d * 0.1, '#adb5bd');
  } else if (roof === 'gable') {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 - 0.35, 0); shape.lineTo(0, Math.min(w, 4) * 0.42); shape.lineTo(w / 2 + 0.35, 0); shape.lineTo(-w / 2 - 0.35, 0);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d + 0.5, bevelEnabled: false });
    g.translate(0, 0, -(d + 0.5) / 2);
    b.add(g, roofColor, { y: h });
  } else if (roof === 'hip') {
    const g = new THREE.CylinderGeometry(0.01, Math.max(w, d) * 0.78, Math.min(w, d) * 0.45, 4);
    g.rotateY(Math.PI / 4);
    b.add(g, roofColor, { y: h + Math.min(w, d) * 0.225, sx: w / Math.max(w, d), sz: d / Math.max(w, d) });
  }
  if (windows) {
    windowsGrid(b, w - 0.4, h, d / 2, { seed, lit, y0: door ? 1.6 : 0.9 });
    if (back) {
      b.push(new THREE.Matrix4().makeRotationY(Math.PI));
      windowsGrid(b, w - 0.4, h, d / 2, { seed: seed + 7, lit });
      b.pop();
    }
    b.push(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    windowsGrid(b, d - 0.6, h, w / 2, { seed: seed + 3, lit, y0: 1.6 });
    b.pop();
    b.push(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
    windowsGrid(b, d - 0.6, h, w / 2, { seed: seed + 5, lit, y0: 1.6 });
    b.pop();
  }
  if (door) {
    b.box(0.9, 1.4, 0.06, 0, 0, d / 2 + 0.01, '#5c3d2e');
    b.box(0.7, 1.0, 0.04, 0, 0.2, d / 2 + 0.05, '#ffd98a', { glow: true });
  }
}

export function tree(b, x, z, { s = 1, kind = 'round', color = '#4f9d4a', seed = 1 } = {}) {
  const rnd = mulberry(seed);
  b.cyl(0.12 * s, 0.18 * s, 1.3 * s, x, -0.3, z, '#7a4e2d', 6);
  if (kind === 'round') {
    const c2 = lighten(color, 0.18), c3 = darken(color, 0.15);
    b.ico(0.95 * s, x, 1.8 * s, z, color, 1);
    b.ico(0.65 * s, x + 0.55 * s, 1.55 * s, z + 0.2 * s, c2, 1);
    b.ico(0.6 * s, x - 0.5 * s, 1.6 * s, z - 0.25 * s, c3, 1);
    b.ico(0.55 * s, x + rnd() * 0.3, 2.45 * s, z, c2, 1);
  } else if (kind === 'pine') {
    b.cone(0.95 * s, 1.5 * s, x, 0.9 * s, z, darken(color, 0.2), 7);
    b.cone(0.75 * s, 1.3 * s, x, 1.6 * s, z, color, 7);
    b.cone(0.5 * s, 1.0 * s, x, 2.3 * s, z, lighten(color, 0.1), 7);
  } else if (kind === 'sakura') {
    const pinks = ['#ffb3c6', '#ff8fab', '#ffc8dd', '#fb6f92'];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + rnd();
      b.ico((0.5 + rnd() * 0.35) * s, x + Math.cos(a) * 0.65 * s, (1.7 + rnd() * 0.6) * s, z + Math.sin(a) * 0.65 * s, pinks[i % 4], 1);
    }
    b.ico(0.7 * s, x, 2.3 * s, z, '#ffc8dd', 1);
  } else if (kind === 'palm') {
    const pts = [];
    for (let i = 0; i <= 5; i++) pts.push(new THREE.Vector3(x + Math.sin(i * 0.3) * 0.4 * s, -0.2 + i * 0.75 * s, z));
    b.tube(pts, 0.14 * s, '#a47148');
    const top = pts[5];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const leaf = new THREE.ConeGeometry(0.22 * s, 1.9 * s, 4);
      leaf.translate(0, 0.95 * s, 0);
      b.add(leaf, i % 2 ? '#2d6a4f' : '#40916c', { x: top.x, y: top.y, z: top.z, ry: a, rz: 1.9, sz: 0.25 });
    }
  }
}

export function bush(b, x, z, s = 1, color = '#3f8a43') {
  b.ico(0.5 * s, x, 0.25 * s, z, color, 0);
  b.ico(0.38 * s, x + 0.35 * s, 0.2 * s, z + 0.1, lighten(color, 0.15), 0);
}

export function lamp(b, x, z, h = 3.2, color = '#2b2d42') {
  b.cyl(0.06, 0.09, h, x, -0.2, z, color, 6);
  b.box(0.7, 0.06, 0.06, x + 0.3, h - 0.25, z, color, { outline: false });
  b.box(0.3, 0.14, 0.24, x + 0.6, h - 0.38, z, color);
  b.box(0.24, 0.06, 0.18, x + 0.6, h - 0.44, z, '#fff1c1', { glow: true });
}

export function roundLamp(b, x, z, h = 2.8) {
  b.cyl(0.05, 0.08, h, x, -0.2, z, '#1d1b2a', 6);
  b.sphere(0.24, x, h + 0.05, z, '#fff3cf', { glow: true });
}

export function bench(b, x, z, ry = 0, color = '#b5651d') {
  b.at(x, 0, z, ry);
  b.box(1.6, 0.08, 0.5, 0, 0.45, 0, color);
  b.box(1.6, 0.4, 0.07, 0, 0.55, -0.24, color);
  [-0.65, 0.65].forEach((sx) => b.box(0.08, 0.45, 0.45, sx, 0, 0, '#2b2d42', { outline: false }));
  b.pop();
}

export function vending(b, x, z, ry = 0, color = '#e63946') {
  b.at(x, 0, z, ry);
  b.box(1.0, 1.9, 0.75, 0, 0, 0, color);
  b.box(0.82, 1.0, 0.05, 0, 0.75, 0.38, '#e8f7ff', { glow: true });
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) b.box(0.13, 0.22, 0.05, -0.28 + c * 0.19, 0.85 + r * 0.3, 0.4, ['#ff5d8f', '#4cc9f0', '#ffd60a', '#06d6a0'][(r + c) % 4], { glow: true });
  b.box(0.5, 0.16, 0.05, 0, 0.25, 0.39, '#14111c', { outline: false });
  b.pop();
}

export function torii(b, x, z, ry = 0, s = 1) {
  const red = '#d62828';
  b.at(x, 0, z, ry, s);
  [-1.25, 1.25].forEach((px) => { b.cyl(0.16, 0.19, 3.4, px, -0.4, 0, red, 10); b.cyl(0.24, 0.24, 0.3, px, -0.4, 0, INK, 10); });
  b.box(3.4, 0.22, 0.32, 0, 2.45, 0, red);
  const top = new THREE.BoxGeometry(4.1, 0.26, 0.44);
  const pos = top.attributes.position;
  for (let i = 0; i < pos.count; i++) { const xx = pos.getX(i); pos.setY(i, pos.getY(i) + xx * xx * 0.025); }
  top.computeVertexNormals();
  b.add(top, INK, { y: 3.05 });
  b.box(4.0, 0.16, 0.36, 0, 2.82, 0, red);
  b.box(0.18, 0.55, 0.12, 0, 2.5, 0.18, INK, { outline: false });
  b.pop();
}

export function stoneLantern(b, x, z, glow = true) {
  b.at(x, 0, z);
  b.cyl(0.32, 0.38, 0.2, 0, 0, 0, '#9a9a9a', 6);
  b.cyl(0.1, 0.14, 0.7, 0, 0.2, 0, '#a8a8a8', 6);
  b.box(0.5, 0.42, 0.5, 0, 0.9, 0, '#b0b0b0');
  if (glow) b.box(0.3, 0.24, 0.52, 0, 0.99, 0, '#ffcf70', { glow: true });
  b.cone(0.5, 0.35, 0, 1.32, 0, '#8d8d8d', 4, { ry: Math.PI / 4 });
  b.sphere(0.08, 0, 1.72, 0, '#8d8d8d', { outline: false });
  b.pop();
}

export function chochin(b, x, y, z, color = '#e63946') {
  b.add(new THREE.SphereGeometry(0.22, 10, 8), color, { x, y, z, sy: 1.25, glow: true });
  b.cyl(0.13, 0.13, 0.06, x, y + 0.24, z, INK, 8, { outline: false });
  b.cyl(0.13, 0.13, 0.06, x, y - 0.31, z, INK, 8, { outline: false });
}

export function umbrella(b, x, z, c1 = '#e63946', c2 = '#ffffff', tilt = 0.15) {
  b.at(x, 0, z, 0, 1, tilt, 0);
  b.cyl(0.04, 0.04, 2.3, 0, -0.2, 0, '#f8f4ea', 6, { outline: false });
  for (let i = 0; i < 8; i++) {
    const g = new THREE.ConeGeometry(1.3, 0.5, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4);
    b.add(g, i % 2 ? c1 : c2, { y: 2.3, outline: i === 0 });
  }
  b.pop();
}

export function pole(b, x, z, h = 5.5) {
  b.cyl(0.1, 0.13, h, x, -0.3, z, '#8d8170', 6);
  b.box(1.2, 0.08, 0.08, x, h - 0.6, z, '#5c544a', { outline: false });
  b.box(0.8, 0.08, 0.08, x, h - 1.0, z, '#5c544a', { outline: false });
  b.cyl(0.12, 0.12, 0.35, x + 0.3, h - 1.5, z, '#6c757d', 8, { outline: false });
}

export function fence(b, x, z, len, ry = 0, color = '#f8f4ea') {
  b.at(x, 0, z, ry);
  const n = Math.max(2, Math.round(len / 0.5));
  for (let i = 0; i <= n; i++) b.box(0.07, 0.7, 0.07, -len / 2 + (len / n) * i, -0.1, 0, color, { outline: false });
  b.box(len, 0.08, 0.05, 0, 0.45, 0, color, { outline: false });
  b.box(len, 0.08, 0.05, 0, 0.2, 0, color, { outline: false });
  b.pop();
}

export function awning(b, w, y, z, c1, c2 = '#ffffff') {
  const n = Math.max(3, Math.round(w / 0.4));
  for (let i = 0; i < n; i++) b.box(w / n, 0.06, 0.9, -w / 2 + (w / n) * (i + 0.5), y, z + 0.4, i % 2 ? c1 : c2, { rx: 0.35, outline: false });
  b.box(w, 0.2, 0.06, 0, y - 0.25, z + 0.84, c1, { outline: false });
}

export function shop(b, { w = 2.6, h = 3.2, d = 3, color = '#f1e3d3', awn = '#e63946', seed = 1, roofColor = '#577590' }) {
  b.box(w, h + 1, d, 0, -1, 0, color);
  b.box(w + 0.15, 0.3, d + 0.15, 0, h, 0, roofColor);
  b.box(w - 0.4, 1.5, 0.05, 0, 0.1, d / 2 + 0.01, '#ffe7a8', { glow: true });
  b.box(w - 0.3, 0.1, 0.1, 0, 1.6, d / 2 + 0.02, INK, { outline: false });
  awning(b, w - 0.1, 2.0, d / 2, awn);
  windowsGrid(b, w - 0.6, h, d / 2, { cols: 2, rows: 1, y0: 2.4, seed, lit: 0.8, wh: 0.5 });
}

export function flowerBuckets(b, x, z) {
  const cols = ['#ff8fab', '#ffd60a', '#f77f00', '#c77dff', '#ffffff', '#e63946'];
  for (let i = 0; i < 6; i++) {
    const px = x + (i % 3) * 0.42 - 0.42, pz = z + Math.floor(i / 3) * 0.45;
    b.cyl(0.16, 0.13, 0.32, px, 0, pz, '#5c677d', 8, { outline: false });
    for (let k = 0; k < 4; k++) b.sphere(0.08, px + Math.cos(k * 1.7) * 0.08, 0.5 + (k % 2) * 0.08, pz + Math.sin(k * 1.7) * 0.08, cols[(i + k) % 6], { outline: false });
  }
}

export function planter(b, x, z, s = 1) {
  b.box(1.2 * s, 0.5, 1.2 * s, x, 0, z, '#d6ccc2');
  b.ico(0.55 * s, x, 0.8, z, '#52b788', 1);
}

export function bike(b, x, z, ry = 0, color = '#219ebc') {
  b.at(x, 0, z, ry);
  [-0.45, 0.45].forEach((zz) => b.add(new THREE.TorusGeometry(0.3, 0.04, 6, 14), INK, { y: 0.32, z: zz, ry: Math.PI / 2, outline: false }));
  b.box(0.05, 0.05, 0.9, 0, 0.55, 0, color, { outline: false });
  b.box(0.05, 0.4, 0.05, 0, 0.4, -0.15, color, { outline: false });
  b.box(0.18, 0.05, 0.25, 0, 0.75, -0.2, INK, { outline: false });
  b.box(0.45, 0.04, 0.04, 0, 0.85, 0.4, INK, { outline: false });
  b.pop();
}

export function rock(b, x, z, s = 1, color = '#8d99ae') {
  b.add(new THREE.DodecahedronGeometry(0.6 * s, 0), color, { x, y: 0.15 * s, z, sy: 0.6, ry: x * 3 });
}
