import * as THREE from 'three';
import { R, DEG, dirFromLatLon, surfacePoint, basisMatrix, heightAt, groundAt, forwardFromHeading, eastAt } from './sphere.js';
import { createPlanet, createSea } from './planet.js';
import { buildDistricts, Site } from './districts.js';
import { worldMats, OUTLINE, toonMat, outlineMat } from './toon.js';
import { loadFonts, cloudTexture, dotTexture, petalTexture, mulberry } from './textures.js';
import { Character } from './characters.js';
import { Builder } from './builder.js';
import { DISTRICTS } from '../data/story.js';

export const TIMES = {
  morning: { top: '#6fb8ec', mid: '#a9d8f5', bot: '#ffe3c8', sun: '#fff0d4', sunI: 2.3, hemiSky: '#cfe8ff', hemiGround: '#8a7a6a', hemiI: 1.15, elev: 32, glow: 0.85, stars: 0, ink: '#1d1a2b', sea: 1.0, beam: 0 },
  noon: { top: '#2f9bf0', mid: '#79c3f7', bot: '#d5f0ff', sun: '#ffffff', sunI: 2.6, hemiSky: '#d6eeff', hemiGround: '#7c8a6a', hemiI: 1.2, elev: 68, glow: 0.8, stars: 0, ink: '#1a1826', sea: 1.05, beam: 0 },
  afternoon: { top: '#4f8fd9', mid: '#9cc5ea', bot: '#ffd9a6', sun: '#ffe2b0', sunI: 2.3, hemiSky: '#ffe7c4', hemiGround: '#7a6a5a', hemiI: 1.1, elev: 36, glow: 0.9, stars: 0, ink: '#221a26', sea: 1.0, beam: 0 },
  dusk: { top: '#2d2366', mid: '#c2457a', bot: '#ffa463', sun: '#ff9c6e', sunI: 1.9, hemiSky: '#ff9fb1', hemiGround: '#3d2b4f', hemiI: 0.95, elev: 14, glow: 1.25, stars: 0.25, ink: '#1b1030', sea: 0.85, beam: 0.6 },
  night: { top: '#050824', mid: '#141a4a', bot: '#3a2f6e', sun: '#b4c2ff', sunI: 1.35, hemiSky: '#6a7ad0', hemiGround: '#2a2050', hemiI: 0.95, elev: 40, glow: 1.6, stars: 1, ink: '#07050f', sea: 0.6, beam: 1 },
};

const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpM = new THREE.Matrix4();

export class World {
  constructor(scene, { quality = 'high' } = {}) {
    this.scene = scene;
    this.quality = quality;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.boxes = [];
    this.circles = [];
    this.interacts = [];
    this.landmarks = {};
    this.flags = [];
    this.fountains = [];
    this.spinners = [];
    this.swings = [];
    this.petalSources = [];
    this.steamSources = [];
    this.trashSpots = [];
    this.chunks = [];
    this.characters = [];
    this.time = 0;
    this.focus = new THREE.Vector3(0, 1, 0);
    this.timeKey = 'morning';
    this.cur = JSON.parse(JSON.stringify(TIMES.morning));
    this.target = TIMES.morning;
  }

  async build(onProgress = () => {}) {
    await loadFonts();
    onProgress(0.15);
    this.planet = createPlanet();
    this.root.add(this.planet);
    this.sea = createSea();
    this.root.add(this.sea);
    onProgress(0.3);
    await tick();
    buildDistricts(this);
    onProgress(0.65);
    await tick();
    this.buildSky();
    this.buildLights();
    this.buildAnimated();
    onProgress(0.85);
    await tick();
    this.setTime('morning', true);
    onProgress(1);
  }

  // ---------- registration API used by districts ----------
  addChunk(g) { this.root.add(g); this.chunks.push(g); }
  addSign(m, tex, { x, y, z, ry, w, h, glow, double }) {
    const mat = glow ? new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, side: double ? THREE.DoubleSide : THREE.FrontSide }) : toonMat({ map: tex, side: double ? THREE.DoubleSide : THREE.FrontSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    const local = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    mesh.matrixAutoUpdate = false;
    mesh.matrix.copy(m).multiply(local);
    mesh.matrixWorldNeedsUpdate = true;
    if (glow) this.glowSigns = (this.glowSigns || []).concat(mat);
    this.root.add(mesh);
    return mesh;
  }
  addBox(d, f, hx, hz, ox = 0, oz = 0, h = 1) {
    const r = new THREE.Vector3().crossVectors(d, f).normalize();
    this.boxes.push({ c: d.clone(), r, f: f.clone(), hx, hz, ox, oz, h: h + heightAt(d), reach: Math.cos((Math.hypot(hx, hz) + Math.hypot(ox, oz) + 3) / R) });
  }
  addCircle(d, r, h = 0) { this.circles.push({ c: d.clone(), r, h: h ? h + heightAt(d) : 0, reach: Math.cos((r + 3) / R) }); }

  // Is a world-space point inside something tall? Used to keep the camera out of buildings.
  occluded(p) {
    const len = p.length();
    const d = tmpV2.copy(p).divideScalar(len);
    const alt = len - R;
    for (const b of this.boxes) {
      if (alt > b.h || d.dot(b.c) < b.reach) continue;
      const q = tmpV.copy(d).multiplyScalar(R / d.dot(b.c)).addScaledVector(b.c, -R);
      const lx = q.dot(b.r) - b.ox, lz = q.dot(b.f) - b.oz;
      if (Math.abs(lx) < b.hx + 0.3 && Math.abs(lz) < b.hz + 0.3) return true;
    }
    for (const c of this.circles) {
      if (!c.h || alt > c.h || d.dot(c.c) < c.reach) continue;
      if (Math.acos(Math.min(1, d.dot(c.c))) * R < c.r + 0.6) return true;
    }
    return false;
  }
  addInteract(kind, d, radius, data = {}) { this.interacts.push({ kind, d: d.clone(), radius, ...data }); }

  blocked(d, rad) {
    for (const c of this.circles) if (d.dot(c.c) > c.reach) { if (Math.acos(Math.min(1, d.dot(c.c))) * R < c.r + rad) return true; }
    for (const b of this.boxes) {
      if (d.dot(b.c) < b.reach) continue;
      const q = tmpV.copy(d).multiplyScalar(R / d.dot(b.c)).addScaledVector(b.c, -R);
      const lx = q.dot(b.r) - b.ox, lz = q.dot(b.f) - b.oz;
      if (Math.abs(lx) < b.hx + rad && Math.abs(lz) < b.hz + rad) return true;
    }
    return false;
  }

  // Push a position (unit dir) out of colliders. Returns corrected dir.
  resolve(d, rad = 0.35) {
    for (let iter = 0; iter < 2; iter++) {
      for (const c of this.circles) {
        if (d.dot(c.c) < c.reach) continue;
        const q = tmpV.copy(d).multiplyScalar(R / d.dot(c.c)).addScaledVector(c.c, -R);
        const dist = q.length();
        const min = c.r + rad;
        if (dist < min && dist > 1e-5) {
          q.multiplyScalar(min / dist);
          d.copy(c.c).multiplyScalar(R).add(q).normalize();
        }
      }
      for (const b of this.boxes) {
        if (d.dot(b.c) < b.reach) continue;
        const q = tmpV.copy(d).multiplyScalar(R / d.dot(b.c)).addScaledVector(b.c, -R);
        let lx = q.dot(b.r) - b.ox, lz = q.dot(b.f) - b.oz;
        const ex = b.hx + rad, ez = b.hz + rad;
        if (Math.abs(lx) < ex && Math.abs(lz) < ez) {
          const px = ex - Math.abs(lx), pz = ez - Math.abs(lz);
          if (px < pz) lx = Math.sign(lx || 1) * ex; else lz = Math.sign(lz || 1) * ez;
          d.copy(b.c).multiplyScalar(R).addScaledVector(b.r, lx + b.ox).addScaledVector(b.f, lz + b.oz).normalize();
        }
      }
    }
    return d;
  }

  districtSite(id) {
    const dd = DISTRICTS.find((x) => x.id === id);
    return new Site(this, dd.lat, dd.lon);
  }

  // ---------- characters ----------
  spawn(look, d, f) {
    const c = new Character(look);
    c.dir = d.clone();
    c.fwd = f.clone();
    this.place(c.root, c.dir, c.fwd, 0);
    this.root.add(c.root);
    this.characters.push(c);
    return c;
  }
  place(obj, d, f, lift = 0) {
    const g = groundAt(d);
    const h = g === null ? heightAt(d) : g;
    tmpV.copy(d).multiplyScalar(R + h + lift);
    const right = tmpV2.crossVectors(d, f).normalize();
    const ff = new THREE.Vector3().crossVectors(right, d).normalize();
    tmpM.makeBasis(right, d, ff);
    obj.quaternion.setFromRotationMatrix(tmpM);
    obj.position.copy(tmpV);
  }

  // ---------- sky ----------
  buildSky() {
    const geo = new THREE.SphereGeometry(420, 32, 16);
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color() }, uMid: { value: new THREE.Color() }, uBot: { value: new THREE.Color() },
        uUp: { value: new THREE.Vector3(0, 1, 0) }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() },
        uStars: { value: 0 }, uTime: { value: 0 },
      },
      vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }`,
      fragmentShader: `
        uniform vec3 uTop, uMid, uBot, uUp, uSun, uSunCol; uniform float uStars, uTime;
        varying vec3 vD;
        float h(vec3 p){ p = fract(p*0.3183099+0.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        void main(){
          vec3 d = normalize(vD);
          float y = dot(d, uUp);
          vec3 col = y > 0.15 ? mix(uMid, uTop, smoothstep(0.15, 0.85, y)) : mix(uBot, uMid, smoothstep(-0.35, 0.15, y));
          // sun / moon disc with toon halo
          float s = dot(d, normalize(uSun));
          col = mix(col, uSunCol, smoothstep(0.985, 0.99, s) * 0.9 + smoothstep(0.93, 0.985, s) * 0.18);
          // stars
          if (uStars > 0.0) {
            vec3 cell = floor(d * 160.0);
            float r = h(cell);
            if (r > 0.992) {
              vec3 local = fract(d * 160.0) - 0.5;
              float tw = 0.6 + 0.4 * sin(uTime * 2.0 + r * 100.0);
              col += vec3(1.0, 0.95, 0.85) * smoothstep(0.2, 0.0, length(local)) * uStars * tw * smoothstep(0.0, 0.3, y + 0.2);
            }
          }
          // halftone dots near the horizon, Persona-adjacent pop
          vec2 sp = gl_FragCoord.xy / 6.0;
          float dotm = length(fract(sp) - 0.5);
          float band = smoothstep(0.25, -0.05, y) * smoothstep(-0.5, -0.1, y);
          col = mix(col, col * 0.86, step(dotm, 0.32 * band));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(geo, this.skyMat);
    this.sky.frustumCulled = false;
    this.sky.renderOrder = -10;
    this.scene.add(this.sky);

    // clouds
    this.clouds = new THREE.Group();
    const rnd = mulberry(99);
    const texes = [1, 2, 3, 4].map((s) => cloudTexture(s * 17));
    this.cloudMats = [];
    for (let i = 0; i < 22; i++) {
      const mat = new THREE.SpriteMaterial({ map: texes[i % 4], transparent: true, depthWrite: false, fog: false });
      this.cloudMats.push(mat);
      const sp = new THREE.Sprite(mat);
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, s = Math.sqrt(1 - u * u);
      const d = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th));
      sp.position.copy(d).multiplyScalar(R + 26 + rnd() * 18);
      const sc = 16 + rnd() * 14;
      sp.scale.set(sc, sc * 0.5, 1);
      this.clouds.add(sp);
    }
    this.root.add(this.clouds);
  }

  buildLights() {
    this.hemi = new THREE.HemisphereLight('#cfe8ff', '#8a7a6a', 1.1);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 2.4);
    this.sun.castShadow = this.quality !== 'low';
    const s = this.sun.shadow;
    s.mapSize.set(this.quality === 'high' ? 2048 : 1024, this.quality === 'high' ? 2048 : 1024);
    s.camera.left = -22; s.camera.right = 22; s.camera.top = 22; s.camera.bottom = -22;
    s.camera.near = 1; s.camera.far = 120;
    s.bias = -0.0012; s.normalBias = 0.09;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
  }

  buildAnimated() {
    const mats = worldMats();
    // spinning star
    this.spinMeshes = this.spinners.map((sp) => {
      const star = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.28 : 0.65; const a = (i / 10) * Math.PI * 2; star[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r); }
      const g = new THREE.ExtrudeGeometry(star, { depth: 0.18, bevelEnabled: false });
      g.translate(0, 0, -0.09);
      const mesh = new THREE.Mesh(g, toonMat({ color: '#ffd60a', emissive: '#7a5a00', emissiveIntensity: 0.3 }));
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      holder.matrix.copy(sp.m);
      mesh.position.y = sp.y + 0.6;
      holder.add(mesh);
      this.root.add(holder);
      return mesh;
    });

    // fountain particles
    this.fountainPts = this.fountains.map((m) => {
      const n = 90;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const seeds = new Float32Array(n);
      for (let i = 0; i < n; i++) seeds[i] = Math.random();
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.22, map: dotTexture(), transparent: true, depthWrite: false, color: '#bdf3ff', toneMapped: false }));
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false; holder.matrix.copy(m);
      holder.add(pts); this.root.add(holder);
      pts.frustumCulled = false;
      return { pts, seeds };
    });

    // petals
    this.petals = this.petalSources.map((d) => {
      const n = 70;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const seeds = new Float32Array(n * 3);
      for (let i = 0; i < n * 3; i++) seeds[i] = Math.random();
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, map: petalTexture(), transparent: true, depthWrite: false, alphaTest: 0.2 }));
      const holder = new THREE.Group();
      holder.matrixAutoUpdate = false;
      holder.matrix.copy(basisMatrix(d, eastAt(d), surfacePoint(d)));
      holder.add(pts); this.root.add(holder);
      pts.frustumCulled = false;
      return { pts, seeds };
    });

    // steam
    this.steam = this.steamSources.map((s) => {
      const n = 24;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const seeds = new Float32Array(n); for (let i = 0; i < n; i++) seeds[i] = Math.random();
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.6, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.35, color: '#ffffff' }));
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(s.m);
      holder.add(pts); this.root.add(holder); pts.frustumCulled = false;
      return { pts, seeds, s };
    });

    // flags (cloth)
    this.flagMeshes = this.flags.map((fl) => {
      const g = new THREE.PlaneGeometry(1.2, 0.75, 8, 3);
      g.translate(0.6, 0, 0);
      const mesh = new THREE.Mesh(g, toonMat({ color: fl.color, side: THREE.DoubleSide }));
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(fl.m);
      mesh.position.set(fl.x, fl.h - 0.4, fl.z);
      holder.add(mesh); this.root.add(holder);
      return { mesh, base: g.attributes.position.array.slice() };
    });

    // swings
    this.swingSeats = [];
    this.swings.forEach((sw) => {
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(sw.m); this.root.add(holder);
      sw.xs.forEach((x, i) => {
        const piv = new THREE.Group(); piv.position.set(x, sw.y, 0);
        const b = new Builder();
        b.box(0.04, 1.9, 0.04, -0.22, -1.9, 0, '#adb5bd', { outline: false });
        b.box(0.04, 1.9, 0.04, 0.22, -1.9, 0, '#adb5bd', { outline: false });
        b.box(0.55, 0.06, 0.3, 0, -1.95, 0, i ? '#ffd60a' : '#3a86ff');
        piv.add(b.build('swing'));
        holder.add(piv);
        this.swingSeats.push({ piv, off: i * 1.3 });
      });
    });

    // train
    if (this.trainCircle) {
      this.train = [];
      const colors = ['#ffffff', '#ffffff', '#ffffff'];
      for (let i = 0; i < 3; i++) {
        const b = new Builder();
        b.box(1.5, 1.5, 3.4, 0, 0.05, 0, colors[i]);
        b.box(1.52, 0.25, 3.42, 0, 0.45, 0, '#e63946', { outline: false });
        for (let k = 0; k < 4; k++) { b.box(0.02, 0.45, 0.55, 0.76, 0.8, -1.2 + k * 0.8, '#bde0fe', { glow: true }); b.box(0.02, 0.45, 0.55, -0.76, 0.8, -1.2 + k * 0.8, '#bde0fe', { glow: true }); }
        if (i === 0) { b.box(1.3, 0.5, 0.02, 0, 0.9, 1.71, '#bde0fe', { glow: true }); b.box(0.3, 0.15, 0.02, 0, 0.3, 1.72, '#fff3b0', { glow: true }); }
        b.box(1.6, 0.12, 3.5, 0, 1.55, 0, '#adb5bd', { outline: false });
        const g = b.build('car');
        this.root.add(g);
        this.train.push(g);
      }
    }

    // lighthouse beam
    if (this.lighthouse) {
      const holder = new THREE.Group(); holder.matrixAutoUpdate = false; holder.matrix.copy(this.lighthouse.m); this.root.add(holder);
      const cone = new THREE.ConeGeometry(2.2, 16, 16, 1, true);
      cone.translate(0, -8, 0); cone.rotateZ(Math.PI / 2);
      this.beamMat = new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(cone, this.beamMat);
      const piv = new THREE.Group(); piv.position.y = this.lighthouse.y; piv.add(beam);
      holder.add(piv);
      this.beam = piv;
    }

    // boat
    if (this.boat) {
      const b = new Builder();
      b.box(1.4, 0.6, 3.2, 0, -0.2, 0, '#ffffff');
      b.box(1.42, 0.15, 3.22, 0, 0.25, 0, '#e63946', { outline: false });
      b.box(1.0, 0.9, 1.0, 0, 0.4, -0.5, '#457b9d');
      b.cone(0.72, 1.0, 0, -0.2, 1.9, '#ffffff', 4, { rx: Math.PI / 2, ry: Math.PI / 4 });
      this.boatMesh = b.build('boat');
      this.root.add(this.boatMesh);
      this.boatF = forwardFromHeading(this.boat.d, 40);
    }

    // birds
    this.birds = [];
    const birdMat = new THREE.MeshBasicMaterial({ color: '#14111c', side: THREE.DoubleSide });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0.15, -0.5, 0.1, -0.1, 0, 0, -0.1, 0, 0, 0.15, 0.5, 0.1, -0.1, 0, 0, -0.1]), 3));
      const m = new THREE.Mesh(g, birdMat);
      m.userData = { off: i * 0.25, lane: (i % 3) * 0.04, ph: Math.random() * 6 };
      this.root.add(m);
      this.birds.push(m);
    }
    this.birdAxis = new THREE.Vector3(0.3, 1, 0.2).normalize();
  }

  // ---------- time of day ----------
  setTime(key, instant = false) {
    this.timeKey = key;
    this.target = TIMES[key];
    if (instant) this.cur = JSON.parse(JSON.stringify(this.target));
    this.applyTime(instant ? 1 : 0);
  }
  applyTime(k) {
    const c = this.cur, t = this.target;
    const lerpCol = (a, b) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), k).getHexString();
    for (const key of Object.keys(t)) {
      if (typeof t[key] === 'string') c[key] = lerpCol(c[key], t[key]);
      else c[key] += (t[key] - c[key]) * k;
    }
    this.skyMat.uniforms.uTop.value.set(c.top);
    this.skyMat.uniforms.uMid.value.set(c.mid);
    this.skyMat.uniforms.uBot.value.set(c.bot);
    this.skyMat.uniforms.uSunCol.value.set(c.sun);
    this.skyMat.uniforms.uStars.value = c.stars;
    this.sun.color.set(c.sun);
    this.sun.intensity = c.sunI;
    this.hemi.color.set(c.hemiSky);
    this.hemi.groundColor.set(c.hemiGround);
    this.hemi.intensity = c.hemiI;
    worldMats().glow.color.setScalar(c.glow);
    (this.glowSigns || []).forEach((m) => m.color.setScalar(Math.min(1.25, c.glow)));
    OUTLINE.uInk.value.set(c.ink);
    this.sea.material.uniforms.uLight.value = c.sea;
    if (this.beamMat) this.beamMat.opacity = c.beam * 0.22;
    const cloudTint = new THREE.Color(c.bot).lerp(new THREE.Color('#ffffff'), 0.55);
    this.cloudMats.forEach((m) => m.color.copy(cloudTint));
  }

  // ---------- per-frame ----------
  update(dt, focusDir, camera) {
    this.time += dt;
    const t = this.time;
    this.applyTime(Math.min(1, dt * 1.5));
    if (focusDir) this.focus.copy(focusDir);
    const up = this.focus;

    // light follows the player so the local town is always lit
    const ref = tmpV.set(0.35, 0.25, 1).normalize();
    const tang = tmpV2.crossVectors(up, ref).normalize();
    const e = this.cur.elev * DEG;
    const ld = new THREE.Vector3().copy(up).multiplyScalar(Math.sin(e)).addScaledVector(tang, Math.cos(e)).normalize();
    const fp = up.clone().multiplyScalar(R);
    this.sun.position.copy(fp).addScaledVector(ld, 50);
    this.sun.target.position.copy(fp);
    this.sun.target.updateMatrixWorld();
    this.skyMat.uniforms.uSun.value.copy(ld);
    this.skyMat.uniforms.uUp.value.copy(camera ? camera.up : up);
    this.skyMat.uniforms.uTime.value = t;
    if (camera) this.sky.position.copy(camera.position);
    this.sea.material.uniforms.uTime.value = t;

    this.clouds.rotation.y = t * 0.01;
    if (camera) {
      for (const sp of this.clouds.children) {
        sp.getWorldPosition(tmpV);
        const dist = tmpV.distanceTo(camera.position);
        sp.material.opacity = THREE.MathUtils.smoothstep(dist, 18, 48);
      }
    }
    this.spinMeshes.forEach((m) => { m.rotation.y = t * 1.2; m.position.y = 3.15 + Math.sin(t * 2) * 0.1; });

    // fountain
    this.fountainPts.forEach(({ pts, seeds }) => {
      const a = pts.geometry.attributes.position.array;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const life = (t * 0.6 + s) % 1;
        const ang = s * Math.PI * 2 * 7.0;
        const r = 0.2 + life * 1.5;
        a[i * 3] = Math.cos(ang) * r;
        a[i * 3 + 1] = 2.0 + life * 2.2 - life * life * 3.4;
        a[i * 3 + 2] = Math.sin(ang) * r;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    });
    // petals
    this.petals.forEach(({ pts, seeds }) => {
      const a = pts.geometry.attributes.position.array;
      const n = seeds.length / 3;
      for (let i = 0; i < n; i++) {
        const life = (t * 0.08 + seeds[i * 3]) % 1;
        a[i * 3] = (seeds[i * 3 + 1] - 0.5) * 12 + Math.sin(t + i) * 0.6 + life * 3;
        a[i * 3 + 1] = 6 - life * 6;
        a[i * 3 + 2] = (seeds[i * 3 + 2] - 0.5) * 12 + Math.cos(t * 0.7 + i) * 0.6;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    });
    this.steam.forEach(({ pts, seeds, s }) => {
      const a = pts.geometry.attributes.position.array;
      for (let i = 0; i < seeds.length; i++) {
        const life = (t * 0.5 + seeds[i]) % 1;
        a[i * 3] = s.x + Math.sin(t * 2 + i) * 0.15 * life;
        a[i * 3 + 1] = s.y + life * 2.2;
        a[i * 3 + 2] = s.z + Math.cos(t * 1.5 + i) * 0.15 * life;
      }
      pts.geometry.attributes.position.needsUpdate = true;
    });
    // flags
    this.flagMeshes.forEach(({ mesh, base }) => {
      const a = mesh.geometry.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const x = base[i];
        a[i + 2] = Math.sin(x * 4 - t * 6) * 0.12 * x;
        a[i + 1] = base[i + 1] + Math.sin(x * 3 - t * 5) * 0.04 * x;
      }
      mesh.geometry.attributes.position.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    });
    this.swingSeats.forEach(({ piv, off }) => { piv.rotation.x = Math.sin(t * 1.8 + off) * 0.45; });

    // train
    if (this.train) {
      const tc = this.trainCircle;
      this.train.forEach((car, i) => {
        const a = t * 0.045 - i * (3.7 / (R + tc.h));
        const d = tmpV.copy(tc.a).multiplyScalar(Math.cos(a)).addScaledVector(tc.b, Math.sin(a));
        const f = tmpV2.copy(tc.a).multiplyScalar(-Math.sin(a)).addScaledVector(tc.b, Math.cos(a));
        const m = basisMatrix(d, f, d.clone().multiplyScalar(R + tc.h + 0.1));
        car.matrixAutoUpdate = false;
        car.matrix.copy(m);
      });
    }
    if (this.beam) this.beam.rotation.y = t * 0.8;
    if (this.boatMesh) {
      const d = this.boat.d;
      const m = basisMatrix(d, this.boatF, d.clone().multiplyScalar(R - 0.45 + Math.sin(t * 1.4) * 0.08));
      m.multiply(new THREE.Matrix4().makeRotationZ(Math.sin(t * 1.1) * 0.06));
      this.boatMesh.matrixAutoUpdate = false;
      this.boatMesh.matrix.copy(m);
    }
    // birds circle around the planet
    this.birds.forEach((bm) => {
      const u = bm.userData;
      const a = t * 0.08 + u.off * 0.06;
      const axis = this.birdAxis;
      const base = tmpV.set(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), u.lane).normalize();
      const d = base.clone().applyAxisAngle(axis, a).normalize();
      const f = new THREE.Vector3().crossVectors(axis, d).normalize();
      const p = d.clone().multiplyScalar(R + 13 + Math.sin(t + u.ph) * 0.6 + u.off * 0.6);
      p.addScaledVector(new THREE.Vector3().crossVectors(d, f), Math.sin(u.off * 9) * 1.2);
      const m = basisMatrix(d, f, p);
      bm.matrixAutoUpdate = false;
      const flap = Math.sin(t * 9 + u.ph) * 0.5;
      bm.matrix.copy(m).multiply(new THREE.Matrix4().makeScale(1.4, 1 + flap, 1.4));
    });

    // cull characters beyond the horizon
    for (const c of this.characters) {
      c.root.visible = c.dir.dot(up) > 0.25 || c.alwaysVisible;
    }
  }
}

function tick() { return new Promise((r) => setTimeout(r, 0)); }
