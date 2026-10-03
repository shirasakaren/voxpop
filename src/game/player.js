import * as THREE from 'three';
import { R, groundAt, heightAt, DEG } from '../world/sphere.js';
import { Character, RIN_LOOK } from '../world/characters.js';
import { audio } from '../shared/audio.js';
import { dotTexture } from '../world/textures.js';

const _q = new THREE.Quaternion();
const _axis = new THREE.Vector3();
const _v = new THREE.Vector3();

export class Player {
  constructor(world, dir, fwd) {
    this.world = world;
    this.char = world.spawn({ ...RIN_LOOK }, dir, fwd);
    this.char.alwaysVisible = true;
    this.dir = this.char.dir; // shared reference
    this.fwd = this.char.fwd;
    this.camF = fwd.clone(); // camera heading tangent
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.y = 0; this.vy = 0; this.grounded = true;
    this.stepT = 0;
    this.frozen = false;
    this.height = groundAt(dir) ?? 0;

    // footstep dust
    const n = 40;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.dust = { pts: new THREE.Points(g, new THREE.PointsMaterial({ size: 0.35, map: dotTexture(), transparent: true, depthWrite: false, opacity: 0.55, color: '#fff8ea' })), life: new Float32Array(n), vel: new Float32Array(n * 3), i: 0 };
    this.dust.pts.frustumCulled = false;
    world.root.add(this.dust.pts);
  }

  get pos() { return this.char.root.position; }
  get up() { return this.dir; }

  jump() {
    if (!this.grounded || this.frozen) return;
    this.vy = 6.2; this.grounded = false;
    this.char.play('jump', 0.55);
    audio.pop('C5');
  }

  // transport a tangent vector along with the rotation
  rotateAll(q) {
    this.dir.applyQuaternion(q).normalize();
    this.fwd.applyQuaternion(q);
    this.camF.applyQuaternion(q);
  }

  orthonormalize() {
    this.fwd.addScaledVector(this.dir, -this.fwd.dot(this.dir)).normalize();
    this.camF.addScaledVector(this.dir, -this.camF.dot(this.dir)).normalize();
  }

  update(dt, input) {
    const c = this.char;
    let mx = this.frozen ? 0 : input.move.x, my = this.frozen ? 0 : input.move.y;
    const mag = Math.min(1, Math.hypot(mx, my));
    const camRight = _v.crossVectors(this.camF, this.dir).normalize(); // screen right
    const want = new THREE.Vector3().addScaledVector(this.camF, my).addScaledVector(camRight, mx);
    const target = mag > 0.05 ? (input.run ? 7.2 : 4.4) * mag : 0;
    this.speed += (target - this.speed) * Math.min(1, dt * (target > this.speed ? 7 : 10));
    if (mag > 0.05) {
      want.normalize();
      // turn toward input
      const ang = Math.atan2(_axis.crossVectors(this.fwd, want).dot(this.dir), this.fwd.dot(want));
      const turn = THREE.MathUtils.clamp(ang, -dt * 12, dt * 12);
      this.fwd.applyAxisAngle(this.dir, turn);
    }
    if (this.speed > 0.01) {
      const moveDir = mag > 0.05 ? want : this.fwd;
      const dist = this.speed * dt;
      const prev = this.dir.clone();
      _axis.crossVectors(this.dir, moveDir).normalize();
      _q.setFromAxisAngle(_axis, dist / (R + this.height));
      const next = this.dir.clone().applyQuaternion(_q).normalize();
      this.world.resolve(next, 0.32);
      if (groundAt(next) !== null) {
        // rotate everything by the actual displacement
        _q.setFromUnitVectors(prev, next);
        this.rotateAll(_q);
        this.dir.copy(next);
      } else {
        this.speed *= 0.3;
      }
      this.orthonormalize();
    }

    // vertical
    const g = groundAt(this.dir) ?? heightAt(this.dir);
    this.height += (g - this.height) * Math.min(1, dt * 20);
    if (!this.grounded) {
      this.vy -= 18 * dt;
      this.y += this.vy * dt;
      if (this.y <= 0) { this.y = 0; this.vy = 0; this.grounded = true; c.squash = 1; audio.step(); }
    }
    this.world.place(c.root, this.dir, this.fwd, this.y + (this.height - g));
    c.speed = this.speed / 4.4;

    // footsteps + dust
    if (this.grounded && this.speed > 1) {
      this.stepT -= dt * this.speed * 0.42;
      if (this.stepT < 0) { this.stepT = 1; audio.step(); this.puff(); }
    }
    this.updateDust(dt);
    c.update(dt);
  }

  puff() {
    const d = this.dust;
    for (let k = 0; k < 2; k++) {
      const i = d.i++ % d.life.length;
      d.life[i] = 1;
      const p = this.pos;
      const a = d.pts.geometry.attributes.position.array;
      a[i * 3] = p.x - this.fwd.x * 0.3; a[i * 3 + 1] = p.y - this.fwd.y * 0.3; a[i * 3 + 2] = p.z - this.fwd.z * 0.3;
      const v = this.dir.clone().multiplyScalar(0.6).addScaledVector(this.fwd, -0.6).add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(0.5));
      d.vel[i * 3] = v.x; d.vel[i * 3 + 1] = v.y; d.vel[i * 3 + 2] = v.z;
    }
  }
  updateDust(dt) {
    const d = this.dust;
    const a = d.pts.geometry.attributes.position.array;
    for (let i = 0; i < d.life.length; i++) {
      if (d.life[i] <= 0) { a[i * 3] = 0; a[i * 3 + 1] = 0; a[i * 3 + 2] = 0; continue; }
      d.life[i] -= dt * 1.8;
      a[i * 3] += d.vel[i * 3] * dt; a[i * 3 + 1] += d.vel[i * 3 + 1] * dt; a[i * 3 + 2] += d.vel[i * 3 + 2] * dt;
    }
    d.pts.geometry.attributes.position.needsUpdate = true;
  }
}

export class CameraRig {
  constructor(camera, player, world) {
    this.cam = camera;
    this.p = player;
    this.world = world;
    this.pitch = 48 * DEG;
    this.dist = 14;
    this.targetDist = 14;
    this.pos = new THREE.Vector3();
    this.look = new THREE.Vector3();
    this.up = new THREE.Vector3(0, 1, 0);
    this.mode = 'follow';
    this.shot = null;
    this.shake = 0;
    this.snap();
  }
  snap() { this.compute(this.pos, this.look); this.cam.position.copy(this.pos); this.up.copy(this.p.up); this.cam.up.copy(this.up); this.cam.lookAt(this.look); }

  compute(outPos, outLook) {
    const p = this.p;
    if (this.mode === 'shot' && this.shot) {
      outPos.copy(this.shot.pos);
      outLook.copy(this.shot.look);
      return;
    }
    const up = p.up;
    const base = p.pos.clone().addScaledVector(up, 1.1);
    outLook.copy(base);
    const dist = Math.min(this.dist, this.safeDist ?? this.dist);
    outPos.copy(base).addScaledVector(p.camF, -dist * Math.cos(this.pitch)).addScaledVector(up, dist * Math.sin(this.pitch));
  }

  update(dt, input) {
    const d = input.consumeCam();
    const z = input.consumeZoom();
    if (this.mode === 'follow') {
      if (d.x) this.p.camF.applyAxisAngle(this.p.up, -d.x * 0.005);
      this.pitch = THREE.MathUtils.clamp(this.pitch + d.y * 0.003, 14 * DEG, 76 * DEG);
      this.targetDist = THREE.MathUtils.clamp(this.targetDist + z * 1.2, 6, 24);
    }
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 5);
    // pull the camera in when a building sits between it and Rin
    if (this.mode === 'follow' && this.world) {
      const up = this.p.up;
      const base = this.p.pos.clone().addScaledVector(up, 1.1);
      const dirOut = new THREE.Vector3().addScaledVector(this.p.camF, -Math.cos(this.pitch)).addScaledVector(up, Math.sin(this.pitch));
      let safe = this.dist;
      for (let i = 2; i <= 10; i++) {
        const t = (i / 10) * this.dist;
        if (this.world.occluded(base.clone().addScaledVector(dirOut, t))) { safe = Math.max(3.2, t - 1.2); break; }
      }
      this.safeDist = this.safeDist === undefined ? safe : this.safeDist + (safe - this.safeDist) * Math.min(1, dt * (safe < this.safeDist ? 10 : 2));
    }
    const tp = new THREE.Vector3(), tl = new THREE.Vector3();
    this.compute(tp, tl);
    const k = this.mode === 'shot' ? 3.2 : 9;
    this.pos.lerp(tp, Math.min(1, dt * k));
    this.look.lerp(tl, Math.min(1, dt * (k + 3)));
    this.up.lerp(this.p.up, Math.min(1, dt * 8)).normalize();
    this.cam.position.copy(this.pos);
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 2);
      this.cam.position.add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(this.shake * 0.25));
    }
    this.cam.up.copy(this.up);
    this.cam.lookAt(this.look);
  }

  // two-shot framing between Rin and someone else, avoiding buildings and trees
  frameDialogue(other) {
    const p = this.p;
    const up = p.up;
    const a = p.pos.clone(), b = other.clone();
    const mid = a.clone().add(b).multiplyScalar(0.5).addScaledVector(up, 1.25);
    const across = b.clone().sub(a);
    across.addScaledVector(up, -across.dot(up));
    const span = across.length();
    across.normalize();
    const side = new THREE.Vector3().crossVectors(up, across).normalize();
    const toCam = this.pos.clone().sub(mid);
    if (side.dot(toCam) < 0) side.negate();
    const dist = Math.max(3.6, span * 1.6 + 2.2);
    const look = mid.clone().addScaledVector(up, -0.15);
    const clear = (pos) => {
      if (!this.world) return true;
      for (let i = 1; i <= 8; i++) if (this.world.occluded(look.clone().lerp(pos, i / 8))) return false;
      return true;
    };
    let best = null;
    outer: for (const lift of [0.9, 2.4, 4.2, 6.5]) {
      for (const s of [1, -1]) {
        for (const k of [1, 0.75, 0.55]) {
          const pos = mid.clone().addScaledVector(side, s * dist * k).addScaledVector(up, lift).addScaledVector(across, -0.6);
          if (clear(pos)) { best = pos; break outer; }
        }
      }
    }
    if (!best) best = mid.clone().addScaledVector(side, dist * 0.6).addScaledVector(up, 8);
    this.shot = { pos: best, look };
    this.mode = 'shot';
  }
  release() { this.mode = 'follow'; this.shot = null; }
}
