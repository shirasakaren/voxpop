import * as THREE from 'three';
import { R, DEG, dirFromLatLon, eastAt, heightAt, surfacePoint, basisMatrix, groundAt, PIER, SEA_LEVEL, PIER_DECK, latLonFromDir, angleBetween } from './sphere.js';
import { Builder } from './builder.js';
import * as K from './kit.js';
import { signTexture, posterTexture, mulberry, FONT_COND, FONT_DISPLAY } from './textures.js';
import { ROADS, PLAZAS, ROAD_HALF } from './planet.js';

const Y = new THREE.Vector3(0, 1, 0);

// Road distance in world units (JS mirror of the shader)
const ROAD_SEGS = ROADS.map(([a, b]) => {
  const A = dirFromLatLon(a[0], a[1]), B = dirFromLatLon(b[0], b[1]);
  return { A, B, N: new THREE.Vector3().crossVectors(A, B).normalize() };
});
const _pp = new THREE.Vector3(), _c1 = new THREE.Vector3();
export function roadDist(p) {
  let best = 1e9;
  for (const s of ROAD_SEGS) {
    const d = Math.abs(p.dot(s.N)) * R;
    if (d < best) {
      _pp.copy(p).addScaledVector(s.N, -p.dot(s.N)).normalize();
      if (_c1.crossVectors(s.A, _pp).dot(s.N) > -0.002 && _c1.crossVectors(_pp, s.B).dot(s.N) > -0.002) best = d;
    }
  }
  return best;
}
const PLAZA_DIRS = PLAZAS.map((p) => ({ d: dirFromLatLon(p.lat, p.lon), r: p.r * DEG * R }));
export function plazaDist(p) {
  let best = 1e9;
  for (const pl of PLAZA_DIRS) best = Math.min(best, angleBetween(p, pl.d) * R - pl.r);
  return best;
}

// A district-local frame. dx = east, dz = north (gnomonic, so roads stay straight).
export class Site {
  constructor(world, lat, lon) {
    this.w = world;
    this.c = dirFromLatLon(lat, lon);
    this.e = eastAt(this.c, new THREE.Vector3());
    this.n = new THREE.Vector3().crossVectors(this.c, this.e).normalize();
    this.b = new Builder();
  }
  dir(dx, dz) {
    return this.c.clone().multiplyScalar(R).addScaledVector(this.e, dx).addScaledVector(this.n, dz).normalize();
  }
  fwd(d, heading) {
    const h = heading * DEG;
    const f = this.n.clone().multiplyScalar(Math.cos(h)).addScaledVector(this.e, Math.sin(h));
    f.addScaledVector(d, -f.dot(d)).normalize();
    return f;
  }
  frame(dx, dz, heading = 0, lift = 0, fixedH = null) {
    const d = this.dir(dx, dz);
    const f = this.fwd(d, heading);
    const pos = fixedH === null ? surfacePoint(d, lift) : d.clone().multiplyScalar(R + fixedH + lift);
    return { d, f, m: basisMatrix(d, f, pos) };
  }
  put(dx, dz, heading, fn, { lift = 0, collide = null, fixedH = null } = {}) {
    const fr = this.frame(dx, dz, heading, lift, fixedH);
    this.b.push(fr.m);
    fn(this.b, fr);
    this.b.pop();
    if (collide) this.w.addBox(fr.d, fr.f, collide[0], collide[1], collide[2] ?? 0, collide[3] ?? 0, collide[4] ?? 5);
    return fr;
  }
  sign(fr, tex, { x = 0, y = 2, z = 0, ry = 0, w = 2, h = 0.6, glow = true, double = false } = {}) {
    return this.w.addSign(fr.m, tex, { x, y, z, ry, w, h, glow, double });
  }
  facing(dx, dz) { return Math.atan2(-dx, -dz) / DEG; }
  finish(name) { this.w.addChunk(this.b.build(name)); }
}

// ---------- HERALD PLAZA ----------
function herald(W) {
  const S = new Site(W, 90, 0);
  // HQ
  const hq = S.put(0, 13.5, 180, (b) => {
    K.building(b, { w: 10, h: 7, d: 5.5, color: '#b23a48', roofColor: '#2b2d42', trim: '#f8f4ea', seed: 11, door: false, lit: 0.75 });
    // columns + entrance
    for (let i = -2; i <= 2; i++) if (i !== 0) b.box(0.4, 3, 0.4, i * 1.6, 0, 2.95, '#f8f4ea');
    b.box(10.4, 0.5, 1.2, 0, 3, 3.0, '#f8f4ea');
    b.box(2.2, 2.6, 0.1, 0, 0, 2.8, '#ffd98a', { glow: true });
    b.box(2.6, 0.25, 1.5, 0, -0.1, 3.4, '#d6ccc2');
    b.box(3.2, 0.25, 1.9, 0, -0.35, 3.6, '#c9bfb5');
    // rooftop billboard frame
    b.box(0.2, 2.4, 0.2, -3.5, 7.3, -1, '#2b2d42');
    b.box(0.2, 2.4, 0.2, 3.5, 7.3, -1, '#2b2d42');
    b.box(8.4, 2.2, 0.3, 0, 8.6, -1.1, '#14111c');
    // antenna
    b.cyl(0.05, 0.08, 3, -4, 7.3, -2, '#adb5bd', 6);
    b.sphere(0.14, -4, 10.4, -2, '#e63946', { glow: true });
    // flags
    [-4.6, 4.6].forEach((x) => { b.cyl(0.05, 0.05, 4.5, x, 0, 4.4, '#d6ccc2', 6); });
  }, { collide: [5.3, 3.2, 0, 0.5, 11] });
  S.sign(hq, signTexture('HOSHIMACHI HERALD', { bg: '#14111c', fg: '#ffffff', w: 1024, h: 240, font: FONT_COND, neon: false, border: '#e63946', sub: '星町新聞 · EST. 1965' }), { y: 9.7, z: -0.9, w: 8, h: 1.9 });
  S.sign(hq, signTexture('PRESS', { bg: '#e63946', fg: '#fff', w: 512, h: 128, font: FONT_COND }), { y: 3.25, z: 3.62, w: 2.6, h: 0.65 });
  W.flags.push({ m: hq.m, x: -4.6, z: 4.4, h: 4.5, color: '#e63946' }, { m: hq.m, x: 4.6, z: 4.4, h: 4.5, color: '#ffd60a' });
  W.landmarks.herald = hq.d;

  // fountain with a star
  S.put(0, 0, 0, (b) => {
    b.cyl(2.0, 2.1, 0.55, 0, -0.1, 0, '#e9e3d5', 20);
    b.cyl(1.75, 1.75, 0.1, 0, 0.4, 0, '#4fc3dc', 20, { glow: true, outline: false });
    b.cyl(0.35, 0.45, 1.6, 0, 0.4, 0, '#e9e3d5', 10);
    b.cyl(0.9, 0.7, 0.22, 0, 1.6, 0, '#e9e3d5', 14);
  }, { collide: [2.2, 2.2] });
  W.fountains.push(S.frame(0, 0, 0).m);
  W.spinners.push({ m: S.frame(0, 0, 0).m, y: 2.55, kind: 'star' });

  // ring of benches and lamps
  [0, 120, -120].forEach((a) => {
    [-28, 28].forEach((off) => {
      const ang = (a + off) * DEG;
      const fr = S.put(Math.sin(ang) * 5.4, Math.cos(ang) * 5.4, a + off + 180, (b) => K.bench(b, 0, 0, 0, '#c1121f'), { collide: [0.9, 0.35] });
      W.addInteract('bench', fr.d, 1.3, { f: fr.f });
    });
    [-40, 40].forEach((off) => {
      const ang = (a + off) * DEG;
      S.put(Math.sin(ang) * 7.3, Math.cos(ang) * 7.3, 0, (b) => K.roundLamp(b, 0, 0, 3), { collide: [0.2, 0.2] });
    });
  });
  // clock tower
  const ct = S.put(Math.sin(120 * DEG) * 11, Math.cos(120 * DEG) * 11, 120 + 180, (b) => {
    b.box(1.8, 8, 1.8, 0, -1, 0, '#f1e3d3');
    b.box(2.1, 0.3, 2.1, 0, 6.5, 0, '#2b2d42');
    b.cyl(0.75, 0.75, 0.12, 0, 5.7, 0.92, '#ffffff', 20, { rx: Math.PI / 2, outline: true });
    b.cone(1.5, 1.8, 0, 6.8, 0, '#457b9d', 4, { ry: Math.PI / 4 });
    b.box(0.08, 0.5, 0.05, 0, 5.75, 1.0, '#14111c', { outline: false });
    b.box(0.4, 0.08, 0.05, 0.18, 5.75, 1.0, '#14111c', { outline: false });
  }, { collide: [1.1, 1.1, 0, 0, 9] });
  // kiosk and bikes
  const kk = S.put(Math.sin(-120 * DEG) * 10, Math.cos(-120 * DEG) * 10, -120 + 180, (b) => {
    b.box(2.6, 2.4, 1.8, 0, -0.5, 0, '#ffd60a');
    b.box(3.0, 0.2, 2.4, 0, 1.9, 0.2, '#e63946');
    b.box(2.2, 0.9, 0.05, 0, 0.6, 0.92, '#fff7e0', { glow: true });
    for (let i = 0; i < 5; i++) b.box(0.32, 0.45, 0.04, -0.8 + i * 0.4, 0.75, 0.96, ['#e63946', '#14111c', '#457b9d', '#f4a261', '#2a9d8f'][i], { outline: false });
    K.bike(b, 2.6, 0.6, 0.2, '#2a9d8f'); K.bike(b, 3.2, 0.6, 0.1, '#e63946');
  }, { collide: [1.6, 1.2] });
  S.sign(kk, signTexture('NEWS', { bg: '#14111c', fg: '#ffd60a', w: 256, h: 96, font: FONT_COND }), { y: 2.35, z: 1.42, w: 1.6, h: 0.55 });
  // planters + trees
  [[3.5, 9.5], [-3.5, 9.5], [9, -3], [-9, -3]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { s: 1.1, seed: i + 3 }), { collide: [0.5, 0.5] }));
  // newspaper boxes by the HQ
  [[-2.4, 10], [2.4, 10]].forEach(([x, z], i) => S.put(x, z, 180, (b) => { b.box(0.6, 1.0, 0.5, 0, 0, 0, i ? '#457b9d' : '#e63946'); b.box(0.45, 0.35, 0.03, 0, 0.55, 0.26, '#fbf6ea', { glow: true }); }, { collide: [0.35, 0.3] }));
  S.finish('herald');
}

// ---------- STATION + ARCADE ----------
function station(W) {
  const S = new Site(W, 38, 0);
  const bAng = -125 * DEG;
  const bx = Math.sin(bAng) * 9.2, bz = Math.cos(bAng) * 9.2;
  const st = S.put(bx, bz, 55, (b) => {
    K.building(b, { w: 9, h: 4.5, d: 4.5, color: '#f8f4ea', roofColor: '#2a9d8f', trim: '#2a9d8f', seed: 21, door: false, lit: 0.8, roof: 'flat' });
    b.box(3, 2.6, 0.1, 0, 0, 2.27, '#c7f0ff', { glow: true });
    b.box(9.8, 0.25, 2.2, 0, 3.2, 3.0, '#2a9d8f');
    [-4.6, 4.6].forEach((x) => b.box(0.18, 3.2, 0.18, x, 0, 3.9, '#2a9d8f'));
    // ticket gates
    for (let i = -1; i <= 1; i++) b.box(0.2, 1.0, 1.0, i * 0.9, 0, 2.9, '#adb5bd', { outline: false });
    // clock
    b.cyl(0.55, 0.55, 0.1, 0, 3.9, 2.32, '#ffffff', 18, { rx: Math.PI / 2 });
    b.box(0.06, 0.38, 0.04, 0, 3.9, 2.38, '#14111c', { outline: false });
  }, { collide: [4.7, 2.5, 0, 0, 6] });
  S.sign(st, signTexture('星駅', { bg: '#ffffff', fg: '#14111c', w: 512, h: 160, sub: 'HOSHI STATION' }), { y: 3.55, z: 4.12, w: 3.2, h: 1.0 });
  W.landmarks.station = st.d;
  W.stationFrame = st;

  // vending machines
  [[-1.2, 0], [0, 0], [1.2, 0]].forEach(([ox], i) => {
    const a = -165 * DEG;
    const fr = S.put(Math.sin(a) * 6.8 + ox * Math.cos(a), Math.cos(a) * 6.8 - ox * Math.sin(a), -165 + 180, (b) => K.vending(b, 0, 0, 0, ['#e63946', '#219ebc', '#ffd60a'][i]), { collide: [0.55, 0.45] });
    if (i === 1) W.addInteract('vending', fr.d, 1.6, { f: fr.f });
  });

  // arcade along the eastern ring road
  const u = new THREE.Vector2(Math.sin(72 * DEG), Math.cos(72 * DEG));
  const p = new THREE.Vector2(-u.y, u.x);
  const shops = [
    ['花屋', 'HANAMICHI FLOWERS', '#ff8fab', '#fff0f3'], ['たい焼き', 'TAIYAKI', '#f77f00', '#fff3e0'], ['本屋', 'BOOKS', '#457b9d', '#eef4f8'],
    ['喫茶', 'KISSA LUNA', '#6d597a', '#f5eef8'], ['八百屋', 'GREENGROCER', '#2a9d8f', '#eefaf6'], ['薬局', 'PHARMACY', '#06d6a0', '#f0fff8'],
    ['玩具', 'TOYS', '#ffd60a', '#fffbe0'], ['豆腐', 'TOFU (CLOSED)', '#8d99ae', '#e9ecef'], ['写真', 'PHOTO', '#e63946', '#fff0f0'], ['服', 'CLOTHES', '#3a86ff', '#eef3ff'],
  ];
  const angU = Math.atan2(u.x, u.y) / DEG;
  for (let i = 0; i < 5; i++) {
    for (const side of [1, -1]) {
      const s = 8.5 + i * 2.75;
      const idx = i * 2 + (side > 0 ? 0 : 1);
      const [jp, en, awn, wall] = shops[idx];
      const cx = u.x * s + p.x * 3.4 * side, cz = u.y * s + p.y * 3.4 * side;
      const fr = S.put(cx, cz, angU + 90 * side, (b) => {
        K.shop(b, { w: 2.65, h: 3.3, d: 3, color: wall, awn, seed: 30 + idx });
        if (idx === 0) K.flowerBuckets(b, 0.4, 1.9);
      }, { collide: [1.4, 1.6] });
      S.sign(fr, signTexture(jp, { bg: awn, fg: '#fff', w: 160, h: 420, vertical: true }), { x: 1.15, y: 2.4, z: 1.75, w: 0.42, h: 1.1, ry: 0 });
      S.sign(fr, signTexture(en, { bg: '#14111c', fg: '#fff', w: 512, h: 96, font: FONT_COND }), { y: 2.55, z: 1.52, w: 2.3, h: 0.42 });
    }
    // arch over the road
    const s = 8.5 + i * 2.75 + 1.37;
    S.put(u.x * s, u.y * s, angU, (b) => {
      const g = new THREE.TorusGeometry(3.6, 0.09, 6, 20, Math.PI);
      b.add(g, '#f8f4ea', { y: 2.2, outline: false });
      [-1.6, 0, 1.6].forEach((x) => K.chochin(b, x, 4.7 - Math.abs(x) * 0.25, 0, ['#e63946', '#ffd60a', '#e63946'][Math.abs(x) > 0 ? 0 : 1]));
    });
  }
  // entrance banner
  const ent = S.put(u.x * 7.4, u.y * 7.4, angU, (b) => {
    [-3.0, 3.0].forEach((x) => b.box(0.3, 5.0, 0.3, x, -0.2, 0, '#e63946'));
    b.box(6.6, 0.9, 0.3, 0, 4.4, 0, '#14111c');
  });
  S.sign(ent, signTexture('星町 ARCADE STREET', { bg: '#14111c', fg: '#ffd60a', w: 1024, h: 140, font: FONT_DISPLAY }), { y: 4.85, z: 0.17, w: 6.2, h: 0.82, double: true });

  // trees and bikes around the plaza
  [[4, -6], [-2, 7], [6.5, -2.5]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { s: 0.95, seed: 50 + i }), { collide: [0.5, 0.5] }));
  S.put(-6.5, 2.5, 90, (b) => { for (let i = 0; i < 4; i++) K.bike(b, i * 0.55 - 0.8, 0, Math.PI / 2, ['#e63946', '#ffd60a', '#2a9d8f', '#14111c'][i]); }, { collide: [1.2, 0.6] });
  S.finish('station');
}

// ---------- SHRINE ----------
function shrine(W) {
  const G = new Site(W, 36, 120); // gate at the foot of the hill
  const top = dirFromLatLon(46, 130);
  // torii path from the gate up to the shrine
  const S = new Site(W, 46, 130);
  // vector from gate to shrine in gate frame
  const gp = top.clone().multiplyScalar(R / top.dot(G.c));
  const tdx = gp.clone().sub(G.c.clone().multiplyScalar(R)).dot(G.e), tdz = gp.clone().sub(G.c.clone().multiplyScalar(R)).dot(G.n);
  const len = Math.hypot(tdx, tdz);
  const hdg = Math.atan2(tdx, tdz) / DEG;
  for (let i = 0; i < 6; i++) {
    const t = 0.08 + (i / 6) * 0.62;
    G.put(tdx * t, tdz * t, hdg, (b) => K.torii(b, 0, 0, 0, 0.95), {});
    // collision for both posts
    const fr = G.frame(tdx * t, tdz * t, hdg);
    const r = new THREE.Vector3().crossVectors(fr.d, fr.f);
    [-1.2, 1.2].forEach((o) => W.addCircle(fr.d.clone().multiplyScalar(R).addScaledVector(r, o).normalize(), 0.3));
  }
  for (let i = 0; i < 5; i++) {
    const t = 0.12 + (i / 5) * 0.62;
    const side = new THREE.Vector2(tdz, -tdx).normalize().multiplyScalar(2.2);
    [1, -1].forEach((s) => G.put(tdx * t + side.x * s, tdz * t + side.y * s, hdg, (b) => K.stoneLantern(b, 0, 0), { collide: [0.35, 0.35] }));
  }
  G.finish('shrine-path');

  // shrine hall faces back down toward the gate
  const face = hdg + 180;
  const hall = S.put(0, 0.9, face, (b) => {
    b.box(5.2, 0.7, 4.2, 0, -0.4, -0.6, '#8d6e63');
    b.box(4.4, 2.2, 3.2, 0, 0.3, -0.8, '#fbf6ea');
    for (let i = -2; i <= 2; i++) b.cyl(0.13, 0.13, 2.3, i * 1.05, 0.3, 0.85, '#c1121f', 8);
    b.box(4.6, 0.2, 0.2, 0, 2.4, 0.85, '#c1121f');
    // curved roof
    const shape = new THREE.Shape();
    shape.moveTo(-3.6, 0); shape.quadraticCurveTo(-2.2, 0.35, -0.3, 1.9); shape.lineTo(0.3, 1.9); shape.quadraticCurveTo(2.2, 0.35, 3.6, 0); shape.lineTo(3.4, -0.25); shape.quadraticCurveTo(2.0, 0.1, 0, 1.55); shape.quadraticCurveTo(-2.0, 0.1, -3.4, -0.25); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, { depth: 5.4, bevelEnabled: false });
    g.translate(0, 0, -2.7);
    b.add(g, '#2b2d42', { y: 2.55, z: -0.6 });
    b.box(0.8, 0.25, 5.5, 0, 4.35, -0.6, '#ffd60a', { outline: false });
    // offering box and bell
    b.box(1.4, 0.7, 0.7, 0, 0, 1.6, '#6b4226');
    b.sphere(0.28, 0, 2.05, 1.05, '#d4a017');
    b.cyl(0.03, 0.03, 1.6, 0.12, 0.45, 1.05, '#e63946', 6, { outline: false });
    b.cyl(0.03, 0.03, 1.6, -0.12, 0.45, 1.05, '#f8f4ea', 6, { outline: false });
    // steps
    b.box(2.6, 0.25, 0.9, 0, -0.35, 2.4, '#bdb2a7');
  }, { collide: [2.7, 2.6, 0, -0.6, 5.5] });
  S.sign(hall, signTexture('灯籠山', { bg: '#14111c', fg: '#ffd60a', w: 160, h: 420, vertical: true }), { y: 2.7, z: 1.0, w: 0.4, h: 1.05 });
  W.addInteract('bell', S.dir(0, 0.9).clone(), 2.4, { f: hall.f, frame: hall });
  W.landmarks.shrine = hall.d;
  // sacred tree with shimenawa
  const st = S.put(-4.2, 2.0, face, (b) => {
    b.cyl(0.45, 0.65, 3.2, 0, -0.3, 0, '#6b4a33', 9);
    b.add(new THREE.TorusGeometry(0.6, 0.09, 6, 16), '#e9d8a6', { y: 1.4, rx: Math.PI / 2, outline: false });
    for (let i = 0; i < 4; i++) b.box(0.12, 0.3, 0.02, Math.sin(i * 1.57) * 0.66, 1.15, Math.cos(i * 1.57) * 0.66, '#ffffff', { ry: i * 1.57, outline: false });
    b.ico(1.6, 0, 3.6, 0, '#3a7d44', 1); b.ico(1.1, 0.9, 3.0, 0.4, '#4f9d4a', 1); b.ico(1.0, -0.9, 3.2, -0.3, '#2f6b3a', 1); b.ico(0.9, 0, 4.6, 0, '#5bb35a', 1);
  }, { collide: [0.7, 0.7] });
  // sakura ring
  [[3.8, 2.4], [4.2, -1.8], [-3.6, -2.2], [2.8, 5.0], [-2.6, 5.4]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { kind: 'sakura', s: 1.05, seed: 70 + i }), { collide: [0.45, 0.45] }));
  W.petalSources.push(S.dir(0, 0));
  // omikuji rack
  S.put(2.6, -1.0, face, (b) => { b.box(1.6, 1.2, 0.1, 0, 0, 0, '#6b4226'); for (let i = 0; i < 10; i++) b.box(0.06, 0.18, 0.04, -0.7 + i * 0.155, 0.9 - (i % 2) * 0.3, 0.07, '#ffffff', { outline: false }); }, { collide: [0.9, 0.2] });
  S.finish('shrine');
}

// ---------- PARK + SCHOOL ----------
function park(W) {
  const S = new Site(W, 36, 240);
  const sAng = -35 * DEG;
  const sc = S.put(Math.sin(sAng) * 12.5, Math.cos(sAng) * 12.5, 145, (b) => {
    K.building(b, { w: 12, h: 7.4, d: 4.2, color: '#f6f1e1', roofColor: '#52796f', trim: '#52796f', seed: 41, door: true, lit: 0.55 });
    b.box(2.4, 9.2, 2.4, 0, -1, 0.5, '#f6f1e1');
    b.cyl(0.8, 0.8, 0.12, 0, 7.4, 1.72, '#ffffff', 20, { rx: Math.PI / 2 });
    b.box(0.07, 0.6, 0.04, 0, 7.4, 1.8, '#14111c', { outline: false });
    b.box(2.6, 0.3, 2.6, 0, 8.2, 0.5, '#52796f');
  }, { collide: [6.2, 2.3, 0, 0, 9.5] });
  S.sign(sc, signTexture('日向高校', { bg: '#f6f1e1', fg: '#2f3e46', w: 512, h: 128, sub: 'HINATA HIGH SCHOOL' }), { y: 5.6, z: 1.73, w: 2.2, h: 0.6 });
  W.landmarks.park = sc.d;
  // school fence
  S.put(Math.sin(sAng) * 9.0, Math.cos(sAng) * 9.0, 145, (b) => K.fence(b, 0, 0, 10, 0, '#52796f'));

  // swings
  const sw = S.put(-3.0, 2.0, 120, (b) => {
    [-1.4, 1.4].forEach((x) => { b.cyl(0.07, 0.07, 2.6, x, 0, -0.5, '#e63946', 6, { rx: 0.2 }); b.cyl(0.07, 0.07, 2.6, x, 0, 0.5, '#e63946', 6, { rx: -0.2 }); });
    b.box(3.0, 0.12, 0.12, 0, 2.45, 0, '#e63946');
  }, { collide: [1.6, 0.6] });
  W.swings.push({ m: sw.m, xs: [-0.6, 0.6], y: 2.45 });
  // slide
  S.put(2.8, 3.6, 200, (b) => {
    b.box(1.0, 1.8, 1.0, 0, 0, -0.9, '#ffd60a');
    const g = new THREE.BoxGeometry(0.7, 0.08, 2.6);
    b.add(g, '#3a86ff', { y: 1.0, z: 0.5, rx: -0.6 });
    b.box(0.08, 1.8, 0.08, -0.45, 0, -1.4, '#14111c', { outline: false });
  }, { collide: [0.6, 1.4] });
  // basketball
  S.put(Math.sin(-150 * DEG) * 7.6, Math.cos(-150 * DEG) * 7.6, 30, (b) => {
    b.cyl(0.08, 0.1, 3.2, 0, 0, -0.4, '#2b2d42', 6);
    b.box(1.4, 0.9, 0.08, 0, 2.9, -0.2, '#ffffff');
    b.add(new THREE.TorusGeometry(0.24, 0.03, 6, 14), '#f77f00', { y: 2.75, z: 0.12, rx: Math.PI / 2, outline: false });
  }, { collide: [0.3, 0.3] });
  // benches
  [[-4.6, 1.0, 120], [4.6, -1.8, -60], [1.2, -5.0, 0]].forEach(([x, z, h]) => {
    const fr = S.put(x, z, h, (b) => K.bench(b, 0, 0, 0, '#8d5524'), { collide: [0.9, 0.35] });
    W.addInteract('bench', fr.d, 1.3, { f: fr.f });
  });
  // trees
  [[7, 3], [-7, -4], [6, -6], [-1, 8], [8.5, -1], [-8, 3], [3, 8.5]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { s: 1.1 + (i % 3) * 0.15, seed: 90 + i, color: i % 2 ? '#4f9d4a' : '#5aa65a' }), { collide: [0.5, 0.5] }));
  const vm = S.put(4.8, 4.8, -135, (b) => K.vending(b, 0, 0, 0, '#06d6a0'), { collide: [0.55, 0.45] });
  W.addInteract('vending', vm.d, 1.6, { f: vm.f });
  S.finish('park');
}

// ---------- BEACH + PIER ----------
function beach(W) {
  const S = new Site(W, -30, 60);
  // lifeguard tower
  const lt = S.put(-7.5, -10, 20, (b) => {
    [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([x, z]) => b.cyl(0.07, 0.09, 2.6, x, -0.3, z, '#f8f4ea', 6));
    b.box(2.0, 0.15, 2.0, 0, 2.2, 0, '#f8f4ea');
    b.box(1.8, 1.2, 1.6, 0, 2.35, -0.1, '#e63946');
    b.box(1.4, 0.6, 0.05, 0, 2.75, 0.71, '#c7f0ff', { glow: true });
    b.cone(1.5, 0.6, 0, 3.55, -0.1, '#ffffff', 4, { ry: Math.PI / 4 });
    b.box(0.6, 0.06, 1.6, 0, 1.2, 1.4, '#f8f4ea', { rx: -0.9, outline: false });
  }, { collide: [1.1, 1.1] });
  S.sign(lt, signTexture('LIFEGUARD', { bg: '#e63946', fg: '#fff', w: 512, h: 96, font: FONT_COND }), { y: 3.25, z: 0.72, w: 1.6, h: 0.3 });
  W.flags.push({ m: lt.m, x: 0.8, z: 0.8, h: 4.2, color: '#ffd60a' });
  // umi no ie huts
  [[-9, -3.5, '海の家', '#00b4d8'], [9, -4.5, 'かき氷', '#ff8fab']].forEach(([x, z, jp, c], i) => {
    const fr = S.put(x, z, 180, (b) => {
      b.box(4.2, 2.6, 3.0, 0, -0.5, 0, '#f1e3d3');
      b.box(4.6, 0.2, 3.6, 0, 2.1, 0.3, c);
      b.box(3.6, 1.2, 0.05, 0, 0.6, 1.51, '#fff4d6', { glow: true });
      K.awning(b, 4.0, 1.9, 1.5, c);
    }, { collide: [2.2, 1.6] });
    S.sign(fr, signTexture(jp, { bg: '#fff', fg: c, w: 512, h: 140 }), { y: 2.55, z: 1.82, w: 2.0, h: 0.55 });
  });
  // umbrellas, towels, boards, palms
  const rnd = mulberry(7);
  for (let i = 0; i < 9; i++) {
    const x = -13 + i * 3.2 + (rnd() - 0.5) * 1.2;
    if (Math.abs(x) < 2.5) continue;
    const z = -9.5 - rnd() * 3.5;
    const cols = [['#e63946', '#ffffff'], ['#00b4d8', '#ffffff'], ['#ffd60a', '#f77f00'], ['#06d6a0', '#ffffff']][i % 4];
    S.put(x, z, rnd() * 360, (b) => {
      K.umbrella(b, 0, 0, cols[0], cols[1], 0.12);
      b.box(0.8, 0.03, 1.7, 0.9, 0, 0.2, cols[0], { outline: false });
    }, { collide: [0.25, 0.25] });
  }
  [[-3.8, -8.8], [3.6, -8.5], [-12.5, -7], [12.5, -8]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { kind: 'palm', s: 1.0 + (i % 2) * 0.2, seed: 110 + i }), { collide: [0.35, 0.35] }));
  [[5.8, -11.5, '#f77f00'], [6.4, -11.4, '#3a86ff'], [7.0, -11.6, '#ffffff']].forEach(([x, z, c]) => S.put(x, z, 0, (b) => b.add(new THREE.CapsuleGeometry(0.22, 1.6, 4, 8), c, { y: 0.9, sz: 0.25, rz: 0.15 })));
  // plastic bottles washed up (the story of assignment 01)
  const trash = ['#90e0ef', '#b7e4c7', '#ffffff', '#ff8fab', '#ffd60a'];
  for (let i = 0; i < 26; i++) {
    const x = (rnd() - 0.5) * 26, z = -12.8 - rnd() * 1.4;
    if (Math.abs(x) < 1.6) continue;
    S.put(x, z, rnd() * 360, (b) => b.add(new THREE.CylinderGeometry(0.06, 0.07, 0.28, 6), trash[i % 5], { y: 0.06, rz: Math.PI / 2, outline: false }));
  }
  W.trashSpots.push(S.dir(0, -13));
  W.landmarks.beach = S.dir(0, -8);
  S.finish('beach');

  // pier + lighthouse (separate chunk)
  const P = new Site(W, -30, 60);
  const latSpan = PIER.latA - PIER.latB;
  const start = (30 - Math.abs(PIER.latA)) * DEG * R; // negative dz, start
  for (let i = 0; i <= 26; i++) {
    const lat = PIER.latA + 0.5 - (i / 26) * (latSpan + 1);
    const d = dirFromLatLon(lat, PIER.lon);
    const f = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y).normalize().negate();
    const pos = d.clone().multiplyScalar(R + PIER_DECK);
    const m = basisMatrix(d, f, pos);
    P.b.push(m);
    P.b.box(1.9, 0.12, 0.66, 0, -0.12, 0, i % 2 ? '#a47148' : '#b5835a', { outline: false });
    if (i % 3 === 0) {
      [-0.85, 0.85].forEach((x) => { P.b.cyl(0.08, 0.08, 3.0, x, -3.0, 0, '#6b4a33', 6, { outline: false }); P.b.cyl(0.04, 0.04, 0.8, x, 0, 0, '#f8f4ea', 6, { outline: false }); });
    }
    P.b.box(0.06, 0.06, 0.7, 0.85, 0.75, 0, '#f8f4ea', { outline: false });
    P.b.box(0.06, 0.06, 0.7, -0.85, 0.75, 0, '#f8f4ea', { outline: false });
    P.b.pop();
    // railings block the edges
    const r = new THREE.Vector3().crossVectors(d, f);
    W.addCircle(d.clone().multiplyScalar(R).addScaledVector(r, 1.15).normalize(), 0.3);
    W.addCircle(d.clone().multiplyScalar(R).addScaledVector(r, -1.15).normalize(), 0.3);
  }
  // lighthouse on the island
  const ld = dirFromLatLon(-74.5, 60);
  const lf = new THREE.Vector3(0, 1, 0).addScaledVector(ld, -ld.y).normalize();
  const lm = basisMatrix(ld, lf, surfacePoint(ld));
  P.b.push(lm);
  for (let i = 0; i < 5; i++) P.b.cyl(1.05 - i * 0.12, 1.12 - i * 0.12, 1.5, 0, -0.5 + i * 1.5, 0, i % 2 ? '#e63946' : '#ffffff', 14);
  P.b.cyl(0.95, 0.95, 0.2, 0, 7.0, 0, '#14111c', 14);
  P.b.cyl(0.55, 0.55, 1.0, 0, 7.2, 0, '#fff1b8', 10, { glow: true });
  P.b.cone(0.75, 0.9, 0, 8.2, 0, '#14111c', 10);
  P.b.box(0.8, 1.3, 0.06, 0, 0, 1.1, '#5c3d2e');
  P.b.pop();
  W.addCircle(ld, 1.3, 9);
  W.lighthouse = { m: lm, y: 7.7 };
  // rocks on the island
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1;
    const d = new THREE.Vector3().copy(ld).multiplyScalar(R).addScaledVector(lf, Math.cos(a) * 2.6).addScaledVector(new THREE.Vector3().crossVectors(ld, lf), Math.sin(a) * 2.6).normalize();
    const m = basisMatrix(d, lf, surfacePoint(d));
    P.b.push(m); K.rock(P.b, 0, 0, 0.8 + (i % 3) * 0.3, '#7d8597'); P.b.pop();
  }
  W.boat = { d: dirFromLatLon(-63, 66) };
  P.finish('pier');
}

// ---------- NEON YOKOCHO ----------
function alley(W) {
  const S = new Site(W, -18, 180);
  const rnd = mulberry(5);
  const signs = [['居酒屋', '#e63946'], ['焼鳥', '#ffd60a'], ['BAR', '#4cc9f0'], ['寿司', '#ff8fab'], ['餃子', '#06d6a0'], ['カラオケ', '#c77dff'], ['おでん', '#f77f00'], ['喫茶', '#ffd60a']];
  let k = 0;
  const lane = (zs, side) => zs.forEach((z) => {
    const x = side * 3.4;
    const h = 3.6 + rnd() * 2.2;
    const col = ['#3d3a4b', '#4a3f35', '#2f3e46', '#5c4b51'][k % 4];
    const [jp, sc] = signs[k % signs.length];
    const fr = S.put(x, z, side > 0 ? -90 : 90, (b) => {
      b.box(2.8, h + 1, 3.2, 0, -1, 0, col);
      b.box(3.0, 0.2, 3.4, 0, h, 0, '#14111c');
      b.box(2.0, 1.6, 0.06, 0, 0, 1.61, '#ffcf8a', { glow: true });
      // noren curtain
      for (let i = 0; i < 4; i++) b.box(0.45, 0.6, 0.03, -0.72 + i * 0.48, 1.3, 1.66, sc, { outline: false });
      // upper windows
      b.box(0.8, 0.6, 0.05, -0.6, 2.4, 1.61, rnd() < 0.7 ? '#ffb86b' : '#3d405b', { glow: true });
      b.box(0.8, 0.6, 0.05, 0.6, 2.4, 1.61, rnd() < 0.7 ? '#ffb86b' : '#3d405b', { glow: true });
      // AC units, pipes
      b.box(0.7, 0.45, 0.35, 1.0, 3.2, 1.75, '#ced4da');
      b.cyl(0.05, 0.05, h, -1.3, -0.2, 1.65, '#6c757d', 6, { outline: false });
      K.chochin(b, -1.0, 2.0, 1.85, '#e63946');
      K.chochin(b, 1.0, 2.0, 1.85, '#e63946');
    }, { collide: [1.5, 1.7, 0, 0, 6] });
    S.sign(fr, signTexture(jp, { fg: sc, w: 160, h: 480, vertical: true, neon: true }), { x: 1.6, y: 2.0, z: 1.75, w: 0.45, h: 1.4, ry: -Math.PI / 2, double: true });
    k++;
  });
  lane([6.5, 9.4, 12.3], -1); lane([6.5, 9.4, 12.3], 1);
  lane([-3.5, -6.4, -9.3, -12.2], -1); lane([-3.5, -6.4, -9.3, -12.2], 1);
  // lantern strings across the lane
  for (const z of [5, 8, 11, -5, -8, -11]) {
    S.put(0, z, 0, (b) => {
      const pts = [];
      for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(-2.2 + t * 4.4, 3.6 - Math.sin(t * Math.PI) * 0.5, 0)); }
      b.tube(pts, 0.015, '#14111c');
      for (let i = 1; i < 8; i += 2) { const p = pts[i]; K.chochin(b, p.x, p.y - 0.32, 0, i % 4 === 1 ? '#ffd60a' : '#e63946'); }
    });
  }
  // ramen yatai
  const ya = S.put(1.2, 0, 0, (b) => {
    b.box(2.4, 0.95, 1.2, 0, 0, 0, '#8d5524');
    b.box(2.6, 0.08, 0.5, 0, 0.95, 0.55, '#c08552');
    [-1.1, 1.1].forEach((x) => b.box(0.08, 2.0, 0.08, x, 0.95, -0.4, '#5c3d2e', { outline: false }));
    b.box(2.8, 0.15, 1.8, 0, 2.95, 0.1, '#e63946');
    for (let i = 0; i < 5; i++) b.box(0.5, 0.65, 0.02, -1.0 + i * 0.5, 2.25, 0.95, i % 2 ? '#14111c' : '#e63946', { outline: false });
    b.cyl(0.32, 0.3, 0.45, 0.6, 0.95, -0.15, '#adb5bd', 12);
    [-0.6, 0.0, 0.6].forEach((x) => b.cyl(0.2, 0.2, 0.5, x - 0.2, 0, 1.4, '#e63946', 8));
    K.chochin(b, 1.3, 2.4, 1.0, '#ff4d4d');
  }, { collide: [1.3, 0.8, 0, 0.1] });
  S.sign(ya, signTexture('ラーメン平野', { bg: '#14111c', fg: '#fff', w: 640, h: 128, sub: 'RAMEN HIRANO' }), { y: 3.25, z: 1.02, w: 2.4, h: 0.5 });
  W.steamSources.push({ m: ya.m, x: 0.6, y: 1.5, z: -0.15 });
  W.landmarks.alley = ya.d;
  // cafe for Sora
  const vm = S.put(-1.8, 4.2, 90, (b) => K.vending(b, 0, 0, 0, '#3a0ca3'), { collide: [0.55, 0.45] });
  W.addInteract('vending', vm.d, 1.6, { f: vm.f });
  S.put(-1.4, 8.4, 90, (b) => { b.cyl(0.4, 0.4, 0.06, 0, 0.75, 0, '#f8f4ea', 12); b.cyl(0.05, 0.05, 0.75, 0, 0, 0, '#14111c', 6, { outline: false }); }, { collide: [0.45, 0.45] });
  // power poles at the ends
  [[-2.5, 15], [2.5, -15]].forEach(([x, z]) => S.put(x, z, 0, (b) => K.pole(b, 0, 0, 6), { collide: [0.2, 0.2] }));
  S.finish('alley');
}

// ---------- TSUKIMI RESIDENCES ----------
function homes(W) {
  const S = new Site(W, -18, 300);
  const danchi = (ang, dist, seed) => {
    const a = ang * DEG;
    const fr = S.put(Math.sin(a) * dist, Math.cos(a) * dist, ang + 180, (b) => {
      b.box(13, 10, 4, 0, -1, 0, '#e8e1d5');
      b.box(13.2, 0.3, 4.2, 0, 9, 0, '#8d99ae');
      for (let f = 0; f < 4; f++) {
        const y = 0.6 + f * 2.2;
        b.box(13, 0.12, 1.0, 0, y + 0.85, 2.4, '#c9c2b8', { outline: false });
        b.box(13, 0.8, 0.06, 0, y + 0.95, 2.88, '#d6ccc2', { outline: false });
        for (let i = 0; i < 6; i++) {
          const x = -5.4 + i * 2.15;
          b.box(1.1, 1.2, 0.05, x, y + 0.9, 2.02, (seed * 7 + i + f) % 3 ? '#ffd98a' : '#5d7c99', { glow: true });
          if ((i + f + seed) % 3 === 0) {
            // laundry
            const cl = ['#e63946', '#ffffff', '#3a86ff', '#ffd60a', '#ff8fab'];
            for (let j = 0; j < 3; j++) b.box(0.3, 0.45, 0.02, x - 0.45 + j * 0.42, y + 1.25, 2.75, cl[(i + j + f) % 5], { outline: false });
          }
        }
      }
      // stairwell
      b.box(1.6, 10.4, 1.6, 6.9, -1, 0, '#d6ccc2');
      b.box(1.0, 1.4, 0.05, 6.9, 0, 0.82, '#5c3d2e');
    }, { collide: [7.8, 2.4, 0, 0, 10.5] });
    S.sign(fr, signTexture(`${seed} 号棟`, { bg: '#e8e1d5', fg: '#457b9d', w: 256, h: 128 }), { x: -5.5, y: 9.6, z: 2.05, w: 1.4, h: 0.7 });
    return fr;
  };
  danchi(28, 13.5, 1);
  danchi(180, 12.5, 2);
  // Hoshi Mart
  const mk = S.put(Math.sin(68 * DEG) * 9.8, Math.cos(68 * DEG) * 9.8, 68 + 180, (b) => {
    b.box(6, 3.4, 4.2, 0, -1, 0, '#ffffff');
    b.box(6.2, 0.7, 4.4, 0, 2.4, 0, '#06d6a0');
    b.box(6.2, 0.25, 4.4, 0, 2.3, 0, '#e63946', { outline: false });
    b.box(5.2, 1.9, 0.06, 0, 0.2, 2.11, '#e6fbff', { glow: true });
    for (let i = 0; i < 4; i++) b.box(0.9, 1.3, 0.08, -1.8 + i * 1.2, 0.3, 1.6, ['#ffd60a', '#ff8fab', '#90e0ef', '#b7e4c7'][i], { outline: false });
  }, { collide: [3.2, 2.3] });
  S.sign(mk, signTexture('HOSHI MART 24', { bg: '#06d6a0', fg: '#fff', w: 768, h: 128, font: FONT_COND }), { y: 2.75, z: 2.22, w: 4.2, h: 0.65 });
  // small houses
  [[-150, 10, '#f4a261', '#9c2c2c'], [-178, 6.6, '#a8dadc', '#264653'], [150, 8.6, '#ffe5b4', '#6d597a'], [-20, 8.5, '#e9c46a', '#2a6f97']].forEach(([ang, dist, c, r], i) => {
    const a = ang * DEG;
    if (Math.abs(ang) > 170 && dist < 8) return;
    S.put(Math.sin(a) * dist, Math.cos(a) * dist, ang + 180, (b) => {
      K.building(b, { w: 3.6, h: 2.8, d: 3.2, color: c, roof: 'gable', roofColor: r, seed: 140 + i, lit: 0.6 });
      K.fence(b, 0, 2.4, 3.6, 0, '#f8f4ea');
      K.bush(b, 1.4, 2.0, 0.8);
    }, { collide: [2.0, 1.9] });
  });
  // mailboxes + bus stop
  const bs = S.put(3.8, -3.2, -60, (b) => {
    b.cyl(0.05, 0.05, 2.4, 0, 0, 0, '#adb5bd', 6);
    b.cyl(0.35, 0.35, 0.08, 0, 2.3, 0, '#3a86ff', 14, { rx: Math.PI / 2 });
    b.box(1.6, 0.1, 0.4, 0.9, 0.45, 0.2, '#8d99ae');
  }, { collide: [0.3, 0.3] });
  S.put(-5.6, -1.2, 90, (b) => { for (let i = 0; i < 6; i++) b.box(0.3, 0.3, 0.3, -0.8 + (i % 3) * 0.32, 0.6 + Math.floor(i / 3) * 0.32, 0, '#adb5bd'); b.box(1.1, 0.6, 0.35, -0.48, 0, 0, '#6c757d'); }, { collide: [0.7, 0.3] });
  [[6, 2], [-3, -6.5], [-6.6, 4.6]].forEach(([x, z], i) => S.put(x, z, 0, (b) => K.tree(b, 0, 0, { s: 1.0, seed: 150 + i }), { collide: [0.5, 0.5] }));
  [[-3.8, 6], [5.2, 6.6]].forEach(([x, z]) => S.put(x, z, 0, (b) => K.pole(b, 0, 0, 6), { collide: [0.2, 0.2] }));
  W.landmarks.homes = S.dir(0, 0);
  S.finish('homes');
}

// ---------- TRAIN LINE ----------
function trainLine(W) {
  const st = W.stationFrame;
  // great circle through the station, running along the station front
  const right = new THREE.Vector3().crossVectors(st.d, st.f).normalize();
  const n = new THREE.Vector3().crossVectors(st.d, right).normalize(); // circle normal
  W.trainCircle = { a: st.d.clone(), b: right.clone(), n, h: 8.6 };
  const b = new Builder();
  const N = 140;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const d = st.d.clone().multiplyScalar(Math.cos(t)).addScaledVector(right, Math.sin(t)).normalize();
    const f = st.d.clone().multiplyScalar(-Math.sin(t)).addScaledVector(right, Math.cos(t)).normalize();
    const pos = d.clone().multiplyScalar(R + W.trainCircle.h);
    const m = basisMatrix(d, f, pos);
    b.push(m);
    b.box(1.5, 0.25, (Math.PI * 2 * (R + 8.6)) / N + 0.05, 0, -0.25, 0, '#adb5bd', { outline: false });
    b.box(0.08, 0.1, (Math.PI * 2 * (R + 8.6)) / N + 0.05, 0.45, 0, 0, '#6c757d', { outline: false });
    b.box(0.08, 0.1, (Math.PI * 2 * (R + 8.6)) / N + 0.05, -0.45, 0, 0, '#6c757d', { outline: false });
    b.pop();
    if (i % 7 === 0) {
      const g = groundAt(d);
      const h = heightAt(d);
      // skip pylons in busy places
      if (plazaDist(d) < 1.5 || roadDist(d) < 2) continue;
      if (W.blocked(d, 0.6)) continue;
      const base = d.clone().multiplyScalar(R + h - 1);
      const mm = basisMatrix(d, f, base);
      b.push(mm);
      b.cyl(0.3, 0.38, W.trainCircle.h - h + 0.5, 0, 0, 0, '#ced4da', 8);
      b.box(1.8, 0.4, 0.6, 0, W.trainCircle.h - h + 0.4, 0, '#ced4da');
      b.pop();
      if (g !== null) W.addCircle(d, 0.45);
    }
  }
  W.addChunk(b.build('rail'));
}

// ---------- FILLER: trees, houses, lamps, poles ----------
function scatter(W) {
  const rnd = mulberry(1234);
  const b = new Builder();
  const tryPlace = (minRoad, minPlaza, radius) => {
    for (let k = 0; k < 20; k++) {
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
      const ll = latLonFromDir(d);
      if (ll.lat < -44) continue;
      if (groundAt(d) === null) continue;
      if (roadDist(d) < minRoad || plazaDist(d) < minPlaza) continue;
      if (W.blocked(d, radius)) continue;
      return d;
    }
    return null;
  };
  // houses fill the gaps
  for (let i = 0; i < 46; i++) {
    const d = tryPlace(2.8, 4.5, 2.6);
    if (!d) continue;
    // face the nearest road roughly: random but aligned
    const f = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(d).normalize();
    const m = basisMatrix(d, f, surfacePoint(d));
    b.push(m);
    const cols = ['#f4a261', '#e9c46a', '#a8dadc', '#ffe5b4', '#f1faee', '#ffcad4', '#cdeac0'];
    const roofs = ['#9c2c2c', '#264653', '#6d597a', '#2a6f97', '#3d405b'];
    const tall = rnd() < 0.25;
    K.building(b, { w: 3 + rnd() * 1.4, h: tall ? 4.6 : 2.6 + rnd() * 0.6, d: 3 + rnd(), color: cols[i % cols.length], roof: tall ? 'flat' : rnd() < 0.5 ? 'gable' : 'hip', roofColor: roofs[i % roofs.length], seed: 300 + i, lit: 0.5 });
    if (rnd() < 0.5) K.tree(b, 2.6, 1.5, { s: 0.8, seed: 400 + i });
    b.pop();
    W.addBox(d, f, 2.1, 2.1);
  }
  // trees
  for (let i = 0; i < 210; i++) {
    const d = tryPlace(1.9, 1.2, 0.8);
    if (!d) continue;
    const ll = latLonFromDir(d);
    const m = basisMatrix(d, new THREE.Vector3(1, 0, 0).cross(d).normalize(), surfacePoint(d));
    b.push(m);
    const kind = ll.lat < -36 ? 'palm' : rnd() < 0.2 ? 'pine' : rnd() < 0.12 ? 'sakura' : 'round';
    if (rnd() < 0.3) K.bush(b, 0, 0, 0.8 + rnd() * 0.6, rnd() < 0.5 ? '#3f8a43' : '#52b788');
    else K.tree(b, 0, 0, { kind, s: 0.8 + rnd() * 0.6, seed: 500 + i, color: ['#4f9d4a', '#5aa65a', '#3e8e41', '#6ab04c'][i % 4] });
    b.pop();
    W.addCircle(d, 0.45, 3);
  }
  // grass tufts and flower patches so the fields feel alive
  const fcols = ['#ffd60a', '#ff8fab', '#ffffff', '#c77dff', '#f77f00'];
  for (let i = 0; i < 420; i++) {
    const d = tryPlace(1.6, 0.4, 0.2);
    if (!d) continue;
    const m = basisMatrix(d, new THREE.Vector3(0, 0, 1).cross(d).normalize(), surfacePoint(d));
    b.push(m);
    if (i % 4 === 0) {
      for (let k = 0; k < 5; k++) {
        const a = k * 1.3 + i;
        b.cyl(0.015, 0.015, 0.35, Math.cos(a) * 0.3, -0.05, Math.sin(a) * 0.3, '#3f8a43', 3, { outline: false });
        b.sphere(0.09, Math.cos(a) * 0.3, 0.32, Math.sin(a) * 0.3, fcols[(i + k) % fcols.length], { outline: false });
      }
    } else {
      for (let k = 0; k < 3; k++) b.cone(0.07, 0.38 + k * 0.08, (k - 1) * 0.1, -0.05, (k % 2) * 0.08, k % 2 ? '#4f9d4a' : '#6ab04c', 3, { outline: false, rz: (k - 1) * 0.25 });
    }
    b.pop();
  }
  // lamps + poles along roads
  for (const s of ROAD_SEGS) {
    const ang = Math.acos(THREE.MathUtils.clamp(s.A.dot(s.B), -1, 1));
    const len = ang * R;
    const steps = Math.floor(len / 7);
    for (let i = 1; i < steps; i++) {
      const t = (i / steps) * ang;
      const side = (i % 2 ? 1 : -1);
      const along = s.A.clone().applyAxisAngle(s.N, t);
      const f = new THREE.Vector3().crossVectors(s.N, along).normalize();
      const d = along.clone().multiplyScalar(R).addScaledVector(s.N, side * (ROAD_HALF + 0.8)).normalize();
      if (plazaDist(d) < 1) continue;
      if (groundAt(d) === null) continue;
      if (W.blocked(d, 0.4)) continue;
      const m = basisMatrix(d, f.clone().multiplyScalar(side), surfacePoint(d));
      b.push(m);
      if (i % 3 === 0) K.pole(b, 0, 0, 5.6);
      else K.lamp(b, 0, 0, 3.2);
      b.pop();
      W.addCircle(d, 0.25);
    }
  }
  W.addChunk(b.build('scatter'));
}

export function buildDistricts(W) {
  herald(W);
  station(W);
  shrine(W);
  park(W);
  beach(W);
  alley(W);
  homes(W);
  trainLine(W);
  scatter(W);
}
