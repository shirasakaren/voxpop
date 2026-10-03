import * as THREE from 'three';
import { R, groundAt, DEG, dirFromLatLon, surfacePoint, basisMatrix, eastAt } from '../world/sphere.js';
import { CAST, TOWNSFOLK_LINES, SCOOPS, DISTRICTS } from '../data/story.js';
import { randomLook } from '../world/characters.js';
import { markerTexture, noteTexture, mulberry, dotTexture } from '../world/textures.js';
import { Builder } from '../world/builder.js';
import { Site } from '../world/districts.js';
import { toonMat, outlineMat } from '../world/toon.js';
import { audio } from '../shared/audio.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

function yawTo(ch, targetPos) {
  // yaw of targetPos in the character's local frame
  const up = ch.dir, f = ch.fwd;
  const r = tmp.crossVectors(up, f);
  const d = tmp2.copy(targetPos).sub(ch.root.position);
  return Math.atan2(d.dot(r), d.dot(f));
}

export class NPCs {
  constructor(world, player) {
    this.world = world;
    this.player = player;
    this.markTex = { voice: markerTexture('!', '#e63946'), file: markerTexture('✎', '#ffd60a'), done: markerTexture('✓', '#2a9d8f') };
    this.cast = CAST.map((c) => {
      const site = world.districtSite(c.district);
      const [dx, dz, h] = c.at;
      const d = site.dir(dx, dz);
      const f = site.fwd(d, h);
      const ch = world.spawn({ ...c.look, id: c.id }, d, f);
      world.addCircle(d, 0.38);
      const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.markTex.voice, depthTest: false, transparent: true }));
      marker.scale.set(0.8, 1.0, 1);
      marker.renderOrder = 10;
      marker.visible = false;
      world.root.add(marker);
      return { id: c.id, data: c, ch, d, f: f.clone(), marker, mark: null };
    });
    this.byId = Object.fromEntries(this.cast.map((n) => [n.id, n]));

    // townsfolk
    const rnd = mulberry(77);
    this.folk = [];
    const homes = ['herald', 'station', 'station', 'park', 'beach', 'alley', 'homes', 'shrine', 'park', 'alley', 'homes', 'beach', 'herald', 'station'];
    homes.forEach((h, i) => {
      const site = world.districtSite(h);
      let d;
      for (let k = 0; k < 30; k++) {
        d = site.dir((rnd() - 0.5) * 14, (rnd() - 0.5) * 14);
        if (groundAt(d) !== null && !world.blocked(d, 0.5)) break;
      }
      const ch = world.spawn(randomLook(rnd, 'folk' + i), d, site.fwd(d, rnd() * 360));
      this.folk.push({ ch, site, target: null, wait: rnd() * 3, bumpT: 0, line: TOWNSFOLK_LINES[i % TOWNSFOLK_LINES.length], speed: 1.3 + rnd() * 0.6 });
    });

    // the cat
    this.cat = this.makeCat();

    // kickable balls
    this.balls = [
      this.makeBall('park', 3.2, -2.5, ['#ffffff', '#14111c'], 0.32),
      this.makeBall('beach', 4.5, -9.5, ['#e63946', '#ffffff', '#ffd60a', '#4cc9f0'], 0.42),
      this.makeBall('herald', -6.5, -5.5, ['#ffd60a', '#e63946'], 0.3),
    ];

    // scoops
    const nt = noteTexture();
    this.scoops = SCOOPS.map((s, i) => {
      const d = dirFromLatLon(s.lat, s.lon);
      // nudge out of colliders and water
      for (let k = 0; k < 20 && (world.blocked(d, 0.5) || groundAt(d) === null); k++) d.applyAxisAngle(eastAt(d), 0.02).normalize();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.75), new THREE.MeshBasicMaterial({ map: nt, side: THREE.DoubleSide, transparent: true, toneMapped: false }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: dotTexture(), color: '#ffd60a', transparent: true, opacity: 0.6, depthWrite: false }));
      glow.scale.setScalar(1.6);
      const g = new THREE.Group();
      g.add(glow); g.add(m);
      world.root.add(g);
      return { i, d, data: s, group: g, mesh: m, taken: false };
    });
  }

  makeCat() {
    const site = this.world.districtSite('herald');
    const d = site.dir(-4.8, 3.2);
    const b = new Builder();
    const orange = '#f4a261', cream = '#fff1e0';
    b.add(new THREE.CapsuleGeometry(0.16, 0.34, 4, 8), orange, { y: 0.24, rx: Math.PI / 2 });
    b.sphere(0.17, 0, 0.42, 0.26, orange);
    b.sphere(0.08, 0, 0.38, 0.4, cream, { outline: false });
    [-1, 1].forEach((s) => b.add(new THREE.ConeGeometry(0.06, 0.12, 4), orange, { x: s * 0.09, y: 0.58, z: 0.26, rz: -s * 0.25 }));
    [-1, 1].forEach((s) => b.sphere(0.025, s * 0.06, 0.45, 0.42, '#14111c', { outline: false }));
    [[-0.08, 0.15], [0.08, 0.15], [-0.08, -0.15], [0.08, -0.15]].forEach(([x, z]) => b.cyl(0.04, 0.04, 0.12, x, 0, z, orange, 6, { outline: false }));
    const body = b.build('cat');
    const tb = new Builder();
    tb.tube([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.15, -0.12), new THREE.Vector3(0, 0.35, -0.12)], 0.035, orange);
    const tail = tb.build('tail');
    tail.position.set(0, 0.25, -0.3);
    const root = new THREE.Group();
    root.add(body); root.add(tail);
    this.world.root.add(root);
    const cat = { root, body, tail, dir: d.clone(), fwd: site.fwd(d, 90), follow: 0, hop: 0 };
    this.world.place(root, cat.dir, cat.fwd);
    this.world.addInteract('cat', cat.dir, 1.4, { cat });
    return cat;
  }

  makeBall(district, dx, dz, cols, r) {
    const site = this.world.districtSite(district);
    const d = site.dir(dx, dz);
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const x = c.getContext('2d');
    const n = cols.length * 2;
    for (let i = 0; i < n; i++) { x.fillStyle = cols[i % cols.length]; x.fillRect((i / n) * 256, 0, 256 / n + 1, 128); }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.SphereGeometry(r, 20, 14);
    const mesh = new THREE.Mesh(geo, toonMat({ map: tex }));
    mesh.castShadow = true;
    const outline = new THREE.Mesh(geo, outlineMat(1));
    const spin = new THREE.Group();
    spin.add(mesh); spin.add(outline);
    const holder = new THREE.Group();
    holder.add(spin);
    spin.position.y = r;
    this.world.root.add(holder);
    return { dir: d.clone(), fwd: site.fwd(d, 0), vel: new THREE.Vector3(), r, holder, spin, cool: 0, wq: new THREE.Quaternion() };
  }

  updateBalls(dt) {
    const p = this.player;
    for (const b of this.balls) {
      b.cool -= dt;
      const dist = b.dir.angleTo(p.dir) * R;
      if (dist < b.r + 0.45 && b.cool <= 0) {
        const away = b.dir.clone().sub(p.dir);
        away.addScaledVector(b.dir, -away.dot(b.dir));
        if (away.lengthSq() < 1e-10) away.copy(p.fwd);
        away.normalize();
        const power = Math.max(3, p.speed * 1.6) + (p.grounded ? 0 : 3);
        b.vel.copy(away).multiplyScalar(power);
        b.hop = p.speed > 5 || !p.grounded ? 1.6 : 0.6;
        b.cool = 0.25;
        audio.pop(p.speed > 5 ? 'C4' : 'G4');
        this.kicks = (this.kicks || 0) + 1;
        this.onKick?.(this.kicks);
      }
      const sp = b.vel.length();
      if (sp > 0.02) {
        const vdir = b.vel.clone().normalize();
        const axis = new THREE.Vector3().crossVectors(b.dir, vdir).normalize();
        const prev = b.dir.clone();
        b.dir.applyAxisAngle(axis, (sp * dt) / R).normalize();
        this.world.resolve(b.dir, b.r);
        if (groundAt(b.dir) === null) { b.dir.copy(prev); b.vel.multiplyScalar(-0.5); }
        const moved = prev.angleTo(b.dir) * R;
        if (moved < sp * dt * 0.5) { b.vel.multiplyScalar(-0.55); audio.pop('D4'); }
        // transport velocity onto new tangent plane
        const q = new THREE.Quaternion().setFromUnitVectors(prev, b.dir);
        b.vel.applyQuaternion(q);
        b.vel.addScaledVector(b.dir, -b.vel.dot(b.dir));
        b.fwd.applyQuaternion(q).addScaledVector(b.dir, -b.fwd.dot(b.dir)).normalize();
        // rolling spin in world space
        const rollAxis = new THREE.Vector3().crossVectors(b.dir, b.vel).normalize();
        const qs = new THREE.Quaternion().setFromAxisAngle(rollAxis, (sp * dt) / b.r);
        b.wq.premultiply(qs);
        b.vel.multiplyScalar(Math.exp(-dt * 1.1));
      }
      b.hop = Math.max(0, (b.hop || 0) - dt * 3);
      const y = Math.abs(Math.sin(b.hop * Math.PI)) * b.hop * 0.8;
      // keep the rolling orientation in world space
      this.world.place(b.holder, b.dir, b.fwd, y);
      b.spin.quaternion.copy(b.holder.quaternion).invert().multiply(b.wq);
    }
  }

  setMarkers(map) {
    // map: id -> 'voice' | 'file' | null
    for (const n of this.cast) {
      const m = map[n.id] || null;
      n.mark = m;
      n.marker.visible = !!m;
      if (m) n.marker.material.map = this.markTex[m];
    }
  }

  nearest(maxDist = 2.4) {
    let best = null, bd = maxDist;
    const pp = this.player.pos;
    for (const n of this.cast) {
      const dist = n.ch.root.position.distanceTo(pp);
      if (dist < bd) { bd = dist; best = n; }
    }
    return best;
  }

  update(dt, t, ui, talkingTo) {
    const pp = this.player.pos;
    for (const n of this.cast) {
      const ch = n.ch;
      const dist = ch.root.position.distanceTo(pp);
      if (talkingTo === n) {
        // turn to face Rin
        const y = yawTo(ch, pp);
        ch.fwd.applyAxisAngle(ch.dir, THREE.MathUtils.clamp(y, -dt * 5, dt * 5));
        ch.lookYaw = 0;
      } else if (dist < 6) {
        ch.lookYaw = THREE.MathUtils.clamp(yawTo(ch, pp), -1.1, 1.1);
        if (dist < 2.6) {
          const y = yawTo(ch, pp);
          if (Math.abs(y) > 0.9) ch.fwd.applyAxisAngle(ch.dir, Math.sign(y) * dt * 2);
        }
      } else {
        ch.lookYaw = 0;
        // drift back to the original heading
        const y = Math.atan2(tmp.crossVectors(ch.fwd, n.f).dot(ch.dir), ch.fwd.dot(n.f));
        ch.fwd.applyAxisAngle(ch.dir, THREE.MathUtils.clamp(y, -dt, dt));
      }
      ch.fwd.addScaledVector(ch.dir, -ch.fwd.dot(ch.dir)).normalize();
      this.world.place(ch.root, ch.dir, ch.fwd);
      ch.update(dt);
      if (n.marker.visible) {
        n.marker.position.copy(ch.root.position).addScaledVector(ch.dir, 2.35 * ch.scaleBase + Math.sin(t * 3 + n.d.x * 9) * 0.12);
        const s = 0.8 + Math.max(0, Math.sin(t * 6)) * 0.05;
        n.marker.scale.set(s, s * 1.25, 1);
        n.marker.visible = ch.root.visible;
      }
    }

    // townsfolk
    for (const f of this.folk) {
      const ch = f.ch;
      if (!ch.root.visible) { ch.update(dt * 0.25); continue; }
      f.bumpT -= dt;
      const dist = ch.root.position.distanceTo(pp);
      if (dist < 1.3 && f.bumpT <= 0) {
        f.bumpT = 12;
        ui.bubble(ch, f.line, 2.6);
        ch.play('wave', 1.2);
        f.wait = 1.6; f.target = null;
      }
      if (f.wait > 0) {
        f.wait -= dt;
        ch.speed += (0 - ch.speed) * Math.min(1, dt * 6);
        if (dist < 4) ch.lookYaw = THREE.MathUtils.clamp(yawTo(ch, pp), -1, 1); else ch.lookYaw = 0;
      } else {
        if (!f.target) {
          for (let k = 0; k < 8; k++) {
            const d = f.site.dir((Math.random() - 0.5) * 16, (Math.random() - 0.5) * 16);
            if (groundAt(d) !== null && !this.world.blocked(d, 0.6)) { f.target = d; break; }
          }
          if (!f.target) { f.wait = 1; continue; }
        }
        const to = tmp.copy(f.target).sub(ch.dir);
        to.addScaledVector(ch.dir, -to.dot(ch.dir));
        const remain = to.length() * R;
        if (remain < 0.4) { f.target = null; f.wait = 2 + Math.random() * 4; continue; }
        to.normalize();
        const y = Math.atan2(tmp2.crossVectors(ch.fwd, to).dot(ch.dir), ch.fwd.dot(to));
        ch.fwd.applyAxisAngle(ch.dir, THREE.MathUtils.clamp(y, -dt * 4, dt * 4));
        const step = f.speed * dt / R;
        const prev = ch.dir.clone();
        const axis = tmp2.crossVectors(ch.dir, ch.fwd).normalize();
        ch.dir.applyAxisAngle(axis, step).normalize();
        this.world.resolve(ch.dir, 0.3);
        if (groundAt(ch.dir) === null) { ch.dir.copy(prev); f.target = null; }
        const moved = prev.angleTo(ch.dir) * R;
        if (moved < step * R * 0.3) { f.stuck = (f.stuck || 0) + dt; if (f.stuck > 0.6) { f.target = null; f.stuck = 0; f.wait = 0.5; } }
        const q = new THREE.Quaternion().setFromUnitVectors(prev, ch.dir);
        ch.fwd.applyQuaternion(q);
        ch.fwd.addScaledVector(ch.dir, -ch.fwd.dot(ch.dir)).normalize();
        ch.speed += (f.speed / 4.4 - ch.speed) * Math.min(1, dt * 5);
        ch.lookYaw = 0;
      }
      this.world.place(ch.root, ch.dir, ch.fwd);
      ch.update(dt);
    }

    // cat
    const c = this.cat;
    if (c.follow > 0) {
      c.follow -= dt;
      const goal = this.player.dir.clone().multiplyScalar(R).addScaledVector(this.player.fwd, -1.3).addScaledVector(new THREE.Vector3().crossVectors(this.player.dir, this.player.fwd), 0.8).normalize();
      const to = tmp.copy(goal).sub(c.dir);
      to.addScaledVector(c.dir, -to.dot(c.dir));
      const remain = to.length() * R;
      if (remain > 0.25) {
        to.normalize();
        c.fwd.lerp(to, Math.min(1, dt * 6)).addScaledVector(c.dir, -c.fwd.dot(c.dir)).normalize();
        const sp = Math.min(8, remain * 2.2) * dt / R;
        const axis = tmp2.crossVectors(c.dir, c.fwd).normalize();
        const prev = c.dir.clone();
        c.dir.applyAxisAngle(axis, sp).normalize();
        if (groundAt(c.dir) === null) c.dir.copy(prev);
        c.hop += dt * 14;
      }
      const it = this.world.interacts.find((x) => x.cat === c);
      if (it) it.d.copy(c.dir);
    }
    this.world.place(c.root, c.dir, c.fwd, Math.abs(Math.sin(c.hop)) * 0.08);
    c.tail.rotation.z = Math.sin(t * 3) * 0.4;
    c.body.scale.y = 1 + Math.sin(t * 2) * 0.03;

    this.updateBalls(dt);

    // scoops
    for (const s of this.scoops) {
      if (s.taken) continue;
      const base = surfacePoint(s.d, 1.1 + Math.sin(t * 2 + s.i) * 0.15);
      s.group.position.copy(base);
      s.group.quaternion.setFromRotationMatrix(basisMatrix(s.d, eastAt(s.d), base));
      s.mesh.rotation.y = t * 1.6 + s.i;
    }
  }
}
