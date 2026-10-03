import * as THREE from 'three';

export const R = 40; // planet radius
export const SEA_LEVEL = -0.55;
export const DEG = Math.PI / 180;

const _v = new THREE.Vector3();
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);

export function dirFromLatLon(lat, lon, out = new THREE.Vector3()) {
  const la = lat * DEG, lo = lon * DEG;
  return out.set(Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo));
}

export function latLonFromDir(d) {
  return { lat: Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / DEG, lon: Math.atan2(d.x, d.z) / DEG };
}

export function eastAt(up, out = new THREE.Vector3()) {
  out.crossVectors(Y, up);
  if (out.lengthSq() < 1e-6) out.copy(X);
  return out.normalize();
}
export function northAt(up, out = new THREE.Vector3()) {
  const e = eastAt(up, _v);
  return out.crossVectors(up, e).normalize();
}

export function forwardFromHeading(up, headingDeg, out = new THREE.Vector3()) {
  const e = eastAt(up, new THREE.Vector3());
  const n = new THREE.Vector3().crossVectors(up, e);
  const h = headingDeg * DEG;
  return out.copy(n).multiplyScalar(Math.cos(h)).addScaledVector(e, Math.sin(h)).normalize();
}

// Basis matrix: x = right, y = up, z = forward
export function basisMatrix(up, forward, pos, out = new THREE.Matrix4()) {
  const right = new THREE.Vector3().crossVectors(up, forward).normalize();
  const f = new THREE.Vector3().crossVectors(right, up).normalize();
  out.makeBasis(right, up, f);
  out.setPosition(pos);
  return out;
}

export function angleBetween(a, b) {
  return Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));
}

function smooth(e0, e1, x) {
  const t = THREE.MathUtils.clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Terrain features. Kept in sync with nothing in GLSL; geometry is displaced on the CPU.
export const SHRINE_DIR = dirFromLatLon(46, 130);
export const ISLAND_DIR = dirFromLatLon(-73, 60);
export const PIER = { lon: 60, latA: -47, latB: -70, halfWidth: 0.85 };

export function heightAt(d) {
  let h = 0;
  // shrine hill
  const as = angleBetween(d, SHRINE_DIR) / DEG;
  h += 2.4 * (1 - smooth(4, 15, as));
  // sea basin in the south
  const lat = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / DEG;
  h -= 2.6 * smooth(-47, -56, lat);
  // little island with the lighthouse
  const ai = angleBetween(d, ISLAND_DIR) / DEG;
  h += 3.0 * (1 - smooth(3.5, 7, ai)) * smooth(-60, -68, lat);
  // soft rolling noise away from the town
  h += 0.18 * Math.sin(d.x * 9.1 + d.y * 3.3) * Math.sin(d.z * 7.7 - d.x * 2.1);
  return h;
}

export function pierDistance(d) {
  // distance (world units) from the pier center line, plus whether we're within its lat span
  const { lat, lon } = latLonFromDir(d);
  let dl = ((lon - PIER.lon + 540) % 360) - 180;
  const inSpan = lat < PIER.latA + 1 && lat > PIER.latB - 1;
  const dist = Math.abs(dl * DEG) * Math.cos(lat * DEG) * R;
  return { dist, inSpan };
}

export const PIER_DECK = 0.15;

// Walkable height (accounts for the pier deck). Returns null if not walkable.
export function groundAt(d) {
  const h = heightAt(d);
  const p = pierDistance(d);
  const onPier = p.inSpan && p.dist < PIER.halfWidth;
  if (onPier) return Math.max(h, PIER_DECK);
  if (h < SEA_LEVEL + 0.05) return null;
  return h;
}

export function surfacePoint(d, lift = 0, out = new THREE.Vector3()) {
  return out.copy(d).multiplyScalar(R + heightAt(d) + lift);
}

// Rotate a vector around an axis
export function rotateAround(v, axis, angle) {
  return v.applyAxisAngle(axis, angle);
}
