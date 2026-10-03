// Generative acid-jazz loop + synthesized sound effects. No audio files needed.
import * as Tone from 'tone';

const store = {
  get(k, d) { try { const v = localStorage.getItem('voxpop-' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('voxpop-' + k, JSON.stringify(v)); } catch { /* private mode */ } },
};

class AudioEngine {
  constructor() {
    this.started = false;
    this.musicOn = store.get('music', true);
    this.sfxOn = store.get('sfx', true);
    this.musicVol = store.get('musicVol', 0.7);
    this.sfxVol = store.get('sfxVol', 0.8);
    this.mood = 'day';
    this.listeners = new Set();
  }

  async start() {
    if (this.started) return;
    try {
      await Tone.start();
    } catch (e) { return; }
    this.started = true;
    this.build();
    this.applyVolumes();
    if (this.musicOn) this.playMusic();
    this.emit();
  }

  build() {
    const T = Tone;
    this.master = new T.Volume(-4).toDestination();
    this.musicBus = new T.Volume(-10).connect(this.master);
    this.sfxBus = new T.Volume(-6).connect(this.master);
    this.reverb = new T.Reverb({ decay: 2.8, wet: 0.25 }).connect(this.musicBus);
    this.lowpass = new T.Filter(5200, 'lowpass').connect(this.reverb);
    this.chorus = new T.Chorus(2.5, 2.2, 0.35).start().connect(this.lowpass);

    this.keys = new T.PolySynth(T.FMSynth, {
      harmonicity: 3.01, modulationIndex: 7,
      oscillator: { type: 'sine' }, modulation: { type: 'sine' },
      envelope: { attack: 0.005, decay: 1.4, sustain: 0.18, release: 1.4 },
      modulationEnvelope: { attack: 0.002, decay: 0.4, sustain: 0.05, release: 0.6 },
      volume: -15,
    }).connect(this.chorus);
    this.bass = new T.MonoSynth({
      oscillator: { type: 'triangle' }, filter: { Q: 1, type: 'lowpass' },
      envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.3 },
      filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.3, baseFrequency: 160, octaves: 2.2 },
      volume: -9,
    }).connect(this.lowpass);
    this.kick = new T.MembraneSynth({ pitchDecay: 0.03, octaves: 5, envelope: { attack: 0.001, decay: 0.32, sustain: 0 }, volume: -13 }).connect(this.musicBus);
    this.snare = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.001, decay: 0.16, sustain: 0 }, volume: -25 }).connect(this.reverb);
    this.hat = new T.MetalSynth({ envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, harmonicity: 5.1, modulationIndex: 32, resonance: 5000, octaves: 1.5, volume: -36 }).connect(this.musicBus);
    this.bell = new T.PolySynth(T.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: 0.002, decay: 0.6, sustain: 0, release: 0.8 }, volume: -22 }).connect(this.reverb);

    // Progression: Gmaj9 | F#m7 | Em9 | A13  (IV iii ii V in D)
    const chords = [
      ['G3', 'B3', 'D4', 'F#4', 'A4'], ['F#3', 'A3', 'C#4', 'E4'], ['E3', 'G3', 'B3', 'D4', 'F#4'], ['A3', 'C#4', 'G4', 'B4', 'F#4'],
      ['G3', 'B3', 'D4', 'F#4', 'A4'], ['F#3', 'A3', 'C#4', 'E4'], ['B2', 'D4', 'F#4', 'A4'], ['E3', 'G#3', 'D4', 'F#4'],
    ];
    const roots = ['G1', 'F#1', 'E1', 'A1', 'G1', 'F#1', 'B1', 'E1'];
    const walk = {
      G1: ['G1', 'B1', 'D2', 'E2'], 'F#1': ['F#1', 'A1', 'C#2', 'A1'], E1: ['E1', 'G1', 'B1', 'G#1'], A1: ['A1', 'C#2', 'E2', 'G1'],
      B1: ['B1', 'D2', 'F#2', 'D2'],
    };
    const scale = ['D5', 'E5', 'F#5', 'A5', 'B5', 'D6', 'C#6'];
    T.Transport.bpm.value = 90;
    T.Transport.swing = 0.35;
    T.Transport.swingSubdivision = '8n';
    let bar = 0;
    this.loop = new T.Loop((time) => {
      const i = bar % chords.length;
      const c = chords[i];
      const night = this.mood === 'night';
      // comping: anticipated stabs
      this.keys.triggerAttackRelease(c, '2n', time + T.Time('8n').toSeconds() * 0, 0.5);
      if (bar % 2 === 1) this.keys.triggerAttackRelease(c.slice(1), '8n', time + T.Time('4n').toSeconds() * 2.5, 0.35);
      // walking bass
      const w = walk[roots[i]] || [roots[i]];
      w.forEach((n, k) => this.bass.triggerAttackRelease(n, '8n', time + T.Time('4n').toSeconds() * k, 0.8));
      // drums
      for (let k = 0; k < 4; k++) {
        const t = time + T.Time('4n').toSeconds() * k;
        if (k === 0 || k === 2.5) this.kick.triggerAttackRelease('C1', '8n', t);
        if (k === 1 || k === 3) this.snare.triggerAttackRelease('16n', t);
        this.hat.triggerAttackRelease('C6', '32n', t, 0.6);
        this.hat.triggerAttackRelease('C6', '32n', t + T.Time('8n').toSeconds(), 0.3);
      }
      if (!night) this.kick.triggerAttackRelease('C1', '8n', time + T.Time('4n').toSeconds() * 2.5);
      // sparkle melody
      if (Math.random() < (night ? 0.4 : 0.7)) {
        for (let k = 0; k < 3; k++) {
          if (Math.random() < 0.55) this.bell.triggerAttackRelease(scale[Math.floor(Math.random() * scale.length)], '16n', time + T.Time('8n').toSeconds() * (k * 2 + 1 + Math.floor(Math.random() * 2)), 0.5);
        }
      }
      bar++;
    }, '1m');

    // SFX voices
    this.blipSyn = new T.Synth({ oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.04, sustain: 0, release: 0.02 }, volume: -22 }).connect(this.sfxBus);
    this.popSyn = new T.MembraneSynth({ pitchDecay: 0.02, octaves: 3, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -8 }).connect(this.sfxBus);
    this.thud = new T.MembraneSynth({ pitchDecay: 0.08, octaves: 6, envelope: { attack: 0.001, decay: 0.4, sustain: 0 }, volume: -2 }).connect(this.sfxBus);
    this.noise = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.12, sustain: 0 }, volume: -18 }).connect(this.sfxBus);
    this.whooshF = new T.AutoFilter({ frequency: 1, baseFrequency: 300, octaves: 4 }).connect(this.sfxBus).start();
    this.whooshN = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: 0.08, decay: 0.3, sustain: 0 }, volume: -16 }).connect(this.whooshF);
    this.chimeSyn = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 0.002, decay: 0.8, sustain: 0, release: 0.8 }, volume: -12 }).connect(this.sfxBus);
    this.bellBig = new T.MetalSynth({ envelope: { attack: 0.001, decay: 2.4, release: 1.5 }, harmonicity: 3.1, modulationIndex: 16, resonance: 900, octaves: 1.2, volume: -18 }).connect(this.sfxBus);
  }

  applyVolumes() {
    if (!this.started) return;
    this.musicBus.volume.rampTo(this.musicOn ? Tone.gainToDb(Math.max(0.0001, this.musicVol * 0.5)) : -80, 0.3);
    this.sfxBus.volume.rampTo(this.sfxOn ? Tone.gainToDb(Math.max(0.0001, this.sfxVol * 0.8)) : -80, 0.1);
  }

  playMusic() {
    if (!this.started) return;
    if (Tone.Transport.state !== 'started') { this.loop.start(0); Tone.Transport.start('+0.05'); }
  }

  setMood(m) {
    this.mood = m;
    if (!this.started) return;
    const cut = { day: 5200, dusk: 3600, night: 2200, muffled: 900 }[m] || 5200;
    this.lowpass.frequency.rampTo(cut, 1.5);
    Tone.Transport.bpm.rampTo(m === 'night' ? 82 : 90, 2);
  }
  muffle(on) { if (this.started) this.lowpass.frequency.rampTo(on ? 900 : ({ day: 5200, dusk: 3600, night: 2200 }[this.mood] || 5200), 0.4); }

  toggleMusic(v = !this.musicOn) { this.musicOn = v; store.set('music', v); if (v) this.playMusic(); this.applyVolumes(); this.emit(); }
  toggleSfx(v = !this.sfxOn) { this.sfxOn = v; store.set('sfx', v); this.applyVolumes(); this.emit(); }
  setMusicVol(v) { this.musicVol = v; store.set('musicVol', v); this.applyVolumes(); }
  setSfxVol(v) { this.sfxVol = v; store.set('sfxVol', v); this.applyVolumes(); }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach((f) => f(this)); }

  // ---- SFX ----
  ok() { return this.started && this.sfxOn; }
  now() { return Tone.now(); }
  blip(pitch = 1) { if (!this.ok()) return; this.blipSyn.triggerAttackRelease(380 * pitch * (0.95 + Math.random() * 0.1), 0.03, this.now() + 0.001); }
  hover() { if (!this.ok()) return; this.blipSyn.triggerAttackRelease(1200 + Math.random() * 200, 0.02, this.now() + 0.001, 0.4); }
  click() { if (!this.ok()) return; this.popSyn.triggerAttackRelease('C4', '16n', this.now() + 0.001); }
  pop(n = 'G4') { if (!this.ok()) return; this.popSyn.triggerAttackRelease(n, '16n', this.now() + 0.001); }
  stamp() { if (!this.ok()) return; this.thud.triggerAttackRelease('A0', '8n', this.now() + 0.001); this.noise.triggerAttackRelease('16n', this.now() + 0.01); }
  whoosh() { if (!this.ok()) return; this.whooshN.triggerAttackRelease('8n', this.now() + 0.001); }
  chime() { if (!this.ok()) return; const t = this.now() + 0.01; ['D5', 'F#5', 'A5', 'D6'].forEach((n, i) => this.chimeSyn.triggerAttackRelease(n, '8n', t + i * 0.07, 0.6)); }
  fanfare() { if (!this.ok()) return; const t = this.now() + 0.01; ['D5', 'A5', 'F#5', 'D6', 'E6', 'F#6'].forEach((n, i) => this.chimeSyn.triggerAttackRelease(n, '8n', t + i * 0.09, 0.7)); this.thud.triggerAttackRelease('D1', '8n', t); }
  sparkle() { if (!this.ok()) return; const t = this.now() + 0.01; for (let i = 0; i < 5; i++) this.chimeSyn.triggerAttackRelease(['A5', 'C#6', 'E6', 'A6', 'B6'][i], '32n', t + i * 0.04, 0.3); }
  step() { if (!this.ok()) return; this.noise.triggerAttackRelease('64n', this.now() + 0.001, 0.15); }
  shutter() { if (!this.ok()) return; const t = this.now() + 0.001; this.noise.triggerAttackRelease('32n', t, 0.8); this.noise.triggerAttackRelease('32n', t + 0.07, 0.6); }
  shrineBell() { if (!this.ok()) return; this.bellBig.triggerAttackRelease('C3', '2n', this.now() + 0.001); }
  meow() { if (!this.ok()) return; const s = this.blipSyn; const t = this.now() + 0.001; s.triggerAttackRelease(900, 0.05, t); s.triggerAttackRelease(700, 0.08, t + 0.06); }
  page() { if (!this.ok()) return; this.whooshN.triggerAttackRelease('16n', this.now() + 0.001); }
  error() { if (!this.ok()) return; this.blipSyn.triggerAttackRelease(160, 0.08, this.now() + 0.001); }
}

export const audio = new AudioEngine();
export { store };
