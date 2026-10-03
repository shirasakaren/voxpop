import * as THREE from 'three';
import { audio } from '../shared/audio.js';
import { portrait } from '../shared/portraits.js';
import { CAST, HERO, ASSIGNMENTS, SCOOPS, TOWN } from '../data/story.js';
import { Confetti } from '../shared/confetti.js';

const $ = (s) => document.querySelector(s);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const CAST_BY = Object.fromEntries(CAST.map((c) => [c.id, c]));
const TIME_LABEL = { morning: 'MORNING', noon: 'NOON', afternoon: 'AFTERNOON', dusk: 'DUSK', night: 'NIGHT' };
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export class UI {
  constructor() {
    this.confetti = new Confetti($('#confetti'));
    this.bubbles = [];
    this.arrowEls = new Map();
    this.advanceFn = null;
    this.choiceFn = null;
    this.modal = null;
    this.speakerPitch = { rin: 1.35, narrator: 1 };
    CAST.forEach((c, i) => { this.speakerPitch[c.id] = 0.7 + (i % 5) * 0.12; });
    this.speakerPitch.kuroda = 0.6; this.speakerPitch.tetsuo = 0.55; this.speakerPitch.fumi = 1.2;
    $('#dialogue').addEventListener('click', () => this.advance());
    document.querySelectorAll('button, a').forEach((b) => b.addEventListener('mouseenter', () => audio.hover()));
  }

  // ---------- boot ----------
  bootProgress(p) {
    const pct = Math.round(p * 100);
    $('.boot-bar i').style.width = pct + '%';
    $('.boot-pct').textContent = pct + '%';
  }
  bootDone() { $('#boot').classList.add('out'); setTimeout(() => $('#boot').hidden = true, 1000); }

  // ---------- title ----------
  title(hasSave) {
    const el = $('#title');
    el.hidden = false;
    const cont = el.querySelector('[data-act=continue]');
    cont.hidden = !hasSave;
    el.querySelector('.new-label').textContent = hasSave ? 'Start over' : 'Start your first shift';
    const btns = [...el.querySelectorAll('.tbtn')].filter((b) => !b.hidden);
    let sel = 0;
    const mark = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    mark();
    return new Promise((resolve) => {
      const done = (act) => {
        removeEventListener('keydown', onKey);
        audio.start().then(() => audio.click());
        el.style.transition = 'opacity .6s, transform .6s';
        el.style.opacity = '0';
        el.style.transform = 'translateX(-60px)';
        setTimeout(() => { el.hidden = true; el.style = ''; }, 600);
        resolve(act);
      };
      const onKey = (e) => {
        if (e.key === 'ArrowDown') { sel = (sel + 1) % btns.length; mark(); audio.hover(); }
        else if (e.key === 'ArrowUp') { sel = (sel + btns.length - 1) % btns.length; mark(); audio.hover(); }
        else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const b = btns[sel];
          if (b.tagName === 'A') { location.href = b.href; return; }
          done(b.dataset.act);
        }
      };
      addEventListener('keydown', onKey);
      btns.forEach((b, i) => {
        b.addEventListener('mouseenter', () => { sel = i; mark(); });
        if (b.tagName !== 'A') b.addEventListener('click', () => done(b.dataset.act), { once: true });
      });
    });
  }

  // ---------- HUD ----------
  showHud(v = true) { $('#hud').hidden = !v; }
  setAssignment(a, collected, stage) {
    $('#a-no').textContent = a.no;
    $('#a-title').textContent = a.title;
    const dots = $('#a-dots');
    dots.innerHTML = a.voices.map((id) => `<div class="dot ${collected.includes(id) ? 'got' : ''}" title="${CAST_BY[id].name}"><img src="${portrait(id)}" alt=""/></div>`).join('');
    const left = a.voices.length - collected.length;
    $('#a-obj').innerHTML = stage === 'file' ? 'Story ready. <b>Return to the Herald.</b>' : stage === 'done' ? 'Week complete. <b>Explore freely.</b>' : `Find <b>${left}</b> more ${left === 1 ? 'voice' : 'voices'} around town`;
    $('#assign').classList.remove('pulse'); void $('#assign').offsetWidth; $('#assign').classList.add('pulse');
  }
  setCalendar(timeKey, dayIdx) {
    $('#c-date').textContent = `10/${String(5 + dayIdx).padStart(2, '0')}`;
    $('#c-day').textContent = DAYS[dayIdx % DAYS.length];
    $('#c-time').textContent = TIME_LABEL[timeKey] || 'DAY';
    $('#c-icon').classList.toggle('moon', timeKey === 'night');
  }
  setScoops(n) { $('#scoopcount b').textContent = n; }
  setMusicIcon(on) { $('#t-music').classList.toggle('off', !on); }
  notebookBadge(v) { $('#t-note-badge').hidden = !v; }

  prompt(text, key = 'E') {
    const p = $('#prompt');
    if (!text) { if (!p.hidden) p.hidden = true; $('#act').classList.remove('live'); return; }
    if (p.dataset.t !== text) { p.dataset.t = text; $('#p-text').textContent = text; p.hidden = false; p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
    p.hidden = false;
    $('#p-key').textContent = key;
    $('#act').classList.add('live');
    $('#act').textContent = text.split(' ')[0].slice(0, 6).toUpperCase();
  }

  hideHint() { $('#controls-hint').classList.add('hide'); }

  // ---------- speech bubbles ----------
  bubble(ch, text, dur = 2.5, think = false) {
    const el = document.createElement('div');
    el.className = 'bub' + (think ? ' think' : '');
    el.textContent = text;
    $('#bubbles').appendChild(el);
    const b = { el, ch, t: dur };
    this.bubbles.push(b);
    audio.blip(1.1);
    return b;
  }
  updateOverlay(dt, camera, targets) {
    const w = innerWidth, h = innerHeight;
    const v = new THREE.Vector3();
    for (const b of this.bubbles) {
      b.t -= dt;
      v.copy(b.ch.root.position).addScaledVector(b.ch.dir, 2.3);
      v.project(camera);
      const vis = v.z < 1 && b.ch.root.visible;
      b.el.style.display = vis ? '' : 'none';
      b.el.style.left = ((v.x + 1) / 2) * w + 'px';
      b.el.style.top = ((1 - v.y) / 2) * h + 'px';
      if (b.t < 0 && !b.out) { b.out = true; b.el.classList.add('out'); setTimeout(() => b.el.remove(), 260); }
    }
    this.bubbles = this.bubbles.filter((b) => b.t > -0.5);

    // off-screen arrows
    const seen = new Set();
    for (const tg of targets) {
      seen.add(tg.key);
      let el = this.arrowEls.get(tg.key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'arw ' + (tg.kind || '');
        el.innerHTML = `<i></i>${tg.img ? `<img src="${tg.img}" alt=""/>` : ''}`;
        $('#arrows').appendChild(el);
        this.arrowEls.set(tg.key, el);
      }
      v.copy(tg.pos).project(camera);
      const behind = v.z > 1;
      let x = v.x, y = v.y;
      if (behind) { x = -x; y = -y; }
      const onScreen = !behind && Math.abs(x) < 0.92 && Math.abs(y) < 0.88;
      if (onScreen) { el.style.opacity = '0'; continue; }
      const ang = Math.atan2(y, x);
      const m = 0.86;
      const s = Math.max(Math.abs(x) / m, Math.abs(y) / m, 1e-3);
      if (behind || s > 1) { x /= s; y /= s; }
      if (behind && Math.hypot(x, y) < 0.6) { x = Math.cos(ang) * 0.86; y = Math.sin(ang) * 0.86; }
      const px = ((x + 1) / 2) * w, py = ((1 - y) / 2) * h;
      el.style.opacity = '1';
      el.style.transform = `translate(${px}px, ${py}px)`;
      const i = el.querySelector('i');
      i.style.transform = `rotate(${-ang}rad)`;
      const img = el.querySelector('img');
      if (img) { img.style.setProperty('--px', `${-Math.cos(ang) * 38}px`); img.style.setProperty('--py', `${Math.sin(ang) * 38}px`); }
    }
    for (const [k, el] of this.arrowEls) if (!seen.has(k)) { el.remove(); this.arrowEls.delete(k); }
  }

  // ---------- dialogue ----------
  openDialogue() {
    const d = $('#dialogue');
    d.hidden = false;
    this.modal = 'dialogue';
    audio.whoosh();
    audio.muffle(true);
  }
  closeDialogue() {
    const d = $('#dialogue');
    d.hidden = true;
    $('#d-choices').innerHTML = '';
    if (this.modal === 'dialogue') this.modal = null;
    audio.muffle(false);
  }
  speakerInfo(id) {
    if (id === 'rin') return { name: HERO.name, role: HERO.role, img: portrait('rin', 'neutral'), cls: 'rin' };
    if (id === 'narrator') return { name: 'Notebook', role: 'Rin thinks', img: '', cls: 'narr' };
    const c = CAST_BY[id];
    return c ? { name: c.name, role: c.role, img: portrait(id, 'neutral'), cls: '' } : { name: id, role: '', img: '', cls: '' };
  }

  say(id, text, { onStart, onEnd, expr } = {}) {
    const d = $('#dialogue');
    const info = this.speakerInfo(id);
    d.classList.remove('done', 'in');
    void d.offsetWidth;
    if (this.lastSpeaker !== id) d.classList.add('in');
    this.lastSpeaker = id;
    d.classList.toggle('narr', id === 'narrator');
    $('#d-name').textContent = info.name;
    $('#d-role').textContent = info.role;
    const port = $('.dlg-portrait');
    port.className = 'dlg-portrait ' + info.cls + ' talk';
    if (info.img) $('#d-img').src = expr ? (portrait(id, expr) || info.img) : info.img;
    const el = $('#d-text');
    el.innerHTML = '';
    onStart?.();
    const words = text.split(' ');
    let i = 0, finished = false;
    const pitch = this.speakerPitch[id] || 1;
    return new Promise((resolve) => {
      let timer;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearInterval(timer);
        el.innerHTML = words.map((w) => `<span class="w" style="animation:none">${w}</span>`).join(' ');
        d.classList.add('done');
        port.classList.remove('talk');
        onEnd?.();
      };
      timer = setInterval(() => {
        if (i >= words.length) { finish(); return; }
        const span = document.createElement('span');
        span.className = 'w';
        span.textContent = words[i];
        el.appendChild(span);
        el.appendChild(document.createTextNode(' '));
        if (id !== 'narrator') audio.blip(pitch);
        i++;
      }, id === 'narrator' ? 70 : 55);
      this.advanceFn = () => {
        if (!finished) { finish(); return; }
        this.advanceFn = null;
        audio.click();
        resolve();
      };
    });
  }
  advance() { if (this.advanceFn) this.advanceFn(); }

  choose(options) {
    const box = $('#d-choices');
    box.innerHTML = options.map((o, i) => `<button class="choice" data-i="${i}"><b>${i + 1}</b><span>${o.label}<small>${o.sub || ''}</small></span></button>`).join('');
    audio.whoosh();
    let sel = 0;
    const btns = [...box.querySelectorAll('.choice')];
    const mark = () => btns.forEach((b, i) => b.classList.toggle('sel', i === sel));
    mark();
    $('#dialogue').classList.add('done');
    return new Promise((resolve) => {
      const pick = (i) => {
        removeEventListener('keydown', onKey);
        this.choiceFn = null;
        this.advanceFn = null;
        audio.pop('E5');
        btns[i].style.transform = 'translateX(-30px) scale(1.06)';
        setTimeout(() => { box.innerHTML = ''; resolve(i); }, 220);
      };
      const onKey = (e) => {
        if (e.key === 'ArrowDown' || e.key === 's') { sel = (sel + 1) % btns.length; mark(); audio.hover(); }
        if (e.key === 'ArrowUp' || e.key === 'w') { sel = (sel + btns.length - 1) % btns.length; mark(); audio.hover(); }
      };
      addEventListener('keydown', onKey);
      btns.forEach((b, i) => { b.addEventListener('click', (e) => { e.stopPropagation(); pick(i); }); b.addEventListener('mouseenter', () => { sel = i; mark(); }); });
      this.choiceFn = (i) => { if (i < btns.length) pick(i); };
      this.advanceFn = () => pick(sel);
    });
  }

  // ---------- assignment brief ----------
  brief(a) {
    const el = $('#brief');
    $('#b-no').textContent = a.no;
    $('#b-jp').textContent = a.jp;
    $('#b-title').textContent = a.title;
    $('#b-topic').textContent = a.topic;
    $('#b-text').textContent = a.brief;
    $('#b-fact').textContent = a.fact;
    $('#b-src').textContent = a.factSource;
    $('#b-voices').innerHTML = a.voices.map((id) => `<div class="v"><img src="${portrait(id)}" alt=""/><span>${CAST_BY[id].name.split(' ')[0]}<br/><small>${CAST_BY[id].role}</small></span></div>`).join('');
    el.hidden = false;
    this.modal = 'brief';
    audio.shutter();
    return new Promise((resolve) => {
      const go = () => {
        el.hidden = true;
        this.modal = null;
        this.advanceFn = null;
        audio.chime();
        resolve();
      };
      $('#b-go').onclick = go;
      this.advanceFn = go;
    });
  }

  // ---------- stamp ----------
  async stamp(npcId, quote, count) {
    const el = $('#stamp');
    const c = CAST_BY[npcId];
    $('#s-img').src = portrait(npcId, 'happy') || portrait(npcId);
    $('#s-quote').textContent = `“${quote}”`;
    $('#s-who').textContent = `${c.name}, ${c.role}`;
    $('#s-count').textContent = count;
    el.hidden = false;
    const w = el.querySelector('.stamp-wrap');
    w.style.animation = 'none'; void w.offsetWidth; w.style.animation = '';
    const b = el.querySelector('.stamp-badge');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    audio.whoosh();
    setTimeout(() => { audio.stamp(); this.confetti.burst(innerWidth * 0.7, innerHeight * 0.35, 90); audio.sparkle(); }, 450);
    await wait(3200);
    el.hidden = true;
  }

  // ---------- toast ----------
  toast(title, text = '', { red = false, dur = 4 } = {}) {
    const t = document.createElement('div');
    t.className = 'tst' + (red ? ' red' : '');
    t.style.setProperty('--d', dur + 's');
    t.innerHTML = `<b>${title}</b>${text ? `<p>${text}</p>` : ''}`;
    $('#toast').appendChild(t);
    setTimeout(() => t.remove(), dur * 1000 + 500);
  }

  async dayChange(fromIdx, toIdx, timeKey, note) {
    const el = $('#daychange');
    $('#dc-old').innerHTML = `<b>10/${String(5 + fromIdx).padStart(2, '0')}</b><span>${DAYS[fromIdx % 6]}</span>`;
    $('#dc-new').innerHTML = `<b>10/${String(5 + toIdx).padStart(2, '0')}</b><span>${DAYS[toIdx % 6]}</span>`;
    $('#dc-time').textContent = TIME_LABEL[timeKey] || '';
    $('#dc-note').textContent = note;
    el.classList.remove('go');
    el.hidden = false;
    void el.offsetWidth;
    el.classList.add('go');
    audio.whoosh();
    setTimeout(() => audio.page(), 700);
    setTimeout(() => audio.stamp(), 1250);
    setTimeout(() => audio.chime(), 1650);
    await wait(3000);
    el.style.transition = 'opacity .5s';
    el.style.opacity = '0';
    await wait(500);
    el.hidden = true;
    el.style.opacity = '';
    el.classList.remove('go');
  }

  splash(text, sub) {
    const el = $('#splash');
    $('#sp-text').textContent = text;
    $('#sp-sub').textContent = sub;
    el.hidden = true; void el.offsetWidth; el.hidden = false;
    [...el.children].forEach((c) => { c.style.animation = 'none'; void c.offsetWidth; c.style.animation = ''; });
    audio.fanfare();
    setTimeout(() => { el.hidden = true; }, 2500);
  }

  flash() { const f = $('#flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); }
  async fade(on) { $('#fade').classList.toggle('on', on); await wait(650); }

  // ---------- notebook ----------
  openNotebook(state) {
    if (this.modal) return;
    const el = $('#notebook');
    el.hidden = false;
    this.modal = 'notebook';
    audio.page();
    const tabs = $('#nb-tabs');
    const unlocked = state.a;
    const items = ASSIGNMENTS.map((a, i) => ({ key: a.id, label: a.title, sub: `No. ${a.no}`, locked: i > unlocked }));
    items.push({ key: 'scoops', label: 'Scoops', sub: `${state.scoops.length}/${SCOOPS.length} found` });
    items.push({ key: 'about', label: 'About', sub: 'How to play' });
    let cur = ASSIGNMENTS[Math.min(unlocked, ASSIGNMENTS.length - 1)].id;
    const render = () => {
      tabs.innerHTML = items.map((it) => `<button class="nb-tab ${it.key === cur ? 'on' : ''} ${it.locked ? 'locked' : ''}" data-k="${it.key}">${it.label}<small>${it.sub}</small></button>`).join('');
      tabs.querySelectorAll('.nb-tab').forEach((b) => b.onclick = () => { cur = b.dataset.k; audio.page(); render(); });
      const page = $('#nb-page');
      const a = ASSIGNMENTS.find((x) => x.id === cur);
      if (a) {
        const got = state.collected[a.id] || [];
        page.innerHTML = `<h2>${a.title}</h2><p class="sub">${a.topic}. ${got.length}/${a.voices.length} voices.</p>` +
          a.voices.map((id) => {
            const c = CAST_BY[id];
            const has = got.includes(id);
            return `<div class="nb-quote ${has ? '' : 'missing'}"><img src="${portrait(id)}" alt=""/><div><small>${c.name} · ${c.role}</small><p>${has ? '“' + c.interviews[a.id].quote + '”' : 'Not interviewed yet. Look for the red ! marker.'}</p></div></div>`;
          }).join('') +
          `<div class="nb-fact"><b>FACT</b><p>${a.fact}</p><small>${a.factSource}</small></div><div class="nb-fact" style="background:var(--paper)"><b>WHAT YOU CAN DO</b><p>${a.tip}</p></div>`;
      } else if (cur === 'scoops') {
        page.innerHTML = `<h2>Scoops</h2><p class="sub">Little notes hidden around ${TOWN.name}.</p>` + SCOOPS.map((s, i) => state.scoops.includes(i) ? `<div class="nb-scoop"><b>${s.title}</b><p>${s.text}</p></div>` : `<div class="nb-scoop locked"><b>???</b><p>Somewhere out there. Keep walking.</p></div>`).join('');
      } else {
        page.innerHTML = `<h2>How to play</h2><p class="sub">Your job is simple. Ask. Listen. Write it down.</p>
          <div class="nb-scoop"><b>Move</b><p>WASD or arrow keys. Hold Shift to run. On a phone, drag on the left side of the screen.</p></div>
          <div class="nb-scoop"><b>Talk</b><p>Walk up to someone and press E, or tap TALK. Red markers are people with something to say about your assignment.</p></div>
          <div class="nb-scoop"><b>Look around</b><p>Drag with the mouse or right side of the screen. Scroll to zoom.</p></div>
          <div class="nb-scoop"><b>File the story</b><p>When you have four voices, return to Chief Kuroda at the Herald. He prints the front page.</p></div>
          <div class="nb-scoop"><b>Extras</b><p>Pet the cat. Ring the shrine bell. Sit on benches. Find all twelve scoops. Press C for photo mode.</p></div>`;
      }
    };
    render();
    const close = () => this.closeNotebook();
    $('#nb-close').onclick = close;
    this.advanceFn = null;
  }
  closeNotebook() {
    $('#notebook').hidden = true;
    if (this.modal === 'notebook') this.modal = null;
    audio.page();
  }

  // ---------- front page ----------
  frontPage(a, dayIdx) {
    const el = $('#frontpage');
    const paper = $('#paper');
    const quotes = a.voices.map((id) => ({ c: CAST_BY[id], q: CAST_BY[id].interviews[a.id].quote, id }));
    paper.innerHTML = `
      <div class="mast"><h1>The Hoshimachi Herald</h1><small>${TOWN.kanji}新聞<br/>Vol. 61 · No. ${200 + dayIdx}</small></div>
      <div class="strip"><span>${DAYS[dayIdx % 6]}, October ${5 + dayIdx}</span><span>Assignment ${a.no}: ${a.topic}</span><span>¥120</span></div>
      <h2 class="hl">${a.headline}</h2>
      <p class="kick">${a.kicker} Reporting by ${HERO.name}.</p>
      <div class="cols">${quotes.map(({ c, q, id }) => `<div class="q"><img src="${portrait(id)}" alt="${c.name}"/><h4>${c.name}<small>${c.role}</small></h4><p>“${q}”</p></div>`).join('')}</div>
      <div class="box">
        <div class="fact"><b>BY THE NUMBERS</b><p>${a.fact}</p><small>${a.factSource}</small><p>${a.fact2}</p><small>${a.fact2Source}</small></div>
        <div class="act"><b>WHAT YOU CAN DO</b><p>${a.tip}</p></div>
      </div>
      <div class="byline"><span>Story by ${HERO.name}</span><span>Edited by G. Kuroda</span></div>
      <div class="ex">EXCLUSIVE</div>`;
    el.hidden = false;
    this.modal = 'front';
    paper.classList.remove('spin'); void paper.offsetWidth; paper.classList.add('spin');
    audio.whoosh();
    setTimeout(() => { audio.stamp(); this.confetti.burst(innerWidth / 2, innerHeight / 3, 160); audio.fanfare(); }, 1000);
    return new Promise((resolve) => {
      const go = () => {
        this.advanceFn = null;
        audio.click();
        paper.style.transition = 'transform .6s var(--ease-out), opacity .6s';
        paper.style.transform = 'translateY(-120vh) rotate(-20deg)';
        setTimeout(() => { el.hidden = true; paper.style = ''; this.modal = null; resolve(); }, 600);
      };
      $('#fp-print').onclick = go;
      setTimeout(() => { this.advanceFn = go; }, 1100);
    });
  }

  // ---------- pause ----------
  openPause() {
    if (this.modal) return false;
    $('#pause').hidden = false;
    this.modal = 'pause';
    audio.whoosh();
    audio.muffle(true);
    return true;
  }
  closePause() { $('#pause').hidden = true; if (this.modal === 'pause') this.modal = null; audio.muffle(false); }

  // ---------- ending ----------
  async ending(lines) {
    const el = $('#ending');
    const box = $('#end-lines');
    box.innerHTML = lines.map((l) => `<p>${l}</p>`).join('');
    el.hidden = false;
    this.modal = 'ending';
    const ps = [...box.children];
    for (const p of ps) { await wait(400); p.classList.add('on'); audio.pop('A4'); await wait(1900); }
    const cr = $('#credits');
    cr.innerHTML = `<p>VOXPOP · A short story about listening</p><p>Thank you for playing. Now go ask someone how they are.</p><button class="bigbtn" id="end-go">Keep exploring</button>`;
    cr.classList.add('on');
    audio.fanfare();
    this.confetti.burst(innerWidth / 2, innerHeight / 2, 220);
    return new Promise((resolve) => {
      const go = () => { el.hidden = true; this.modal = null; this.advanceFn = null; resolve(); };
      $('#end-go').onclick = go;
      this.advanceFn = go;
    });
  }
}
