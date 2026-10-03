import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { worldMats } from './toon.js';

const _c = new THREE.Color();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

// Collects primitives with baked vertex colors and merges them into a handful of meshes.
export class Builder {
  constructor() {
    this.stack = [new THREE.Matrix4()];
    this.toon = [];
    this.glow = [];
    this.lines = [];
  }
  get m() { return this.stack[this.stack.length - 1]; }
  push(mat) { this.stack.push(this.m.clone().multiply(mat)); return this; }
  at(x = 0, y = 0, z = 0, ry = 0, s = 1, rx = 0, rz = 0) {
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _s.set(s, s, s);
    _p.set(x, y, z);
    return this.push(_m.compose(_p, _q, _s));
  }
  pop() { this.stack.pop(); return this; }

  add(geo, color, { glow = false, outline = true, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1 } = {}) {
    const src = geo;
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.deleteAttribute('uv');
    if (g.attributes.uv1) g.deleteAttribute('uv1');
    _e.set(rx, ry, rz);
    _q.setFromEuler(_e);
    _s.set(sx, sy, sz);
    _p.set(x, y, z);
    const local = new THREE.Matrix4().compose(_p, _q, _s);
    const full = this.m.clone().multiply(local);
    g.applyMatrix4(full);
    _c.set(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    (glow ? this.glow : this.toon).push(g);
    if (outline && !glow) {
      const o = new THREE.BufferGeometry();
      o.setAttribute('position', src.attributes.position.clone());
      if (src.index) o.setIndex(src.index.clone());
      let om = mergeVertices(o, 1e-3);
      om.computeVertexNormals();
      om.applyMatrix4(full);
      om = om.index ? om.toNonIndexed() : om;
      this.lines.push(om);
    }
    return this;
  }

  // Convenience primitives. Boxes sit on y (base at y).
  box(w, h, d, x, y, z, color, o = {}) {
    return this.add(new THREE.BoxGeometry(w, h, d), color, { x, y: y + h / 2, z, ...o });
  }
  cyl(rt, rb, h, x, y, z, color, seg = 10, o = {}) {
    return this.add(new THREE.CylinderGeometry(rt, rb, h, seg), color, { x, y: y + h / 2, z, ...o });
  }
  cone(r, h, x, y, z, color, seg = 10, o = {}) {
    return this.add(new THREE.ConeGeometry(r, h, seg), color, { x, y: y + h / 2, z, ...o });
  }
  sphere(r, x, y, z, color, o = {}) {
    return this.add(new THREE.SphereGeometry(r, 12, 9), color, { x, y, z, ...o });
  }
  ico(r, x, y, z, color, detail = 1, o = {}) {
    return this.add(new THREE.IcosahedronGeometry(r, detail), color, { x, y, z, ...o });
  }
  tube(points, radius, color, o = {}) {
    const curve = new THREE.CatmullRomCurve3(points);
    return this.add(new THREE.TubeGeometry(curve, Math.max(6, points.length * 4), radius, 4, false), color, { outline: false, ...o });
  }

  build(name = 'chunk') {
    const group = new THREE.Group();
    group.name = name;
    const mats = worldMats();
    const make = (arr, mat, opts = {}) => {
      if (!arr.length) return null;
      const g = mergeGeometries(arr, false);
      g.computeBoundingSphere();
      const mesh = new THREE.Mesh(g, mat);
      Object.assign(mesh, opts);
      group.add(mesh);
      arr.forEach((a) => a.dispose());
      return mesh;
    };
    const t = make(this.toon, mats.toon, { castShadow: true, receiveShadow: true });
    make(this.glow, mats.glow);
    make(this.lines, mats.outline);
    if (t) group.userData.bounds = t.geometry.boundingSphere;
    this.toon = []; this.glow = []; this.lines = [];
    return group;
  }
}
