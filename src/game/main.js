import '../shared/fonts.js';
import '../shared/base.css';
import './game.css';
import * as THREE from 'three';
import { World } from '../world/world.js';
import { R, DEG } from '../world/sphere.js';
import { Player, CameraRig } from './player.js';
import { NPCs } from './npcs.js';
import { Input } from './input.js';
import { UI } from './ui.js';
import { audio, store } from '../shared/audio.js';
import { renderPortraits, portrait } from '../shared/portraits.js';
import { ASSIGNMENTS, CAST, SCOOPS, PROPS, ENDING, DISTRICTS } from '../data/story.js';

const SAVE_KEY = 'save-v1';
const CAST_BY = Object.fromEntries(CAST.map((c) => [c.id, c]));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- quality ----------
const coarse = matchMedia('(pointer: coarse)').matches;
let quality = store.get('quality', coarse ? 'low' : 'medium');
const qs = new URLSearchParams(location.search);
if (qs.get('q')) quality = qs.get('q');

const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: quality !== 'low', powerPreference: 'high-performance' });
const maxDpr = { low: 1.25, medium: 1.6, high: 2 }[quality] || 1.5;
renderer.setPixelRatio(qs.get('pr') ? +qs.get('pr') : Math.min(devicePixelRatio || 1, maxDpr));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = quality !== 'low';
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 1200);
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.fov = camera.aspect < 0.8 ? 58 : camera.aspect < 1.2 ? 50 : 42;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const ui = new UI();
const world = new World(scene, { quality });

// ---------- state ----------
const fresh = () => ({ a: 0, stage: 'intro', collected: {}, scoops: [], petted: false, rang: false });
let state = store.get(SAVE_KEY, null);
const hadSave = !!(state && (state.a > 0 || state.stage !== 'intro'));
if (!state) state = fresh();
const save = () => store.set(SAVE_KEY, state);

let player, rig, npcs, input;
let mode = 'boot'; // boot | title | fly | play
let busy = false;
let talkingTo = null;
let photo = false;
let idleT = 0;
let flyT = 0;
const flyFrom = { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3() };

async function boot() {
  await world.build((p) => ui.bootProgress(p * 0.85));
  ui.bootProgress(0.9);
  await wait(20);
  renderPortraits();
  ui.bootProgress(0.97);

  const site = world.districtSite('herald');
  const d = site.dir(0, 3.4);
  player = new Player(world, d, site.fwd(d, 0));
  player.camF.copy(player.fwd);
  rig = new CameraRig(camera, player, world);
  npcs = new NPCs(world, player);
  npcs.onKick = (k) => { if (k === 1) ui.bubble(player.char, 'Oops. Sorry, ball.', 2, true); if (k === 15) { ui.toast('Side story', 'Fifteen kicks. The Hinata High team might want you.'); audio.chime(); } };
  input = new Input(canvas, ui);
  bindInput();
  applyAssignmentLook(true);
  // compile shaders once before revealing
  camera.position.set(0, 0, 95); camera.lookAt(0, 0, 0);
  renderer.compile(scene, camera);
  ui.bootProgress(1);
  await wait(250);
  ui.bootDone();
  mode = 'title';
  loop();
  const choice = await ui.title(hadSave);
  if (choice === 'new') { state = fresh(); save(); }
  startFly();
}

function startFly() {
  flyFrom.pos.copy(camera.position);
  flyFrom.look.set(0, 0, 0);
  flyFrom.up.copy(camera.up);
  rig.snap();
  flyT = 0;
  mode = 'fly';
  audio.whoosh();
}

async function enterPlay() {
  mode = 'play';
  ui.showHud(true);
  refreshHud();
  setTimeout(() => ui.hideHint(), 14000);
  if (state.stage === 'intro' || state.stage === 'assign') await assignmentIntro();
  else if (state.stage === 'file') ui.toast('Welcome back', 'Your story is ready. Take it to Chief Kuroda.');
  else if (state.stage === 'done') ui.toast('Welcome back', 'The week is done. The town is all yours.');
  else ui.toast('Welcome back', 'Your notebook is right where you left it.');
}

// ---------- helpers ----------
const curA = () => ASSIGNMENTS[Math.min(state.a, ASSIGNMENTS.length - 1)];
const got = () => (state.collected[curA().id] ||= []);

function applyAssignmentLook(instant = false) {
  const a = curA();
  const t = state.stage === 'done' ? 'night' : a.time;
  world.setTime(t, instant);
  audio.setMood(t === 'night' ? 'night' : t === 'dusk' ? 'dusk' : 'day');
  ui.setCalendar(t, Math.min(state.a, 4));
  updateMarkers();
}

function updateMarkers() {
  const map = {};
  const a = curA();
  if (state.stage === 'collect') a.voices.forEach((id) => { if (!got().includes(id)) map[id] = 'voice'; });
  if (state.stage === 'file' || state.stage === 'intro' || state.stage === 'assign') map.kuroda = 'file';
  npcs?.setMarkers(map);
}

function refreshHud() {
  ui.setAssignment(curA(), got(), state.stage);
  ui.setScoops(state.scoops.length);
  ui.setMusicIcon(audio.musicOn);
  updateMarkers();
}

function facePlayerTo(pos) {
  const to = pos.clone().sub(player.pos);
  to.addScaledVector(player.dir, -to.dot(player.dir));
  if (to.lengthSq() > 1e-4) player.fwd.copy(to.normalize());
}

async function conversation(n, fn) {
  busy = true;
  talkingTo = n;
  player.frozen = true;
  ui.prompt(null);
  facePlayerTo(n.ch.root.position);
  rig.frameDialogue(n.ch.root.position);
  ui.openDialogue();
  try { await fn(); } finally {
    ui.closeDialogue();
    rig.release();
    n.ch.talking = false; player.char.talking = false;
    n.ch.exprBase = 'neutral'; player.char.exprBase = 'neutral';
    talkingTo = null;
    player.frozen = false;
    busy = false;
  }
}

function sayAs(id, text, ch) {
  const isRin = id === 'rin';
  const c = isRin ? player.char : ch;
  return ui.say(id, text, {
    onStart: () => { if (c) c.talking = true; },
    onEnd: () => { if (c) c.talking = false; },
  });
}

// ---------- flows ----------
async function assignmentIntro() {
  const a = curA();
  state.stage = 'assign'; save();
  const k = npcs.byId.kuroda;
  await conversation(k, async () => {
    if (state.a === 0) {
      await sayAs('narrator', 'Monday. 8:02 a.m. First week at the Herald. Rin checks her microphone for the fifth time.');
    }
    for (const line of a.chiefOpen) await sayAs('kuroda', line, k.ch);
    k.ch.play('nod', 1);
    await sayAs('rin', state.a === 0 ? 'Four voices. Got it, Chief. I will not let you down.' : 'On it, Chief.');
    player.char.play('cheer', 1);
  });
  await ui.brief(a);
  state.stage = 'collect';
  state.collected[a.id] = state.collected[a.id] || [];
  save();
  refreshHud();
  if (state.a === 0) setTimeout(() => ui.toast('Tip', 'Follow the red arrows to people with something to say. Press E to talk.'), 600);
}

async function interview(n) {
  const a = curA();
  const iv = n.data.interviews[a.id];
  await conversation(n, async () => {
    for (const l of iv.intro) await sayAs(n.id, l, n.ch);
    const i = await ui.choose(iv.options.map((o) => ({ label: o.label, sub: `“${o.rin}”` })));
    const opt = iv.options[i];
    await sayAs('rin', opt.rin);
    n.ch.exprBase = 'neutral';
    await sayAs(n.id, opt.reply, n.ch);
    for (const l of iv.opinion) await sayAs(n.id, l, n.ch);
    player.char.play('write', 2.4);
    n.ch.exprBase = 'happy';
    got().push(n.id);
    save();
    ui.closeDialogue();
    await ui.stamp(n.id, iv.quote, `${got().length}/${a.voices.length}`);
    ui.openDialogue();
    await sayAs('narrator', iv.react);
  });
  refreshHud();
  ui.notebookBadge(true);
  if (got().length >= a.voices.length) {
    state.stage = 'file'; save();
    refreshHud();
    ui.splash('SCOOP!', 'Story complete');
    ui.confetti.rain(80);
    ui.toast('Story ready!', 'Four voices. Take your notes back to Chief Kuroda at the Herald.', { red: true, dur: 6 });
    player.char.play('cheer', 1.4);
  }
}

async function fileStory() {
  const a = curA();
  const k = npcs.byId.kuroda;
  await conversation(k, async () => {
    await sayAs('rin', 'Chief. I have them. Four voices.');
    for (const line of a.chiefClose) await sayAs('kuroda', line, k.ch);
  });
  await ui.frontPage(a, state.a);
  if (state.a >= ASSIGNMENTS.length - 1) {
    state.stage = 'done'; save();
    world.setTime('night');
    audio.setMood('night');
    await ui.ending(ENDING);
    refreshHud();
    applyAssignmentLook();
    return;
  }
  const from = state.a;
  state.a += 1;
  state.stage = 'assign';
  save();
  const dc = ui.dayChange(from, state.a, curA().time, ['A new day. A new question.', 'The town wakes up. So do the questions.', 'Another page to fill.', 'Last day of the week. Make it count.'][Math.min(from, 3)]);
  await wait(1200);
  applyAssignmentLook(true);
  refreshHud();
  await dc;
  await assignmentIntro();
}

async function chatter(n) {
  const a = curA();
  await conversation(n, async () => {
    if (n.id === 'kuroda') {
      if (state.stage === 'collect') {
        const missing = a.voices.filter((id) => !got().includes(id));
        const m = CAST_BY[missing[0]];
        const dist = DISTRICTS.find((d) => d.id === m.district);
        await sayAs('kuroda', `${got().length} of ${a.voices.length}. Not bad. Not done.`, n.ch);
        await sayAs('kuroda', `${m.name.split(' ')[0]} is usually around ${dist.name}. Start there.`, n.ch);
      } else if (state.stage === 'done') {
        await sayAs('kuroda', 'Week is over, Sakuraba. Go home. Or walk around. Both count as rest.', n.ch);
        await sayAs('kuroda', 'Next week I have a story about the night buses. Think about it.', n.ch);
      } else {
        await sayAs('kuroda', n.data.idle[Math.floor(Math.random() * n.data.idle.length)], n.ch);
      }
      return;
    }
    const iv = n.data.interviews?.[a.id];
    if (iv && got().includes(n.id)) {
      n.ch.exprBase = 'happy';
      await sayAs(n.id, iv.after, n.ch);
      return;
    }
    // past interview memory
    const past = Object.entries(n.data.interviews || {}).find(([aid]) => (state.collected[aid] || []).includes(n.id));
    const line = n.data.idle[Math.floor(Math.random() * n.data.idle.length)];
    await sayAs(n.id, line, n.ch);
    if (past && Math.random() < 0.5) await sayAs(n.id, 'I saw my quote in the paper, by the way. My mother framed it.', n.ch);
  });
}

async function useProp(it) {
  busy = true;
  const c = player.char;
  if (it.kind === 'vending') {
    facePlayerTo(it.d.clone().multiplyScalar(R));
    audio.pop('C4'); await wait(250); audio.stamp();
    ui.bubble(c, PROPS.vending, 3, true);
    c.play('cheer', 0.9);
    ui.confetti.burst(innerWidth / 2, innerHeight / 2, 18, 0.5);
  } else if (it.kind === 'bell') {
    c.play('wave', 1.2);
    audio.shrineBell();
    rig.shake = 0.4;
    ui.bubble(c, PROPS.bell, 3.2, true);
    ui.confetti.burst(innerWidth / 2, innerHeight * 0.3, 40, 0.7);
    if (!state.rang) { state.rang = true; save(); ui.toast('A wish, made', 'Fumi says the bell sounds like rain. She is right.'); }
  } else if (it.kind === 'bench') {
    // sit until the player moves
    player.fwd.copy(it.f);
    c.state = 'sit';
    ui.bubble(c, PROPS.bench, 3, true);
    rig.targetDist = 9;
    busy = false;
    const t0 = performance.now();
    while (true) {
      await wait(100);
      if (Math.hypot(input.move.x, input.move.y) > 0.2 && performance.now() - t0 > 400) break;
    }
    c.state = 'idle';
    rig.targetDist = 14;
    return;
  } else if (it.kind === 'cat') {
    facePlayerTo(it.cat.root.position);
    c.play('pet', 1.6);
    audio.meow();
    await wait(400);
    ui.confetti.burst(innerWidth / 2, innerHeight / 2, 16, 0.4);
    ui.bubble(c, PROPS.cat, 2.6, true);
    it.cat.follow = 90;
    if (!state.petted) { state.petted = true; save(); ui.toast('New friend', 'Mochi the cat will follow you around for a while.'); }
  }
  await wait(700);
  busy = false;
}

// ---------- interaction targeting ----------
function currentTarget() {
  if (!player) return null;
  const n = npcs.nearest(2.5);
  if (n) {
    const a = curA();
    const isVoice = state.stage === 'collect' && a.voices.includes(n.id) && !got().includes(n.id);
    const isFile = n.id === 'kuroda' && (state.stage === 'file' || state.stage === 'assign' || state.stage === 'intro');
    const first = n.data.name.split(' ')[0];
    return { type: 'npc', n, label: isFile ? (state.stage === 'file' ? 'File the story' : 'Talk to the Chief') : isVoice ? `Interview ${first}` : `Talk to ${first}` };
  }
  let best = null, bd = 1e9;
  for (const it of world.interacts) {
    const dist = it.d.angleTo(player.dir) * R;
    if (dist < it.radius && dist < bd) { bd = dist; best = it; }
  }
  if (best) {
    const label = { vending: 'Buy a drink', bell: 'Ring the bell', bench: 'Sit down', cat: 'Pet the cat' }[best.kind];
    return { type: 'prop', it: best, label };
  }
  return null;
}

function interact() {
  if (mode !== 'play' || busy || ui.modal || photo) return;
  const t = currentTarget();
  if (!t) { player.char.play('think', 1.0); return; }
  idleT = 0;
  if (t.type === 'npc') {
    const n = t.n;
    const a = curA();
    if (n.id === 'kuroda' && state.stage === 'file') return fileStory();
    if (n.id === 'kuroda' && (state.stage === 'assign' || state.stage === 'intro')) return assignmentIntro();
    if (state.stage === 'collect' && a.voices.includes(n.id) && !got().includes(n.id)) return interview(n);
    return chatter(n);
  }
  return useProp(t.it);
}

function bindInput() {
  input.on('advance', () => { if (ui.modal || ui.advanceFn) ui.advance(); });
  input.on('interact', interact);
  input.on('jump', () => { if (mode === 'play' && !busy && !ui.modal) player.jump(); });
  input.on('choice', (i) => ui.choiceFn?.(i));
  input.on('notebook', () => {
    if (mode !== 'play') return;
    if (ui.modal === 'notebook') ui.closeNotebook();
    else if (!busy && !ui.modal) { ui.openNotebook(state); ui.notebookBadge(false); }
  });
  input.on('pause', () => {
    if (mode !== 'play') return;
    if (photo) return togglePhoto();
    if (ui.modal === 'notebook') return ui.closeNotebook();
    if (ui.modal === 'pause') return ui.closePause();
    if (!busy) ui.openPause();
  });
  input.on('music', () => { audio.toggleMusic(); ui.setMusicIcon(audio.musicOn); });
  input.on('photo', () => { if (mode === 'play' && !busy && !ui.modal) togglePhoto(); });
  input.on('wave', () => {
    if (mode !== 'play' || busy || ui.modal) return;
    player.char.play('wave', 1.2);
    for (const f of [...npcs.folk.map((f) => f.ch), ...npcs.cast.map((n) => n.ch)]) {
      if (f.root.position.distanceTo(player.pos) < 6) setTimeout(() => f.play('wave', 1.2), 300 + Math.random() * 400);
    }
  });
  input.on('click', () => { if (ui.advanceFn) ui.advance(); });

  const $ = (s) => document.querySelector(s);
  $('#act').addEventListener('click', (e) => { e.stopPropagation(); audio.start(); if (ui.modal || ui.advanceFn) ui.advance(); else interact(); });
  $('#jumpbtn').addEventListener('click', (e) => { e.stopPropagation(); player.jump(); });
  $('#t-note').addEventListener('click', () => input.emit('notebook'));
  $('#t-music').addEventListener('click', () => input.emit('music'));
  $('#t-pause').addEventListener('click', () => input.emit('pause'));
  $('#notebook').addEventListener('click', (e) => { if (e.target.id === 'notebook') ui.closeNotebook(); });

  // pause menu
  const sm = $('#set-music'), sf = $('#set-sfx'), sq = $('#set-quality');
  sm.value = audio.musicVol; sf.value = audio.sfxVol; sq.value = quality;
  sm.oninput = () => { audio.setMusicVol(+sm.value); if (!audio.musicOn) audio.toggleMusic(true); ui.setMusicIcon(true); };
  sf.oninput = () => { audio.setSfxVol(+sf.value); audio.blip(1.2); };
  sq.onchange = () => { store.set('quality', sq.value); ui.toast('Quality saved', 'Reloading to apply.'); setTimeout(() => location.reload(), 900); };
  document.querySelectorAll('#pause [data-act]').forEach((b) => b.addEventListener('click', () => {
    const act = b.dataset.act;
    if (act === 'resume') ui.closePause();
    if (act === 'notebook') { ui.closePause(); ui.openNotebook(state); }
    if (act === 'reset') { if (confirm('Start the week over? Your notebook will be cleared.')) { store.set(SAVE_KEY, fresh()); location.reload(); } }
  }));
}

function togglePhoto() {
  photo = !photo;
  document.body.classList.toggle('photo', photo);
  player.frozen = photo;
  if (!photo) {
    // capture
    renderer.render(scene, camera);
    const url = canvas.toDataURL('image/png');
    ui.flash();
    audio.shutter();
    const a = document.createElement('a');
    a.href = url; a.download = 'voxpop-photo.png';
    a.click();
    ui.toast('Snap!', 'Photo saved to your downloads.');
  } else {
    audio.shutter();
  }
}

// ---------- idle micro moments ----------
const IDLE_THOUGHTS = {
  collect: ['Who should I ask next?', 'Red markers. Follow the red markers.', 'My notebook feels lighter than it should.'],
  file: ['The Chief is going to love this.', 'Back to the Herald. Quickly.'],
  done: ['What a week.', 'I think I like this town.', 'The stars are out.'],
  assign: ['The Chief is waiting.'],
  intro: ['The Chief is waiting.'],
};
function idleTick(dt) {
  if (busy || ui.modal || photo) { idleT = 0; return; }
  if (performance.now() - input.lastActive < 300) { idleT = 0; return; }
  idleT += dt;
  if (idleT > 11) {
    idleT = 0;
    const acts = ['think', 'stretch', 'write', 'wave'];
    player.char.play(acts[Math.floor(Math.random() * acts.length)], 1.6);
    const list = IDLE_THOUGHTS[state.stage] || IDLE_THOUGHTS.collect;
    ui.bubble(player.char, list[Math.floor(Math.random() * list.length)], 3, true);
    if (state.stage === 'collect' && Math.random() < 0.6) {
      const left = curA().voices.length - got().length;
      if (left) setTimeout(() => ui.toast('Hint', `${left} ${left === 1 ? 'voice' : 'voices'} left. Follow the red arrows on the screen edge.`), 800);
    }
  }
}

// ---------- scoops ----------
function scoopTick() {
  for (const s of npcs.scoops) {
    if (s.taken) continue;
    if (state.scoops.includes(s.i)) { s.taken = true; s.group.visible = false; continue; }
    if (s.d.angleTo(player.dir) * R < 1.5) {
      s.taken = true;
      state.scoops.push(s.i); save();
      s.group.visible = false;
      audio.sparkle();
      ui.confetti.burst(innerWidth / 2, innerHeight / 2, 40, 0.6);
      ui.toast(`Scoop ${state.scoops.length}/${SCOOPS.length}: ${s.data.title}`, s.data.text, { dur: 6 });
      ui.setScoops(state.scoops.length);
      ui.notebookBadge(true);
      player.char.play('cheer', 0.9);
      if (state.scoops.length === SCOOPS.length) setTimeout(() => { ui.toast('Every scoop found!', 'You know this town better than the Chief does. Do not tell him.', { red: true, dur: 7 }); audio.fanfare(); ui.confetti.rain(150); }, 1500);
    }
  }
}

// ---------- loop ----------
let last = performance.now();
let perf = { t: 0, n: 0, checked: false };
function loop() {
  requestAnimationFrame(loop);
  const now = performance.now();
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;

  if (mode === 'title') {
    const a = t * 0.06;
    const d = new THREE.Vector3(Math.sin(a) * 0.9, 0.55, Math.cos(a) * 0.9).normalize();
    camera.position.copy(d).multiplyScalar(innerWidth > innerHeight ? 128 : 175);
    camera.up.set(0, 1, 0);
    const portrait = innerWidth / innerHeight < 0.8;
    camera.lookAt(new THREE.Vector3(0, portrait ? 52 : 0, 0).addScaledVector(new THREE.Vector3(Math.cos(a), 0, -Math.sin(a)), innerWidth > innerHeight ? -26 : 0));
    world.update(dt, d, camera);
    player.char.update(dt);
    npcs.update(dt, t, ui, null);
  } else if (mode === 'fly' || mode === 'play') {
    input.update();
    if (mode === 'play') {
      player.update(dt, input);
      rig.update(dt, input);
    } else {
      player.update(dt, { move: { x: 0, y: 0 } });
      rig.update(dt, { consumeCam: () => ({ x: 0, y: 0 }), consumeZoom: () => 0 });
      flyT += dt / 2.4;
      const k = flyT >= 1 ? 1 : 1 - Math.pow(1 - flyT, 3);
      const pos = flyFrom.pos.clone().lerp(rig.pos, k);
      // arc over the planet
      pos.normalize().multiplyScalar(THREE.MathUtils.lerp(flyFrom.pos.length(), rig.pos.length(), k) + Math.sin(k * Math.PI) * 14);
      camera.position.copy(pos);
      camera.up.copy(flyFrom.up).lerp(rig.up, k).normalize();
      camera.lookAt(flyFrom.look.clone().lerp(rig.look, k));
      if (flyT >= 1) enterPlay();
    }
    world.update(dt, player.dir, camera);
    npcs.update(dt, t, ui, talkingTo);
    if (mode === 'play') {
      const tg = (!busy && !ui.modal) ? currentTarget() : null;
      ui.prompt(tg ? tg.label : null, 'E');
      const targets = [];
      for (const n of npcs.cast) if (n.marker.visible || (n.mark && !n.ch.root.visible)) targets.push({ key: n.id, pos: n.marker.position.lengthSq() ? n.marker.position : n.ch.root.position, img: portrait(n.id), kind: n.mark === 'file' ? 'file' : '' });
      ui.updateOverlay(dt, camera, busy || ui.modal ? [] : targets);
      idleTick(dt);
      scoopTick();
      // adaptive quality
      if (!perf.checked) {
        perf.t += dt; perf.n++;
        if (perf.t > 4) {
          perf.checked = true;
          const avg = perf.t / perf.n;
          if (avg > 0.04 && renderer.getPixelRatio() > 1 && !qs.get('pr')) { renderer.setPixelRatio(1); }
        }
      }
    }
  }
  renderer.render(scene, camera);
}

boot().catch((e) => {
  console.error(e);
  const b = document.querySelector('.boot-label');
  if (b) b.textContent = 'Something went wrong. Try refreshing, or use a browser with WebGL.';
});

// debug hooks for testing
window.__vox = {
  renderer, get state() { return state; }, get player() { return player; }, ui, world, get mode() { return mode; }, interact, get busy() { return busy; },
  near(id) {
    const n = npcs.byId[id];
    const d = n.ch.dir.clone().multiplyScalar(R).addScaledVector(n.ch.fwd, 1.7).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(player.dir, d);
    player.rotateAll(q); player.dir.copy(d); player.orthonormalize();
    world.place(player.char.root, player.dir, player.fwd);
    rig.snap();
  },
  setState(s) { Object.assign(state, s); save(); refreshHud(); applyAssignmentLook(true); },
};
