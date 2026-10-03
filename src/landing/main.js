import '../shared/fonts.js';
import '../shared/base.css';
import './landing.css';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { World } from '../world/world.js';
import { R, DEG, dirFromLatLon, forwardFromHeading, surfacePoint } from '../world/sphere.js';
import { RIN_LOOK } from '../world/characters.js';
import { CAST, DISTRICTS, ASSIGNMENTS, HERO } from '../data/story.js';
import { audio, store } from '../shared/audio.js';
import { renderPortraits, portrait } from '../shared/portraits.js';
import { Confetti } from '../shared/confetti.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const isMobile = () => innerWidth < 760;
const SNAP = new URLSearchParams(location.search).has('snap');
const confetti = new Confetti($('#confetti'));
document.body.classList.add('loading');

// ============ RENDERER ============
const canvas = $('#world');
const quality = store.get('quality', coarse ? 'low' : 'medium');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, alpha: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, coarse ? 1.25 : 1.6));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 1500);
const world = new World(scene, { quality: quality === 'high' ? 'medium' : quality });
let rin, cast = [];

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 55 : 40;
  camera.updateProjectionMatrix();
  confetti && ScrollTrigger.refresh();
}
addEventListener('resize', () => { clearTimeout(resize.t); resize.t = setTimeout(resize, 120); });

// ============ LOADER ============
const ldLetters = $$('.ld-word span');
gsap.to(ldLetters, { y: 0, rotate: 0, opacity: 1, stagger: 0.04, duration: 0.6, ease: 'back.out(2)', delay: 0.2 });
const ldNum = $('#ld-num');
const ldLines = ['Inking the town', 'Sweeping the shrine steps', 'Warming the ramen broth', 'Waking up the cat', 'Printing page one'];
let shown = 0;
function setProgress(p) {
  const v = Math.round(p * 100);
  gsap.to({ v: shown }, { v, duration: 0.4, onUpdate() { ldNum.textContent = String(Math.round(this.targets()[0].v)).padStart(2, '0'); } });
  shown = v;
  $('#ld-line').textContent = ldLines[Math.min(ldLines.length - 1, Math.floor(p * ldLines.length))];
}

async function bootWorld() {
  await world.build((p) => setProgress(p * 0.8));
  setProgress(0.85);
  await new Promise((r) => setTimeout(r, 30));
  renderPortraits();
  setProgress(0.92);
  // characters on the planet
  const hs = world.districtSite('herald');
  const rd = hs.dir(-1.2, 2.2);
  rin = world.spawn({ ...RIN_LOOK }, rd, hs.fwd(rd, 200));
  rin.alwaysVisible = true;
  cast = CAST.map((c) => {
    const s = world.districtSite(c.district);
    const d = s.dir(c.at[0], c.at[1]);
    const ch = world.spawn({ ...c.look, id: c.id }, d, s.fwd(d, c.at[2]));
    return { c, ch, d };
  });
  camera.position.set(0, 60, 120); camera.lookAt(0, 0, 0);
  renderer.compile(scene, camera);
  setProgress(1);
}

// ============ CAMERA SHOTS ============
const cam = { pos: new THREE.Vector3(0, 60, 130), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0) };
const target = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3(0, 1, 0), focus: new THREE.Vector3(0, 1, 0) };
let orbitYaw = 0.6, orbitVel = 0, dragYaw = 0;
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
let shot = 'orbit', shotT = 0, townIdx = 0, townBlend = 0, finalT = 0;

function orbitShot(out, dist, elev, lookShift) {
  const yaw = orbitYaw + dragYaw + mouse.sx * 0.12;
  const el = elev + mouse.sy * 0.06;
  const d = new THREE.Vector3(Math.sin(yaw) * Math.cos(el), Math.sin(el), Math.cos(yaw) * Math.cos(el));
  out.pos.copy(d).multiplyScalar(dist);
  out.up.set(0, 1, 0);
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), d).normalize();
  out.look.set(0, 0, 0).addScaledVector(right, lookShift.x).add(new THREE.Vector3(0, lookShift.y, 0));
  out.focus.copy(d).lerp(new THREE.Vector3(0, 1, 0), 0.3).normalize();
}

function surfaceShot(out, dir, { height = 16, back = 14, side = 0, lookUp = 1, heading = 180, shift = 0 }) {
  const up = dir.clone();
  const f = forwardFromHeading(up, heading);
  const right = new THREE.Vector3().crossVectors(up, f).normalize();
  const base = surfacePoint(dir, 0);
  out.pos.copy(base).addScaledVector(up, height).addScaledVector(f, -back).addScaledVector(right, side);
  out.look.copy(base).addScaledVector(up, lookUp).addScaledVector(right, shift);
  out.up.copy(up);
  out.focus.copy(up);
}

const districtDirs = DISTRICTS.map((d) => {
  if (d.id === 'beach') return dirFromLatLon(-37, 60);
  if (d.id === 'shrine') return dirFromLatLon(44, 128);
  return dirFromLatLon(d.lat, d.lon);
});

function computeShot(dt) {
  const m = isMobile();
  if (shot === 'orbit' || shot === 'people' || shot === 'topics' || shot === 'how') {
    orbitShot(target, m ? 200 : 150, 0.82, m ? { x: 0, y: 66 } : { x: -40, y: 6 });
  } else if (shot === 'rin') {
    const d = rin.dir;
    const t = shotT;
    surfaceShot(target, d, { height: 2.6 + (1 - t) * 6, back: 6.5 + (1 - t) * 8, side: 1.5, lookUp: 1.3, heading: 20, shift: m ? 0 : 2.6 });
  } else if (shot === 'town') {
    const a = districtDirs[townIdx], b = districtDirs[Math.min(townIdx + 1, districtDirs.length - 1)];
    const dir = a.clone().lerp(b, townBlend).normalize();
    const lift = Math.sin(townBlend * Math.PI) * 14;
    surfaceShot(target, dir, { height: 15 + lift, back: 15 + lift * 0.5, side: 4, lookUp: 0, heading: 160, shift: m ? 0 : -3 });
    if (m) target.look.addScaledVector(target.up, -6);
  } else if (shot === 'final') {
    const t = finalT;
    orbitShot(target, THREE.MathUtils.lerp(m ? 175 : 150, m ? 120 : 96, t), 0.9 + t * 0.5, { x: 0, y: m ? 14 : 4 });
  }
}

function updateCamera(dt) {
  computeShot(dt);
  const k = SNAP ? 1 : Math.min(1, dt * (shot === 'town' ? 3.2 : 2.4));
  // spherical-ish interpolation keeps us outside the planet
  const r0 = cam.pos.length(), r1 = target.pos.length();
  const dir = cam.pos.clone().normalize().lerp(target.pos.clone().normalize(), k).normalize();
  let rr = THREE.MathUtils.lerp(r0, r1, k);
  const minR = R + 4;
  rr = Math.max(rr, minR);
  cam.pos.copy(dir).multiplyScalar(rr);
  cam.look.lerp(target.look, k);
  cam.up.lerp(target.up, k).normalize();
  camera.position.copy(cam.pos);
  camera.up.copy(cam.up);
  camera.lookAt(cam.look);
}

// ============ RENDER LOOP ============
let last = performance.now();
let renderOn = true;
function frame() {
  requestAnimationFrame(frame);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  mouse.sx += (mouse.x - mouse.sx) * Math.min(1, dt * 3);
  mouse.sy += (mouse.y - mouse.sy) * Math.min(1, dt * 3);
  orbitYaw += dt * (0.05 + orbitVel);
  orbitVel *= 0.95;
  dragYaw *= 0.995;
  if (!renderOn || !rin) return;
  updateCamera(dt);
  world.update(dt, target.focus, camera);
  for (const { ch } of cast) if (ch.root.visible) ch.update(dt);
  rin.update(dt);
  updateSpeech();
  renderer.render(scene, camera);
}

// ============ SPEECH (3D anchored) ============
let speech = null;
function say(ch, text, dur = 2.8) {
  speech?.el.remove();
  const el = document.createElement('div');
  el.className = 'speech';
  el.textContent = text;
  document.body.appendChild(el);
  speech = { el, ch, t: performance.now() + dur * 1000 };
  audio.blip(1.3);
}
function updateSpeech() {
  if (!speech) return;
  const v = speech.ch.root.position.clone().addScaledVector(speech.ch.dir, 2.2).project(camera);
  speech.el.style.left = ((v.x + 1) / 2) * innerWidth + 'px';
  speech.el.style.top = ((1 - v.y) / 2) * innerHeight + 'px';
  speech.el.style.opacity = v.z < 1 ? 1 : 0;
  if (performance.now() > speech.t) { speech.el.remove(); speech = null; }
}

// ============ CURSOR ============
const cursor = $('#cursor');
const cdot = $('.c-dot'), cring = $('.c-ring'), clabel = $('.c-label');
const cpos = { x: innerWidth / 2, y: innerHeight / 2, rx: innerWidth / 2, ry: innerHeight / 2 };
let inkT = 0;
addEventListener('pointermove', (e) => {
  cpos.x = e.clientX; cpos.y = e.clientY;
  mouse.x = (e.clientX / innerWidth) * 2 - 1;
  mouse.y = (e.clientY / innerHeight) * 2 - 1;
  lastActive = performance.now();
  if (!coarse && performance.now() - inkT > 40 && !reduce) {
    inkT = performance.now();
    const d = document.createElement('i');
    d.className = 'ink-dot';
    d.style.left = e.clientX - 3 + 'px'; d.style.top = e.clientY - 3 + 'px';
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 800);
  }
});
gsap.ticker.add(() => {
  cpos.rx += (cpos.x - cpos.rx) * 0.18;
  cpos.ry += (cpos.y - cpos.ry) * 0.18;
  cdot.style.transform = `translate(${cpos.x}px, ${cpos.y}px)`;
  cring.style.transform = `translate(${cpos.rx}px, ${cpos.ry}px)`;
});
addEventListener('pointerdown', () => cursor.classList.add('press'));
addEventListener('pointerup', () => cursor.classList.remove('press'));
const LABELS = { play: 'Play', ask: 'Ask', read: 'Read', drag: 'Drag' };
function bindCursor(root = document) {
  $$('[data-cursor]', root).forEach((el) => {
    el.addEventListener('mouseenter', () => {
      const k = el.dataset.cursor;
      clabel.textContent = LABELS[k] || '';
      cursor.classList.toggle('big', k === 'play' || k === 'ask');
      cursor.classList.toggle('drag', k === 'drag');
      audio.hover();
    });
    el.addEventListener('mouseleave', () => { cursor.classList.remove('big', 'drag'); });
  });
}

// ============ MAGNETIC ============
function magnetic() {
  $$('.magnetic').forEach((el) => {
    const strength = el.classList.contains('btn-huge') ? 0.45 : 0.3;
    el.addEventListener('mousemove', (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, { x: x * strength, y: y * strength, rotate: x * 0.02, duration: 0.4, ease: 'power3.out' });
    });
    el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, rotate: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }));
  });
}

// ============ PLAY TRANSITION ============
function goPlay(e, el) {
  e.preventDefault();
  audio.fanfare();
  const r = el.getBoundingClientRect();
  confetti.burst(r.left + r.width / 2, r.top + r.height / 2, 120);
  gsap.to('#wipe i', { scaleY: 1, duration: 0.55, stagger: 0.08, ease: 'power4.inOut', delay: 0.25, onComplete: () => { location.href = el.href; } });
}

// ============ SCROLL / LENIS ============
let lenis;
function setupScroll() {
  if (!reduce) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href');
    const t = id === '#top' ? 0 : $(id);
    if (t === null) return;
    e.preventDefault();
    closeMenu();
    lenis ? lenis.scrollTo(t, { duration: 1.6 }) : (t === 0 ? scrollTo(0, 0) : t.scrollIntoView());
  }));
  $('#totop').addEventListener('click', () => { lenis ? lenis.scrollTo(0, { duration: 2 }) : scrollTo(0, 0); audio.whoosh(); });

  // nav hide on scroll down
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: (self) => {
      const y = self.scroll();
      $('.nav').classList.toggle('hide', y > lastY && y > 300);
      lastY = y;
      $('#rail-fill').style.height = self.progress * 100 + '%';
      // ticker velocity
      tickerBoost = Math.min(6, Math.abs(self.getVelocity()) / 400);
    },
  });

}

function chapterTriggers() {
  // chapters -> camera shots + rail labels
  const chapters = $$('[data-chapter]');
  chapters.forEach((sec, i) => {
    ScrollTrigger.create({
      trigger: sec, start: 'top 55%', end: 'bottom 45%',
      onToggle: (self) => {
        if (!self.isActive) return;
        shot = sec.dataset.shot;
        $('#rail-no').textContent = 'P.' + String(i + 1).padStart(2, '0');
        $('#rail-name').textContent = sec.dataset.chapter;
        $$('.nav-links a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#' + sec.id));
      },
    });
  });
  // pause rendering under opaque sections
  ['#people', '#topics', '#how'].forEach((id) => {
    ScrollTrigger.create({ trigger: id, start: 'top top', end: 'bottom bottom', onToggle: (s) => { opaqueCount += s.isActive ? 1 : -1; renderOn = opaqueCount <= 0; } });
  });

  ScrollTrigger.create({ trigger: '#story', start: 'top bottom', end: 'center center', scrub: true, onUpdate: (s) => { shotT = s.progress; } });
  ScrollTrigger.create({ trigger: '#final', start: 'top bottom', end: 'bottom bottom', scrub: true, onUpdate: (s) => { finalT = s.progress; } });
}
let opaqueCount = 0;
let tickerBoost = 0;

// ============ TEXT REVEALS ============
function reveals() {
  $$('.split-lines').forEach((el) => {
    const st = new SplitText(el, { type: 'lines', linesClass: 'line' });
    st.lines.forEach((l) => { const inner = document.createElement('span'); inner.style.display = 'block'; inner.innerHTML = l.innerHTML; l.innerHTML = ''; l.appendChild(inner); });
    gsap.from(el.querySelectorAll('.line > span'), { yPercent: 110, rotate: 4, duration: 1, stagger: 0.1, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
  });
  $$('.chap-no').forEach((el) => gsap.from(el, { xPercent: -40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } }));
  $$('.chap-jp').forEach((el) => gsap.from(el, { scale: 0, rotate: -40, duration: 0.8, ease: 'back.out(3)', scrollTrigger: { trigger: el, start: 'top 85%' } }));
  $$('.reveal').forEach((el) => gsap.from(el, { y: 50, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' } }));
  gsap.from('.final-title .fl', { yPercent: 120, rotate: 10, opacity: 0, stagger: 0.12, duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: '.final-title', start: 'top 80%' } });
  gsap.from('#btn-huge', { scale: 0, rotate: -180, duration: 1.2, ease: 'back.out(1.8)', scrollTrigger: { trigger: '#btn-huge', start: 'top 90%' } });
  gsap.from('.extras span', { y: 40, opacity: 0, stagger: 0.05, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: '.extras', start: 'top 90%' } });
  gsap.from('.step', { y: 80, opacity: 0, rotate: 3, stagger: 0.15, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.steps', start: 'top 80%' } });
}

// ============ HERO ============
function heroIntro() {
  const tl = gsap.timeline({ defaults: { ease: 'back.out(1.8)' } });
  tl.from('.ht', { yPercent: 130, rotate: (i) => (i % 2 ? 20 : -20), opacity: 0, duration: 0.9, stagger: 0.07 })
    .from('.hero-meta', { y: -30, opacity: 0, duration: 0.6 }, '-=0.6')
    .from('.hero-lede', { y: 40, opacity: 0, duration: 0.7 }, '-=0.5')
    .from('.hero-sub', { y: 30, opacity: 0, duration: 0.6 }, '-=0.5')
    .from('.hero-cta > *', { y: 30, opacity: 0, stagger: 0.1, duration: 0.6 }, '-=0.4')
    .from('.hero-sticker', { scale: 0, rotate: -90, duration: 0.8 }, '-=0.4')
    .from('.hero-jp', { opacity: 0, y: -40, duration: 0.8 }, '-=0.6')
    .from('.nav > *', { y: -60, opacity: 0, stagger: 0.08, duration: 0.6 }, 0.2)
    .from('.ticker', { yPercent: 100, opacity: 0, duration: 0.8 }, 0.6);
  setTimeout(() => { rin.play('wave', 1.6); say(rin, 'Oh! Hi. Welcome to Hoshimachi.'); }, 1800);

  // letters: hover jiggle, click spin
  $$('.ht').forEach((el, i) => {
    el.addEventListener('mouseenter', () => { gsap.fromTo(el, { rotate: 0 }, { rotate: i % 2 ? 12 : -12, y: -20, duration: 0.25, yoyo: true, repeat: 1, ease: 'power2.out' }); audio.blip(0.8 + i * 0.12); });
    el.addEventListener('click', () => { gsap.fromTo(el, { rotateY: 0 }, { rotateY: 360, duration: 0.8, ease: 'back.out(2)' }); audio.pop(['C5', 'D5', 'E5', 'G5', 'A5', 'C6'][i]); confetti.burst(el.getBoundingClientRect().left + 40, el.getBoundingClientRect().top + 40, 14, 0.5); });
  });
  // parallax on scroll
  gsap.to('.hero-title', { yPercent: -30, rotate: -9, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero-sticker', { y: -200, rotate: 90, scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // drag the planet
  let drag = null;
  canvas.style.pointerEvents = 'auto';
  const hero = $('#hero');
  hero.addEventListener('pointerdown', (e) => { if (e.target.closest('a,button,.ht')) return; drag = { x: e.clientX, t: performance.now() }; cursor.classList.add('drag'); });
  addEventListener('pointermove', (e) => { if (!drag) return; const dx = e.clientX - drag.x; drag.x = e.clientX; dragYaw -= dx * 0.004; orbitVel = -dx * 0.0008; });
  addEventListener('pointerup', () => { if (drag) { cursor.classList.remove('drag'); drag = null; } });
}

// ============ TICKER ============
function ticker() {
  const track = $('#ticker');
  track.innerHTML += track.innerHTML; // loop
  let x = 0, hover = false;
  track.addEventListener('mouseenter', () => hover = true);
  track.addEventListener('mouseleave', () => hover = false);
  gsap.ticker.add((t, dt) => {
    const speed = hover ? 0.3 : 1 + tickerBoost;
    tickerBoost *= 0.92;
    x -= speed * dt * 0.06;
    const w = track.scrollWidth / 2;
    if (-x > w) x += w;
    track.style.transform = `translateX(${x}px)`;
  });
}

// ============ STORY ============
function story() {
  $('#pb-img').src = portrait('rin', 'happy') || portrait('rin');
  const badge = $('#pressbadge');
  const holo = $('.pb-holo');
  badge.addEventListener('mousemove', (e) => {
    const r = badge.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    gsap.to(badge, { rotateY: px * 24, rotateX: -py * 24, duration: 0.4, ease: 'power2.out' });
    holo.style.backgroundPosition = `${50 + px * 100}% ${50 + py * 100}%`;
  });
  badge.addEventListener('mouseleave', () => gsap.to(badge, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1, 0.4)' }));
  const lines = ['Hi! I am Rin. I ask people things.', 'My notebook is empty. For now.', 'Want to come with me? Press play.', 'Please stop poking my badge. Kidding. Keep going.', 'The Chief says I talk too much. He is right.'];
  let li = 0;
  badge.addEventListener('click', () => {
    const t = lines[li++ % lines.length];
    $('#pb-say').textContent = t;
    gsap.fromTo('#pb-say', { scale: 0.4, rotate: -20 }, { scale: 1, rotate: -6, duration: 0.5, ease: 'back.out(3)' });
    gsap.fromTo(badge, { rotateZ: -6 }, { rotateZ: 0, duration: 0.8, ease: 'elastic.out(1, 0.3)' });
    rin.play(['wave', 'cheer', 'think', 'write'][li % 4], 1.4);
    rin.exprBase = 'happy';
    setTimeout(() => rin.exprBase = 'neutral', 2000);
    say(rin, t);
    audio.pop('A5');
  });
  // sticky notes pop
  $$('.note').forEach((n, i) => n.addEventListener('click', () => {
    gsap.fromTo(n, { rotate: 0 }, { rotate: (i % 2 ? 1 : -1) * 10, duration: 0.15, yoyo: true, repeat: 3 });
    audio.page();
  }));
}

// ============ TOWN ============
function town() {
  const POI = {
    herald: ['The Herald HQ', 'Star fountain', 'Kiosk'], station: ['Elevated train', 'Florist', 'Vending row'], shrine: ['Torii path', 'Bell', 'Sakura'],
    park: ['Swings', 'Hinata High', 'Hoop'], beach: ['Pier', 'Lighthouse', 'Lifeguard tower'], alley: ['Ramen Hirano', 'Lanterns', 'Neon'], homes: ['Danchi blocks', 'Hoshi Mart', 'Bus stop'],
  };
  const track = $('#town-track');
  track.innerHTML = DISTRICTS.map((d, i) => `
    <article class="dcard" data-i="${i}" data-cursor="read">
      <span class="dfig">${String(i + 1).padStart(2, '0')}</span>
      <span class="dn">DISTRICT ${String(i + 1).padStart(2, '0')}</span>
      <div class="djp">${d.jp}</div>
      <h3>${d.name}</h3>
      <p>${d.blurb}</p>
      <div class="dchips">${POI[d.id].map((p) => `<span>${p}</span>`).join('')}</div>
    </article>`).join('');
  const dots = $('#mini-dots');
  dots.innerHTML = DISTRICTS.map((d, i) => {
    const a = (d.lon * DEG), rr = 44 * Math.cos(d.lat * DEG) * 0.9;
    return `<circle class="md" data-i="${i}" cx="${50 + Math.sin(a) * rr}" cy="${50 - Math.cos(a) * rr}" r="4"/>`;
  }).join('');
  const cards = $$('.dcard');
  const setActive = (i) => {
    cards.forEach((c, k) => c.classList.toggle('on', k === i));
    $$('.md').forEach((c, k) => c.classList.toggle('on', k === i));
    $('#mini-label').textContent = DISTRICTS[i].name;
  };
  setActive(0);
  let lastI = -1;
  const dist = () => track.scrollWidth - innerWidth + (isMobile() ? 40 : 160);
  gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: '#town', start: 'top top', end: () => '+=' + (dist() + innerHeight * 0.6), pin: '.town-pin', scrub: 1, invalidateOnRefresh: true,
      onUpdate: (s) => {
        const f = s.progress * (DISTRICTS.length - 1);
        townIdx = Math.min(DISTRICTS.length - 2, Math.floor(f));
        townBlend = THREE.MathUtils.smoothstep(f - townIdx, 0.25, 0.75);
        const i = Math.round(f);
        if (i !== lastI) { lastI = i; setActive(i); audio.pop(['C5', 'D5', 'E5', 'F#5', 'A5', 'B5', 'D6'][i]); }
      },
    },
  });
  cards.forEach((c, i) => c.addEventListener('click', () => { const ch = cast.find((x) => x.c.district === DISTRICTS[i].id); if (ch) { ch.ch.play('wave', 1.4); say(ch.ch, ch.c.idle[0]); } }));
}

// ============ PEOPLE ============
function people() {
  const box = $('#cast');
  const list = [{ id: 'rin', name: HERO.name, role: HERO.role, bio: HERO.bio, line: 'I ask. You answer. Then the whole town reads it.', color: '#ffd60a' }, ...CAST.map((c) => ({ id: c.id, name: c.name, role: c.role, bio: c.bio, line: c.idle[0], color: c.color }))];
  box.innerHTML = list.map((p) => `
    <div class="pcard ${p.id === 'rin' ? 'hero-card' : ''}" style="--c:${p.color}" data-id="${p.id}" data-cursor="ask" tabindex="0">
      <div class="pc-inner">
        <div class="pc-face"><img src="${portrait(p.id)}" alt="${p.name}" loading="lazy"/><div class="pc-tag"><h3>${p.name}</h3><small>${p.role}</small></div></div>
        <div class="pc-back"><div class="bub">${p.line}</div><p>${p.bio}</p><div class="who">${p.name.split(' ')[0]}</div></div>
      </div>
    </div>`).join('');
  bindCursor(box);
  const pitch = (i) => 0.7 + (i % 6) * 0.13;
  $$('.pcard').forEach((el, i) => {
    const flip = (v) => { el.classList.toggle('flip', v); if (v) { audio.blip(pitch(i)); setTimeout(() => audio.blip(pitch(i) * 1.1), 70); setTimeout(() => audio.blip(pitch(i)), 140); } };
    if (!coarse) { el.addEventListener('mouseenter', () => flip(true)); el.addEventListener('mouseleave', () => flip(false)); }
    el.addEventListener('click', () => flip(!el.classList.contains('flip')));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(!el.classList.contains('flip')); } });
  });
  gsap.from('.pcard', { y: 120, opacity: 0, rotate: (i) => (i % 2 ? 6 : -6), stagger: 0.06, duration: 0.9, ease: 'back.out(1.4)', scrollTrigger: { trigger: '#cast', start: 'top 85%' } });
}

// ============ TOPICS ============
const STATS = { plastic: ['9%', 'recycled'], lonely: ['1 in 6', 'people'], privacy: ['9%', 'read them'], heat: ['25°C', 'cooler in shade'], local: ['3x', 'more stays local'] };
function topics() {
  const ol = $('#tlist');
  const votes = store.get('votes', {});
  const CAST_BY = Object.fromEntries(CAST.map((c) => [c.id, c]));
  ol.innerHTML = ASSIGNMENTS.map((a) => `
    <li class="trow" data-id="${a.id}" data-cursor="read">
      <div class="trow-head"><span class="tno">${a.no}</span><h3>${a.title}<small>${a.jp}</small></h3><span class="ttopic">${a.topic}</span></div>
      <div class="trow-body"><div>
          <div class="tstat" data-v="${STATS[a.id][0]}">${STATS[a.id][0]}</div>
          <p class="tfact">${a.fact}</p><span class="tsrc">${a.factSource}</span>
        </div><div>
          <p class="tbrief">${a.brief}</p>
          <div class="tvoices">${a.voices.map((v) => `<img src="${portrait(v)}" alt="${CAST_BY[v].name}" title="${CAST_BY[v].name}"/>`).join('')}</div>
          <p class="tip">${a.tip}</p>
        </div><div class="tpoll">
          <p>Your take?</p>
          <div class="opts">${['Agree', 'Not sure', 'Disagree'].map((o, i) => `<button data-v="${i}" class="${votes[a.id] === i ? 'picked' : ''}" data-cursor="ask">${o}</button>`).join('')}</div>
          <div class="thanks">${votes[a.id] !== undefined ? 'Noted. Rin wrote it down.' : ''}</div>
        </div></div>
    </li>`).join('');
  bindCursor(ol);
  const prev = $('#tpreview');
  const rows = $$('.trow');
  const open = (row) => {
    rows.forEach((r) => { if (r !== row) { r.classList.remove('open'); r.querySelector('.trow-body').style.height = '0px'; } });
    const body = row.querySelector('.trow-body');
    const isOpen = row.classList.toggle('open');
    body.style.height = isOpen ? body.scrollHeight + 'px' : '0px';
    if (isOpen) {
      audio.whoosh();
      const st = row.querySelector('.tstat');
      const raw = st.dataset.v;
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));
      const suffix = raw.replace(/^[0-9.]+/, '');
      const prefix = raw.match(/^[^0-9]*/)[0];
      if (!isNaN(num) && !raw.includes(' in ')) gsap.fromTo({ v: 0 }, { v: 0 }, { v: num, duration: 1.4, ease: 'power3.out', onUpdate() { st.textContent = prefix + Math.round(this.targets()[0].v) + suffix; } });
      gsap.from(row.querySelectorAll('.tvoices img'), { y: 30, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'back.out(2)' });
    }
    setTimeout(() => ScrollTrigger.refresh(), 520);
  };
  rows.forEach((row) => {
    const a = ASSIGNMENTS.find((x) => x.id === row.dataset.id);
    row.querySelector('.trow-head').addEventListener('click', () => open(row));
    row.addEventListener('mouseenter', () => {
      if (coarse) return;
      prev.innerHTML = a.voices.map((v) => `<img src="${portrait(v)}" alt=""/>`).join('');
      prev.classList.add('on');
    });
    row.addEventListener('mouseleave', () => prev.classList.remove('on'));
    row.querySelectorAll('.tpoll button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      row.querySelectorAll('.tpoll button').forEach((x) => x.classList.remove('picked'));
      b.classList.add('picked');
      votes[a.id] = +b.dataset.v;
      store.set('votes', votes);
      const msgs = ['Noted. Rin wrote it down.', 'Fair. Not everything has an easy answer.', 'Good. Disagreement makes a better front page.'];
      row.querySelector('.thanks').textContent = msgs[+b.dataset.v];
      gsap.fromTo(row.querySelector('.thanks'), { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(3)' });
      const r = b.getBoundingClientRect();
      confetti.burst(r.left + r.width / 2, r.top, 30, 0.5);
      audio.chime();
      if (Object.keys(votes).length === ASSIGNMENTS.length && !store.get('allVoted', false)) { store.set('allVoted', true); rinToast('Five takes. You would make a decent reporter. Want the job?'); }
    }));
  });
  let px = 0, py = 0, tx = 0, ty = 0;
  addEventListener('pointermove', (e) => { tx = e.clientX + 140; ty = e.clientY; });
  gsap.ticker.add(() => { px += (tx - px) * 0.12; py += (ty - py) * 0.12; prev.style.left = px + 'px'; prev.style.top = py + 'px'; });
  gsap.from('.trow', { x: -120, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '#tlist', start: 'top 85%' } });
}

// ============ HOW ============
function how() {
  const keys = $$('#keys kbd');
  const press = (k, on) => keys.forEach((el) => { if (el.dataset.k === k) el.classList.toggle('on', on); });
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'shift', ' ', 'e'].includes(k) || k.startsWith('arrow')) {
      const map = { arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd' };
      press(map[k] || k, true);
      if (!e.repeat && isInView('#how')) audio.blip(1 + 'wasd e'.indexOf(map[k] || k) * 0.08);
    }
  });
  addEventListener('keyup', (e) => { const k = e.key.toLowerCase(); const map = { arrowup: 'w', arrowleft: 'a', arrowdown: 's', arrowright: 'd' }; press(map[k] || k, false); });

  // joystick demo
  const joy = $('#joy-demo'), knob = $('.joy-knob');
  let jd = null;
  joy.addEventListener('pointerdown', (e) => { jd = joy.getBoundingClientRect(); joy.setPointerCapture(e.pointerId); move(e); });
  const move = (e) => {
    if (!jd) return;
    let dx = e.clientX - (jd.left + jd.width / 2), dy = e.clientY - (jd.top + jd.height / 2);
    const l = Math.hypot(dx, dy), m = 34;
    if (l > m) { dx *= m / l; dy *= m / l; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    press('w', dy < -12); press('s', dy > 12); press('a', dx < -12); press('d', dx > 12);
  };
  joy.addEventListener('pointermove', move);
  joy.addEventListener('pointerup', () => { jd = null; gsap.to(knob, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)', onComplete: () => knob.style.transform = '' }); knob.style.transform = ''; ['w', 'a', 's', 'd'].forEach((k) => press(k, false)); });

  // dialogue demo
  const hana = CAST.find((c) => c.id === 'hana').interviews.plastic;
  const txt = $('#dd-text');
  let typing = null;
  const type = (s) => {
    clearInterval(typing);
    const words = s.split(' ');
    let i = 0;
    txt.textContent = '';
    typing = setInterval(() => { if (i >= words.length) return clearInterval(typing); txt.textContent += (i ? ' ' : '') + words[i++]; audio.blip(0.9); }, 70);
  };
  $$('#demo-dlg button').forEach((b) => b.addEventListener('click', () => {
    const o = hana.options[+b.dataset.i];
    type(o.reply + ' ' + hana.opinion[0]);
    audio.pop('E5');
  }));

  // mini paper prints when it scrolls in
  ScrollTrigger.create({ trigger: '#mini-paper', start: 'top 70%', onEnter: () => { $('#mini-paper').classList.add('printed'); setTimeout(() => audio.stamp(), 200); } });
  $('#mini-paper').addEventListener('click', () => { const p = $('#mini-paper'); p.classList.remove('printed'); void p.offsetWidth; p.classList.add('printed'); audio.stamp(); confetti.burst(p.getBoundingClientRect().right, p.getBoundingClientRect().bottom, 40, 0.6); });
}
function isInView(sel) { const r = $(sel).getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }

// ============ TIME OF DAY ============
const TIMES = ['morning', 'noon', 'dusk', 'night'];
let timeIdx = 0;
function setTime(i) {
  timeIdx = i;
  const t = TIMES[i];
  document.documentElement.dataset.time = t;
  $('#nav-time-label').textContent = t[0].toUpperCase() + t.slice(1);
  world.setTime(t);
  audio.setMood(t === 'night' ? 'night' : t === 'dusk' ? 'dusk' : 'day');
  $('#hero-weather').textContent = { morning: '21°C · CLEAR', noon: '27°C · SUNNY', dusk: '24°C · GOLDEN', night: '18°C · STARRY' }[t];
  $('meta[name=theme-color]').content = t === 'night' ? '#0b0a1a' : t === 'dusk' ? '#2a1d3d' : '#e63946';
}

// ============ RIN TOAST / IDLE / EGGS ============
let lastActive = performance.now();
function rinToast(text, dur = 5000) {
  const el = $('#rin-toast');
  $('#rt-img').src = portrait('rin', 'happy');
  $('#rt-text').textContent = text;
  el.hidden = false;
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  audio.blip(1.3); setTimeout(() => audio.blip(1.4), 80);
  clearTimeout(rinToast.t);
  rinToast.t = setTimeout(() => { gsap.to(el, { y: 160, duration: 0.5, ease: 'power3.in', onComplete: () => { el.hidden = true; gsap.set(el, { y: 0 }); } }); }, dur);
}
function idle() {
  addEventListener('scroll', () => lastActive = performance.now(), { passive: true });
  addEventListener('keydown', () => lastActive = performance.now());
  const lines = ['Still there? The town is waiting.', 'I could use some help with my notebook.', 'Psst. The play button is right there.', 'Fun fact: you can drag the planet up top.'];
  let n = 0;
  setInterval(() => {
    if (performance.now() - lastActive > 16000 && !$('#loader')) {
      lastActive = performance.now();
      rinToast(lines[n++ % lines.length]);
      rin.play('wave', 1.4);
    }
  }, 2000);
  // type "hello"
  let buf = '';
  const konami = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
  let kbuf = [];
  addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    buf = (buf + k).slice(-5);
    if (buf === 'hello') {
      rinToast('Hello to you too! You found the secret. Have some confetti.');
      confetti.rain(160);
      audio.fanfare();
      rin.play('cheer', 1.6);
      say(rin, 'Hello!!');
    }
    kbuf = [...kbuf, k].slice(-10);
    if (kbuf.join() === konami.join()) { setTime(3); rinToast('Night mode unlocked. The yokocho looks best after dark.'); audio.fanfare(); }
  });
}

// ============ SOUND ============
function sound() {
  const btn = $('#nav-sound');
  const sync = () => btn.classList.toggle('muted', !(audio.started && audio.musicOn));
  audio.on(sync);
  sync();
  btn.addEventListener('click', async () => {
    if (!audio.started) { await audio.start(); audio.toggleMusic(true); }
    else audio.toggleMusic();
    sync();
  });
  $('#nav-time').addEventListener('click', () => { setTime((timeIdx + 1) % TIMES.length); audio.chime(); });
  // menu
  $('#nav-burger').addEventListener('click', () => {
    const m = $('#mnav');
    const open = m.hidden;
    m.hidden = !open;
    $('#nav-burger').setAttribute('aria-expanded', String(open));
    lenis && (open ? lenis.stop() : lenis.start());
    audio.whoosh();
  });
  $$('#mnav a').forEach((a) => a.addEventListener('click', closeMenu));
}
function closeMenu() { const m = $('#mnav'); if (!m.hidden) { m.hidden = true; $('#nav-burger').setAttribute('aria-expanded', 'false'); lenis && lenis.start(); } }

// ============ BOOT ============
(async function main() {
  resize();
  try {
    await bootWorld();
  } catch (e) {
    console.error(e);
    $('#ld-line').textContent = 'WebGL is having a moment. The site still works.';
  }
  frame();
  // enter prompt
  $('#ld-enter').hidden = false;
  gsap.from('#ld-enter', { y: 60, opacity: 0, rotate: 6, duration: 0.7, ease: 'back.out(2)' });
  bindCursor();
  let entered = false;
  const enter = async (withSound) => {
    if (entered) return;
    entered = true;
    if (withSound) { await audio.start(); }
    audio.click();
    const ld = $('#loader');
    ld.classList.add('done');
    gsap.to(ld, { clipPath: 'polygon(0 0, 100% 0, 100% 0, 0 0)', duration: 1, ease: 'power4.inOut', onComplete: () => ld.remove() });
    gsap.set(ld, { clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' });
    document.body.classList.remove('loading');
    setupScroll();
    heroIntro();
    reveals();
    ticker();
    story();
    town();
    people();
    topics();
    how();
    chapterTriggers();
    ScrollTrigger.sort();
    idle();
    sound();
    magnetic();
    bindCursor($('main'));
    $$('a[href="./play.html"]').forEach((a) => a.addEventListener('click', (e) => goPlay(e, a)));
    setTime(0);
    ScrollTrigger.refresh();
  };
  $$('.ld-btn').forEach((b) => b.addEventListener('click', () => enter(b.dataset.sound === '1'), { once: true }));
  addEventListener('keydown', function k(e) { if (e.key === 'Enter' && $('#loader') && !$('#ld-enter').hidden) { removeEventListener('keydown', k); enter(true); } });
})();

window.__site = { world, camera, get shot() { return shot; } };
