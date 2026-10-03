import '@fontsource/dela-gothic-one';
import '@fontsource/anton';
import '@fontsource/zen-kaku-gothic-new/700.css';
import '@fontsource/space-grotesk';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { World } from '../world/world.js';
import { dirFromLatLon, forwardFromHeading } from '../world/sphere.js';
import { RIN_LOOK } from '../world/characters.js';
import { CAST } from '../data/story.js';

const q = new URLSearchParams(location.search);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 2000);
const world = new World(scene, { quality: q.get('q') || 'medium' });
await world.build();
world.setTime(q.get('time') || 'morning', true);
const lat = +(q.get('lat') ?? 60), lon = +(q.get('lon') ?? 0), dist = +(q.get('d') ?? 120);
const d = dirFromLatLon(lat, lon);
camera.position.copy(d).multiplyScalar(dist);
const ctr = new OrbitControls(camera, renderer.domElement);
if (q.get('close')) {
  const t = dirFromLatLon(+q.get('tlat'), +q.get('tlon')).multiplyScalar(40);
  ctr.target.copy(t);
  camera.position.copy(t).add(dirFromLatLon(+q.get('tlat'), +q.get('tlon')).multiplyScalar(+q.get('close'))).add(new THREE.Vector3(+(q.get('ox')||0), +(q.get('oy')||0), +(q.get('oz')||0)));
}
const rl = +(q.get('rlat') ?? 84), rlo = +(q.get('rlon') ?? 0);
const rin = world.spawn(RIN_LOOK, dirFromLatLon(rl, rlo), forwardFromHeading(dirFromLatLon(rl, rlo), +(q.get('rh') ?? 180)));
if (q.get('cast')) {
  const look = CAST.find((c) => c.id === q.get('cast')).look;
  world.spawn({ ...look, id: q.get('cast') }, dirFromLatLon(rl, rlo + 2), forwardFromHeading(dirFromLatLon(rl, rlo + 2), +(q.get('rh') ?? 180)));
}
if (q.get('lineup')) {
  CAST.forEach((c, i) => { const dd = dirFromLatLon(rl - 0.1, rlo - 9 + i * 1.8); world.spawn({ ...c.look, id: c.id }, dd, forwardFromHeading(dd, 180)); });
}
window.world = world;
const clock = new THREE.Clock();
function loop() {
  const dt = Math.min(clock.getDelta(), 0.05);
  ctr.update();
  camera.up.copy(ctr.target.lengthSq() > 1 ? ctr.target.clone().normalize() : new THREE.Vector3(0,1,0));
  world.update(dt, ctr.target.lengthSq() > 1 ? ctr.target.clone().normalize() : d, camera);
  world.characters.forEach((c) => c.update(dt));
  renderer.render(scene, camera);
  frames++;
  if (!q.get('still') || frames < +q.get('still')) requestAnimationFrame(loop);
  else { window.__done = true; console.log('done', performance.now() - t0); }
}
let frames = 0; const t0 = performance.now();
loop();
window.__ready = true;
