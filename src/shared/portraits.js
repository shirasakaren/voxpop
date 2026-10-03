// Renders character head portraits to data URLs with a tiny offscreen renderer.
import * as THREE from 'three';
import { Character, RIN_LOOK } from '../world/characters.js';
import { CAST } from '../data/story.js';

const cache = {};

export function renderPortraits(size = 256, exprs = ['neutral', 'happy']) {
  if (cache.done) return cache;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch (e) { cache.done = true; return cache; }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#806a5a', 1.3));
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(2, 3, 4);
  scene.add(sun);
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  const looks = [{ ...RIN_LOOK }, ...CAST.map((c) => ({ ...c.look, id: c.id }))];
  for (const look of looks) {
    const ch = new Character(look);
    ch.shadow.visible = false;
    ch.update(0.016);
    scene.add(ch.root);
    const hy = 1.42 * ch.scaleBase;
    cam.position.set(0.32, hy + 0.05, 1.55);
    cam.lookAt(0, hy - 0.04, 0);
    cache[look.id] = {};
    for (const e of exprs) {
      ch.setExpression(e);
      renderer.render(scene, cam);
      cache[look.id][e] = canvas.toDataURL('image/png');
    }
    scene.remove(ch.root);
  }
  renderer.dispose();
  renderer.forceContextLoss?.();
  cache.done = true;
  return cache;
}

export function portrait(id, expr = 'neutral') {
  return cache[id]?.[expr] || cache[id]?.neutral || '';
}
