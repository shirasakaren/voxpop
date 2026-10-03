import * as THREE from 'three';
import { Builder } from './builder.js';
import { toonMat, outlineMat } from './toon.js';
import { faceTexture, blobShadowTexture, darken, lighten } from './textures.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const HR = 0.235; // head radius
const HIP = 0.76;
const SHOULDER = 1.16;
const NECK = 1.22;
const HEAD_Y = NECK + HR * 0.95;

export const RIN_LOOK = {
  id: 'rin', skin: '#f9dcc8', hair: 'bob', hairColor: '#27264a', top: '#e63946', bottom: '#16141f', accent: '#ffffff',
  acc: ['headphonesNeck', 'badge', 'mic', 'clip', 'ahoge', 'jacket'], height: 1.0, build: 0.95, eye: '#c1121f',
};

function headDir(az, el) {
  const a = az * Math.PI / 180, e = el * Math.PI / 180;
  return new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e));
}

// Place a cone strand on the head surface, pointing roughly "down" with a tilt.
function strand(b, color, az, el, len, rad, { out = 0.25, fwd = 0.0, rOff = 1.0 } = {}) {
  const d = headDir(az, el);
  const base = d.clone().multiplyScalar(HR * rOff);
  // direction: mostly down, pushed outward along surface normal and forward
  const dir = new THREE.Vector3(0, -1, 0).addScaledVector(d, out).add(new THREE.Vector3(0, 0, fwd)).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q);
  const geo = new THREE.ConeGeometry(rad, len, 6, 1);
  geo.rotateX(Math.PI); // tip down
  geo.translate(0, -len / 2, 0);
  b.add(geo, color, { x: base.x, y: base.y, z: base.z, rx: e.x, ry: e.y, rz: e.z });
}

function hairShell(b, color, profile, phiStart, phiLen, o = {}) {
  const pts = profile.map(([x, y]) => new THREE.Vector2(x * HR, y * HR));
  const geo = new THREE.LatheGeometry(pts, 20, phiStart, phiLen);
  b.add(geo, color, o);
}

function buildHair(b, look) {
  const c = look.hairColor;
  const dark = darken(c, 0.15);
  if (look.hair === 'bald') {
    // horseshoe of hair around the sides
    hairShell(b, c, [[1.0, 0.1], [1.06, -0.05], [1.04, -0.35], [0.9, -0.5]], Math.PI * 0.55, Math.PI * 0.9);
    return;
  }
  // cap
  const cap = new THREE.SphereGeometry(HR * 1.09, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.52);
  b.add(cap, c, { y: 0.02, z: -0.01 });
  const back = new THREE.SphereGeometry(HR * 1.08, 16, 12, Math.PI, Math.PI, 0, Math.PI * 0.78);
  b.add(back, c, { y: 0.01, z: -0.015 });

  const bangs = (count = 7, len = 0.17, spread = 52) => {
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const az = -spread + t * spread * 2;
      const l = len * (0.8 + 0.35 * Math.sin(t * Math.PI * 3.1 + 1.3) * 0.5 + (i % 2) * 0.12);
      strand(b, i % 3 === 1 ? dark : c, az, 34, l, 0.06, { out: 0.35, fwd: 0.18, rOff: 1.02 });
    }
  };

  switch (look.hair) {
    case 'bob':
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.14, 0.3], [1.18, -0.3], [1.12, -0.72], [0.98, -0.8]], Math.PI * 0.38, Math.PI * 1.24);
      bangs(8, 0.15, 55);
      strand(b, c, -68, 10, 0.34, 0.07, { out: 0.12, fwd: 0.05 });
      strand(b, c, 68, 10, 0.34, 0.07, { out: 0.12, fwd: 0.05 });
      break;
    case 'long':
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.14, 0.3], [1.18, -0.5], [1.14, -1.8], [1.0, -2.6], [0.75, -2.75]], Math.PI * 0.4, Math.PI * 1.2);
      bangs(7, 0.2, 50);
      strand(b, c, -70, 5, 0.6, 0.075, { out: 0.08, fwd: 0.04 });
      strand(b, c, 70, 5, 0.6, 0.075, { out: 0.08, fwd: 0.04 });
      break;
    case 'ponytail': {
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.12, 0.3], [1.12, -0.25], [1.02, -0.5]], Math.PI * 0.45, Math.PI * 1.1);
      bangs(6, 0.15, 48);
      // tail
      b.sphere(0.05, 0, HR * 0.75, -HR * 0.95, look.accent || '#fff', { outline: true });
      const tail = new THREE.ConeGeometry(0.11, 0.62, 8);
      tail.rotateX(Math.PI);
      b.add(tail, c, { x: 0, y: HR * 0.45 - 0.24, z: -HR * 1.25, rx: 0.42 });
      break;
    }
    case 'twintails': {
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.12, 0.3], [1.12, -0.3], [1.02, -0.6]], Math.PI * 0.42, Math.PI * 1.16);
      bangs(7, 0.18, 50);
      [-1, 1].forEach((s) => {
        b.sphere(0.045, s * HR * 0.9, HR * 0.55, -HR * 0.35, look.accent || '#ffd60a');
        const tail = new THREE.ConeGeometry(0.1, 0.72, 8);
        tail.rotateX(Math.PI);
        b.add(tail, c, { x: s * HR * 1.25, y: HR * 0.3 - 0.32, z: -HR * 0.45, rz: s * 0.28, rx: 0.15 });
      });
      break;
    }
    case 'bun':
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.1, 0.3], [1.1, -0.2], [1.0, -0.45]], Math.PI * 0.45, Math.PI * 1.1);
      bangs(5, 0.12, 44);
      b.sphere(HR * 0.48, 0, HR * 0.95, -HR * 0.62, c);
      if (look.acc?.includes('flower')) b.sphere(0.05, HR * 0.4, HR * 1.0, -HR * 0.4, '#ff8fab', { outline: false });
      break;
    case 'spiky':
      for (let i = 0; i < 14; i++) {
        const az = (i / 14) * 360;
        const d = headDir(az, 38 + (i % 3) * 10);
        const geo = new THREE.ConeGeometry(0.07, 0.2 + (i % 2) * 0.08, 5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(0, 0.4, -0.2)).normalize());
        const e = new THREE.Euler().setFromQuaternion(q);
        const p = d.multiplyScalar(HR * 1.02);
        b.add(geo, i % 2 ? c : dark, { x: p.x, y: p.y + 0.04, z: p.z, rx: e.x, ry: e.y, rz: e.z });
      }
      bangs(5, 0.13, 40);
      break;
    case 'messy':
      bangs(7, 0.16, 50);
      for (let i = 0; i < 9; i++) {
        const az = 100 + i * 20;
        strand(b, i % 2 ? c : dark, az, 20 + (i % 3) * 12, 0.18, 0.07, { out: 0.6 });
      }
      for (let i = 0; i < 5; i++) {
        const d = headDir(-60 + i * 30, 70);
        const geo = new THREE.ConeGeometry(0.06, 0.16, 5);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().add(new THREE.Vector3(0.3 * (i - 2), 0.5, 0.2)).normalize());
        const e = new THREE.Euler().setFromQuaternion(q);
        const p = d.multiplyScalar(HR * 1.04);
        b.add(geo, c, { x: p.x, y: p.y, z: p.z, rx: e.x, ry: e.y, rz: e.z });
      }
      break;
    case 'short':
    default:
      hairShell(b, c, [[0.2, 1.12], [0.85, 0.85], [1.1, 0.3], [1.1, -0.15], [1.0, -0.38]], Math.PI * 0.5, Math.PI * 1.0);
      bangs(6, 0.12, 46);
      break;
  }
  if (look.acc?.includes('ahoge')) {
    const pts = [new THREE.Vector3(0, HR * 1.05, 0.02), new THREE.Vector3(0.02, HR * 1.35, 0.06), new THREE.Vector3(0.09, HR * 1.42, 0.1)];
    b.tube(pts, 0.016, c);
  }
  if (look.acc?.includes('clip')) {
    b.box(0.09, 0.03, 0.03, -HR * 0.62, HR * 0.55, HR * 0.72, '#e63946', { rz: 0.5, ry: -0.6 });
    b.box(0.09, 0.03, 0.03, -HR * 0.66, HR * 0.47, HR * 0.68, '#ffd60a', { rz: 0.5, ry: -0.6 });
  }
}

function buildHeadAcc(b, look) {
  const a = look.acc || [];
  if (a.includes('glasses')) {
    [-1, 1].forEach((s) => {
      const d = headDir(s * 17, -6).multiplyScalar(HR * 1.04);
      const ring = new THREE.TorusGeometry(0.052, 0.009, 6, 16);
      b.add(ring, '#1c1420', { x: d.x, y: d.y, z: d.z, ry: s * 0.3, outline: false });
    });
    b.box(0.05, 0.01, 0.01, 0, -HR * 0.08, HR * 1.04, '#1c1420', { outline: false });
  }
  if (a.includes('visor')) {
    const brim = new THREE.CylinderGeometry(HR * 1.2, HR * 1.25, 0.03, 20, 1, false, -Math.PI * 0.4, Math.PI * 0.8);
    b.add(brim, '#ffffff', { y: HR * 0.42, z: 0.05 });
    const band = new THREE.TorusGeometry(HR * 1.08, 0.025, 6, 24);
    b.add(band, '#ffffff', { y: HR * 0.42, rx: Math.PI / 2 });
  }
  if (a.includes('towel') || a.includes('headband')) {
    const band = new THREE.TorusGeometry(HR * 1.06, 0.04, 6, 24);
    b.add(band, a.includes('headband') ? '#ffffff' : look.accent, { y: HR * 0.35, rx: Math.PI / 2 + 0.1 });
    b.box(0.08, 0.08, 0.04, 0, HR * 0.3, -HR * 1.08, a.includes('headband') ? '#e63946' : look.accent);
  }
  if (a.includes('cap')) {
    const dome = new THREE.SphereGeometry(HR * 1.12, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
    b.add(dome, look.accent, { y: 0.04 });
    const brim = new THREE.CylinderGeometry(HR * 0.8, HR * 0.8, 0.025, 16, 1, false, -Math.PI * 0.5, Math.PI);
    b.add(brim, darken(look.accent, 0.2), { y: HR * 0.55, z: -HR * 0.8, ry: Math.PI });
  }
  if (a.includes('headphones')) {
    const band = new THREE.TorusGeometry(HR * 1.14, 0.022, 6, 20, Math.PI);
    b.add(band, '#14111c', { y: 0.02 });
    [-1, 1].forEach((s) => b.cyl(0.07, 0.07, 0.06, s * HR * 1.12, -0.03, 0, look.accent, 12, { rz: Math.PI / 2 }));
  }
}

function buildTorso(b, look) {
  const a = look.acc || [];
  const w = 0.17 * look.build;
  const torsoH = NECK - HIP;
  // torso: tapered, flattened
  const torso = new THREE.CylinderGeometry(w * 1.05, w * 0.92, torsoH, 12);
  b.add(torso, look.top, { y: HIP + torsoH / 2, sz: 0.72 });
  // shoulders
  b.add(new THREE.SphereGeometry(w * 1.05, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), look.top, { y: NECK - 0.035, sz: 0.72, sy: 0.45 });
  // neck
  b.cyl(0.05, 0.055, 0.12, 0, NECK - 0.04, 0, look.skin, 8, { outline: false });

  if (a.includes('jacket')) {
    // white shirt peeking + open red jacket edges
    b.box(0.13, torsoH * 0.82, 0.02, 0, HIP + 0.05, w * 0.7, '#f8f4ea', { outline: false });
    b.box(0.05, 0.12, 0.02, 0, NECK - 0.18, w * 0.73, '#16141f', { outline: false, rz: 0 }); // ribbon tie
    [-1, 1].forEach((s) => b.box(0.06, torsoH * 0.9, 0.03, s * 0.09, HIP + 0.02, w * 0.72, darken(look.top, 0.15), { outline: false, rz: s * 0.08 }));
  }
  if (a.includes('cardigan')) {
    const c = new THREE.CylinderGeometry(w * 1.12, w * 1.05, torsoH * 0.95, 12, 1, true, Math.PI * 0.12, Math.PI * 1.76);
    b.add(c, look.accent, { y: HIP + torsoH / 2 - 0.02, sz: 0.76 });
  }
  if (a.includes('hoodie')) {
    b.add(new THREE.TorusGeometry(0.12, 0.05, 6, 12), look.top, { y: NECK, z: -0.05, rx: Math.PI / 2 + 0.4 });
    b.box(0.02, 0.12, 0.02, -0.04, NECK - 0.18, w * 0.72, '#ddd', { outline: false });
    b.box(0.02, 0.12, 0.02, 0.04, NECK - 0.18, w * 0.72, '#ddd', { outline: false });
  }
  if (a.includes('school')) {
    // sailor collar + bow
    b.box(0.3, 0.16, 0.02, 0, NECK - 0.17, -w * 0.72, '#f8f4ea', { rx: 0.15 });
    b.add(new THREE.ConeGeometry(0.05, 0.1, 4), look.accent, { y: NECK - 0.12, z: w * 0.75, rz: Math.PI / 2, outline: false });
    b.add(new THREE.ConeGeometry(0.05, 0.1, 4), look.accent, { y: NECK - 0.12, z: w * 0.75, rz: -Math.PI / 2, outline: false });
  }
  if (a.includes('tie')) b.box(0.04, 0.24, 0.015, 0, NECK - 0.3, w * 0.74, look.accent, { outline: false });
  if (a.includes('apron')) b.box(0.26, 0.5, 0.02, 0, HIP - 0.2, w * 0.78, a.includes('headband') ? '#2b2d42' : look.accent, { outline: false });
  if (a.includes('badge')) b.box(0.06, 0.08, 0.012, -0.08, NECK - 0.22, w * 0.76, '#ffd60a', { outline: false });
  if (a.includes('whistle')) b.sphere(0.025, 0.04, NECK - 0.16, w * 0.75, '#ffd60a', { outline: false });
  if (a.includes('shawl')) b.add(new THREE.ConeGeometry(0.28, 0.22, 12, 1, true), look.accent, { y: NECK - 0.08 });
  if (a.includes('headphonesNeck')) {
    b.add(new THREE.TorusGeometry(0.11, 0.022, 6, 16), '#14111c', { y: NECK + 0.02, rx: Math.PI / 2 + 0.25 });
    [-1, 1].forEach((s) => b.cyl(0.05, 0.05, 0.045, s * 0.11, NECK - 0.02, 0.06, '#e63946', 10, { rz: Math.PI / 2 }));
  }
  if (a.includes('backpack')) {
    b.box(0.36, 0.38, 0.24, 0, HIP + 0.05, -w * 0.72 - 0.12, look.accent);
    b.box(0.3, 0.06, 0.02, 0, HIP + 0.24, -w * 0.72 - 0.245, '#14111c', { outline: false });
  }
  if (a.includes('bag')) b.box(0.26, 0.2, 0.08, 0.27, HIP - 0.25, 0, '#3d2b1f');
  if (a.includes('beard')) { /* painted on face */ }

  // lower: skirt or pants top
  const skirt = ['bob', 'long', 'ponytail', 'twintails'].includes(look.hair) || (look.hair === 'bun' && !look.elder);
  if (look.elder && look.hair === 'bun') {
    b.add(new THREE.CylinderGeometry(w * 0.95, w * 1.55, 0.62, 14), look.bottom, { y: HIP - 0.2 });
  } else if (skirt) {
    b.add(new THREE.CylinderGeometry(w * 0.95, w * 1.75, 0.3, 14), look.bottom, { y: HIP - 0.08 });
  } else {
    b.add(new THREE.CylinderGeometry(w * 0.95, w * 1.0, 0.14, 12), look.bottom, { y: HIP - 0.02, sz: 0.8 });
  }
  return skirt;
}

function buildArm(b, look, side) {
  const len = 0.5;
  const sleeve = new THREE.CapsuleGeometry(0.055, len * 0.6, 3, 8);
  const sleeveColor = look.acc?.includes('cardigan') ? look.accent : look.top;
  b.add(sleeve, sleeveColor, { y: -len * 0.32 });
  const fore = new THREE.CapsuleGeometry(0.046, len * 0.42, 3, 8);
  b.add(fore, look.acc?.includes('visor') || look.acc?.includes('towel') ? look.skin : sleeveColor, { y: -len * 0.72, outline: true });
  b.sphere(0.055, 0, -len - 0.03, 0, look.skin);
  const a = look.acc || [];
  if (side > 0) {
    if (a.includes('mic')) {
      b.cyl(0.018, 0.024, 0.16, 0, -len - 0.1, 0.05, '#2b2d42', 8, { rx: -0.3 });
      b.sphere(0.042, 0, -len + 0.08, 0.1, '#9aa0b5');
      b.box(0.07, 0.03, 0.03, 0, -len + 0.0, 0.08, '#e63946', { outline: false, rx: -0.3 });
    }
    if (a.includes('mug')) b.cyl(0.045, 0.04, 0.09, 0, -len - 0.08, 0.06, '#ffffff', 10);
    if (a.includes('broom')) {
      b.cyl(0.015, 0.015, 1.2, 0, -len - 0.6, 0.04, '#a47148', 6);
      b.cone(0.1, 0.25, 0, -len - 0.7, 0.04, '#e9c46a', 8, { rx: Math.PI });
    }
    if (a.includes('phone')) b.box(0.05, 0.09, 0.012, 0, -len - 0.08, 0.06, '#14111c', { rx: -0.6 });
    if (a.includes('rod')) {
      b.add(new THREE.CylinderGeometry(0.012, 0.022, 2.2, 5), '#5c3d2e', { y: -len + 0.45 * 1.1, z: 0.89 * 1.1, rx: 1.1 });
      b.sphere(0.035, 0, -len - 0.08, 0.05, '#adb5bd', { outline: false });
    }
  } else {
    if (a.includes('laptop')) b.box(0.26, 0.18, 0.02, 0.0, -len * 0.55, 0.12, '#adb5bd', { rx: 0.2 });
    if (a.includes('mic')) b.box(0.09, 0.12, 0.02, 0.02, -len - 0.1, 0.05, '#fbf6ea', { rx: -0.3 }); // notebook
  }
}

function buildLeg(b, look, skirt) {
  const len = HIP - 0.06;
  const legColor = skirt ? (look.id === 'rin' ? '#1d1b2a' : look.skin) : look.bottom;
  const leg = new THREE.CapsuleGeometry(0.068, len - 0.12, 3, 8);
  b.add(leg, legColor, { y: -len / 2 + 0.02 });
  if (skirt && look.id !== 'rin') b.cyl(0.07, 0.07, 0.16, 0, -len + 0.1, 0, '#f8f4ea', 8, { outline: false });
  // shoe
  const shoeColor = look.id === 'rin' ? '#e63946' : darken(look.bottom, 0.35);
  b.add(new THREE.CapsuleGeometry(0.065, 0.1, 3, 8), shoeColor, { y: -len - 0.01, z: 0.04, rx: Math.PI / 2, sy: 1, sx: 1.05 });
  if (look.id === 'rin') b.box(0.12, 0.025, 0.2, 0, -len - 0.08, 0.04, '#ffffff', { outline: false });
}

const _tmpV = new THREE.Vector3();

export class Character {
  constructor(look, { scale = 1 } = {}) {
    this.look = look;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.scaleBase = scale * (look.height || 1);
    this.body.scale.setScalar(this.scaleBase);
    this.state = 'idle';
    this.speed = 0;
    this.t = Math.random() * 10;
    this.phase = 0;
    this.blinkT = 1 + Math.random() * 3;
    this.talking = false;
    this.talkT = 0;
    this.expr = 'neutral';
    this.exprBase = 'neutral';
    this.actionT = 0;
    this.lookTarget = null; // local-space yaw
    this.headYaw = 0;

    // hips group
    this.hips = new THREE.Group();
    this.hips.position.y = 0;
    this.body.add(this.hips);

    // torso
    const tb = new Builder();
    const skirt = buildTorso(tb, look);
    this.torso = tb.build('torso');
    this.hips.add(this.torso);

    // head
    this.head = new THREE.Group();
    this.head.position.y = HEAD_Y;
    this.hips.add(this.head);
    this.faceMats = {};
    const faceGeo = new THREE.SphereGeometry(HR, 32, 20);
    faceGeo.scale(1, 1.02, 0.98);
    this.faceMat = toonMat({ map: faceTexture(look, 'neutral') });
    this.faceMesh = new THREE.Mesh(faceGeo, this.faceMat);
    this.faceMesh.castShadow = true;
    this.head.add(this.faceMesh);
    const og = mergeVertices(faceGeo.clone().deleteAttribute('uv').deleteAttribute('normal'));
    og.computeVertexNormals();
    this.head.add(new THREE.Mesh(og, outlineMat(1.1)));
    const hb = new Builder();
    buildHair(hb, look);
    buildHeadAcc(hb, look);
    // ears
    [-1, 1].forEach((s) => hb.sphere(0.045, s * HR * 0.97, -0.02, 0, look.skin, { sx: 0.5, outline: false }));
    this.head.add(hb.build('hair'));

    // arms
    this.arms = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * (0.17 * look.build + 0.045), SHOULDER, 0);
      const b = new Builder();
      buildArm(b, look, s);
      pivot.add(b.build('arm'));
      this.hips.add(pivot);
      return pivot;
    });
    // legs
    this.legs = [-1, 1].map((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.085, HIP, 0);
      const b = new Builder();
      buildLeg(b, look, skirt);
      pivot.add(b.build('leg'));
      this.hips.add(pivot);
      return pivot;
    });

    // blob shadow
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: blobShadowTexture(), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.02;
    sh.renderOrder = 1;
    this.shadow = sh;
    this.root.add(sh);

    this.root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
  }

  setExpression(e) {
    if (this.expr === e) return;
    this.expr = e;
    this.faceMat.map = faceTexture(this.look, e);
    this.faceMat.needsUpdate = true;
  }

  play(action, dur = 1.2) {
    this.action = action;
    this.actionT = dur;
    this.actionDur = dur;
  }

  update(dt) {
    this.t += dt;
    const t = this.t;
    const sp = this.speed; // 0 idle, 1 walk, 2 run
    const amp = Math.min(sp, 1.6);
    this.phase += dt * (5 + sp * 4.2) * (sp > 0.05 ? 1 : 0);
    const ph = this.phase;
    const L = this.legs, A = this.arms;

    // base pose
    let bob = 0, lean = 0;
    L[0].rotation.x = Math.sin(ph) * 0.6 * amp;
    L[1].rotation.x = -Math.sin(ph) * 0.6 * amp;
    A[0].rotation.x = -Math.sin(ph) * 0.55 * amp;
    A[1].rotation.x = Math.sin(ph) * 0.55 * amp;
    A[0].rotation.z = -0.12 - amp * 0.05;
    A[1].rotation.z = 0.12 + amp * 0.05;
    bob = Math.abs(Math.sin(ph)) * 0.05 * amp;
    lean = amp * 0.12;
    const breathe = Math.sin(t * 2.1) * 0.012 * (1 - Math.min(amp, 1));
    this.torso.scale.y = 1 + breathe;
    this.head.position.y = HEAD_Y + breathe * 0.8;
    this.head.rotation.z = Math.sin(t * 0.9) * 0.04 * (1 - Math.min(amp, 1));

    if (this.look.acc?.includes('mic') && amp < 0.3) {
      A[1].rotation.x = -0.45;
      A[1].rotation.z = 0.25;
    }

    // talking
    if (this.talking) {
      this.talkT += dt;
      const open = Math.sin(this.talkT * 18) > 0.1;
      this.setExpression(open ? 'talk' : this.exprBase);
      this.head.rotation.x = Math.sin(this.talkT * 5) * 0.06;
      A[0].rotation.x += Math.sin(this.talkT * 3.3) * 0.25 - 0.2;
      A[0].rotation.z -= 0.15;
    } else {
      this.head.rotation.x *= 0.9;
      // blink
      this.blinkT -= dt;
      if (this.blinkT < 0) {
        this.setExpression('blink');
        if (this.blinkT < -0.12) { this.blinkT = 2 + Math.random() * 3.5; this.setExpression(this.exprBase); }
      } else if (this.expr !== this.exprBase && this.expr !== 'blink') this.setExpression(this.exprBase);
    }

    // one-shot actions
    if (this.actionT > 0) {
      this.actionT -= dt;
      const k = 1 - this.actionT / this.actionDur;
      const env = Math.sin(Math.min(k, 1) * Math.PI);
      switch (this.action) {
        case 'wave':
          A[1].rotation.z = 0.2 + env * 2.4;
          A[1].rotation.x = -0.2;
          A[1].rotation.y = Math.sin(t * 14) * 0.4 * env;
          break;
        case 'cheer':
          A[0].rotation.z = -0.2 - env * 2.6;
          A[1].rotation.z = 0.2 + env * 2.6;
          bob += Math.abs(Math.sin(k * Math.PI * 2)) * 0.35 * env;
          break;
        case 'write':
          A[0].rotation.x = -1.1 * env;
          A[0].rotation.z = 0.3 * env;
          A[1].rotation.x = -1.0 * env + Math.sin(t * 22) * 0.05;
          A[1].rotation.z = -0.25 * env;
          this.head.rotation.x = 0.35 * env;
          break;
        case 'nod':
          this.head.rotation.x = Math.sin(k * Math.PI * 4) * 0.2;
          break;
        case 'jump':
          bob += Math.sin(Math.min(k, 1) * Math.PI) * 0.9;
          L[0].rotation.x = -0.5 * env; L[1].rotation.x = 0.3 * env;
          A[0].rotation.z = -0.8 * env; A[1].rotation.z = 0.8 * env;
          break;
        case 'pet':
          A[1].rotation.x = -1.2 * env + Math.sin(t * 10) * 0.15 * env;
          lean += 0.35 * env;
          break;
        case 'think':
          A[1].rotation.x = -1.9 * env; A[1].rotation.z = -0.6 * env;
          this.head.rotation.z = 0.15 * env;
          break;
        case 'stretch':
          A[0].rotation.z = -2.8 * env; A[1].rotation.z = 2.8 * env;
          this.torso.scale.y = 1 + 0.04 * env;
          break;
      }
      if (this.actionT <= 0) this.action = null;
    }
    if (this.state === 'sit') {
      L[0].rotation.x = -1.5; L[1].rotation.x = -1.5;
      bob = -0.36;
      lean = -0.05;
    }

    // head yaw toward target
    const targetYaw = this.lookYaw ?? 0;
    this.headYaw += (THREE.MathUtils.clamp(targetYaw, -1.0, 1.0) - this.headYaw) * Math.min(1, dt * 6);
    this.head.rotation.y = this.headYaw;

    this.hips.position.y = bob;
    this.hips.rotation.x = lean;
    // squash/stretch on landing
    if (this.squash) {
      this.squash = Math.max(0, this.squash - dt * 4);
      const s = Math.sin(this.squash * Math.PI) * 0.12;
      this.body.scale.set(this.scaleBase * (1 + s), this.scaleBase * (1 - s), this.scaleBase * (1 + s));
    }
    this.shadow.scale.setScalar(1 - Math.min(bob, 0.8) * 0.5);
  }
}

// Townsfolk generator
const SKINS = ['#f9dcc8', '#f1c7a5', '#e0a882', '#c68c5a', '#8d5524', '#f3d0b5'];
const HAIRS = ['short', 'bob', 'long', 'ponytail', 'bun', 'spiky', 'messy', 'twintails'];
const HAIRCOL = ['#1b1b1f', '#3b2a20', '#6b3e26', '#a0522d', '#d9a441', '#2d3a64', '#7a2a44', '#cfcfcf'];
const TOPS = ['#f4a261', '#2a9d8f', '#e9c46a', '#264653', '#e76f51', '#8ecae6', '#ffb4a2', '#6d597a', '#b5e48c', '#ffffff'];
const BOTS = ['#2b2d42', '#3d405b', '#6c584c', '#1d3557', '#5f0f40', '#495057'];
export function randomLook(rnd, id) {
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const hair = pick(HAIRS);
  return {
    id, skin: pick(SKINS), hair, hairColor: pick(HAIRCOL), top: pick(TOPS), bottom: pick(BOTS), accent: pick(TOPS),
    acc: rnd() < 0.3 ? ['glasses'] : rnd() < 0.3 ? ['bag'] : rnd() < 0.2 ? ['cap'] : [],
    height: 0.9 + rnd() * 0.15, build: 0.9 + rnd() * 0.25, eye: pick(['#3d2b1f', '#2a9d8f', '#457b9d', '#6b3e26', '#22223b']),
  };
}
