import '@fontsource/dela-gothic-one';
import * as THREE from 'three';
import { Character, RIN_LOOK } from '../world/characters.js';
import { CAST } from '../data/story.js';
const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(1);
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#f3efe6');
const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 100);
scene.add(new THREE.HemisphereLight('#ffffff', '#776655', 1.2));
const sun = new THREE.DirectionalLight('#ffffff', 2.4); sun.position.set(3, 5, 6); scene.add(sun);
const looks = [{ ...RIN_LOOK }, ...CAST.map((c) => ({ ...c.look, id: c.id }))];
const only = q.get('only');
const list = only ? looks.filter((l) => l.id === only) : looks;
const chars = list.map((l, i) => {
  const c = new Character(l);
  c.root.position.x = (i - (list.length - 1) / 2) * 1.0;
  if (q.get('ry')) c.root.rotation.y = +q.get('ry');
  scene.add(c.root);
  if (q.get('expr')) { c.exprBase = q.get('expr'); }
  if (q.get('speed')) c.speed = +q.get('speed');
  return c;
});
const zoom = only ? 2.6 : list.length * 1.25;
camera.position.set(0, only ? 1.45 : 1.2, zoom);
camera.lookAt(0, only ? 1.25 : 0.95, 0);
let f = 0;
function loop() {
  chars.forEach((c) => c.update(0.016));
  renderer.render(scene, camera);
  if (++f < 3) requestAnimationFrame(loop); else window.__done = true;
}
loop();
