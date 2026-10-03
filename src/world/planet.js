import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { R, SEA_LEVEL, heightAt, dirFromLatLon, DEG } from './sphere.js';
import { toonMat } from './toon.js';

// Road network (lat, lon) waypoints. Each pair is one great-circle segment.
const LL = (a, b) => [a, b];
export const ROADS = [
  // spokes from the Herald
  LL([90, 0], [38, 0]), LL([90, 0], [36, 120]), LL([90, 0], [36, 240]),
  // northern ring
  LL([38, 0], [37, 60]), LL([37, 60], [36, 120]), LL([36, 120], [37, 180]), LL([37, 180], [36, 240]), LL([36, 240], [37, 300]), LL([37, 300], [38, 0]),
  // down to the south
  LL([38, 0], [6, 32]), LL([6, 32], [-30, 60]),
  LL([36, 120], [8, 150]), LL([8, 150], [-18, 180]),
  LL([36, 240], [8, 270]), LL([8, 270], [-18, 300]),
  // southern ring
  LL([-30, 60], [-24, 120]), LL([-24, 120], [-18, 180]), LL([-18, 180], [-20, 240]), LL([-20, 240], [-18, 300]), LL([-18, 300], [-26, 0]), LL([-26, 0], [-30, 60]),
  // to the pier
  LL([-30, 60], [-46, 60]),
];

export const PLAZAS = [
  { id: 'herald', lat: 90, lon: 0, r: 11, type: 0 },
  { id: 'station', lat: 38, lon: 0, r: 8.5, type: 1 },
  { id: 'shrine', lat: 46, lon: 130, r: 5.5, type: 2 },
  { id: 'park', lat: 36, lon: 240, r: 9, type: 3 },
  { id: 'alley', lat: -18, lon: 180, r: 7, type: 4 },
  { id: 'homes', lat: -18, lon: 300, r: 8, type: 5 },
  { id: 'beach', lat: -30, lon: 60, r: 6, type: 6 },
  { id: 'shrineGate', lat: 36, lon: 120, r: 3.5, type: 2 },
];

export const ROAD_HALF = 1.15; // world units

const groundGLSL = /* glsl */ `
uniform vec3 uRoadA[24];
uniform vec3 uRoadB[24];
uniform int uRoadN;
uniform vec4 uPlaza[8];
uniform float uPlazaType[8];
uniform float uR;
varying vec3 vPDir;

float hash3(vec3 p){ p = fract(p*0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise(vec3 x){
  vec3 i = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash3(i+vec3(0,0,0)),hash3(i+vec3(1,0,0)),f.x), mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x), mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y), f.z);
}

vec3 groundColor(vec3 p, float hgt){
  float lat = asin(clamp(p.y,-1.0,1.0));
  // grass
  float n = vnoise(p*18.0);
  float n2 = vnoise(p*60.0);
  vec3 col = mix(vec3(0.36,0.66,0.33), vec3(0.50,0.78,0.40), smoothstep(0.3,0.75,n));
  col = mix(col, vec3(0.30,0.56,0.30), step(0.82, n2)*0.6);
  // tiny flowers
  vec3 cell = floor(p*uR*1.6);
  float fh = hash3(cell);
  if (fh > 0.985) {
    vec3 fc = fh > 0.993 ? vec3(1.0,0.85,0.3) : vec3(1.0,0.6,0.75);
    vec3 local = fract(p*uR*1.6) - 0.5;
    if (length(local) < 0.18) col = fc;
  }
  // sand and seabed
  float sand = smoothstep(-0.70, -0.74, lat);
  col = mix(col, vec3(0.96,0.87,0.66) - n2*0.05, sand);
  float wet = smoothstep(-0.835, -0.862, lat);
  col = mix(col, vec3(0.80,0.70,0.52), wet);
  if (hgt < -0.6) col = mix(col, vec3(0.45,0.62,0.6), smoothstep(-0.6,-1.8,hgt));

  // plazas
  for (int i = 0; i < 8; i++) {
    vec4 pl = uPlaza[i];
    float c = dot(p, pl.xyz);
    if (c > pl.w) {
      float t = uPlazaType[i];
      vec3 e = normalize(cross(vec3(0.0,1.0,0.0001), pl.xyz));
      vec3 nn = cross(pl.xyz, e);
      vec2 uv = vec2(dot(p, e), dot(p, nn)) * uR;
      float edge = (c - pl.w) / (1.0 - pl.w);
      vec3 pc;
      if (t < 0.5) { // herald: brick + star mosaic
        vec2 g = uv * vec2(1.2, 2.4);
        g.x += step(1.0, mod(floor(g.y),2.0))*0.5;
        vec2 f = fract(g);
        float grout = step(0.08, f.x)*step(0.1, f.y);
        pc = mix(vec3(0.55,0.27,0.22), vec3(0.78,0.42,0.32) - hash3(vec3(floor(g),1.0))*0.12, grout);
        float r = length(uv);
        float ang = atan(uv.y, uv.x);
        float star = 2.6 + 1.4*cos(ang*5.0);
        if (r < star*1.2) pc = mix(vec3(0.97,0.94,0.86), vec3(0.9,0.22,0.27), step(r, star*0.75));
        if (abs(r - 4.8) < 0.18) pc = vec3(0.97,0.94,0.86);
      } else if (t < 1.5) { // station: stone squares
        vec2 f = fract(uv*0.8);
        pc = mix(vec3(0.62,0.62,0.66), vec3(0.80,0.79,0.80) - hash3(vec3(floor(uv*0.8),2.0))*0.08, step(0.06,f.x)*step(0.06,f.y));
        if (abs(uv.x) < 0.4) pc = vec3(0.95,0.85,0.25);
      } else if (t < 2.5) { // shrine gravel
        pc = vec3(0.88,0.86,0.80) - n2*0.18;
        if (abs(uv.x) < 0.9) pc = mix(vec3(0.65,0.63,0.62), vec3(0.75,0.73,0.71), step(0.1, fract(uv.y*0.9)));
      } else if (t < 3.5) { // park: dirt paths in grass
        float ring = abs(length(uv) - 5.5);
        pc = col;
        if (ring < 1.0 || abs(uv.x) < 0.9 || abs(uv.y) < 0.9) pc = vec3(0.86,0.74,0.55) - n2*0.08;
        if (length(uv - vec2(-3.0, 2.0)) < 2.2) pc = vec3(0.92,0.80,0.6);
      } else if (t < 4.5) { // alley cobble
        vec2 g = uv * 1.6;
        g.x += step(1.0, mod(floor(g.y),2.0))*0.5;
        vec2 f = fract(g);
        pc = mix(vec3(0.20,0.19,0.25), vec3(0.34,0.32,0.40) - hash3(vec3(floor(g),4.0))*0.1, step(0.1,f.x)*step(0.12,f.y));
      } else if (t < 5.5) { // homes concrete
        vec2 f = fract(uv*0.5);
        pc = mix(vec3(0.66,0.66,0.62), vec3(0.78,0.77,0.73), step(0.03,f.x)*step(0.03,f.y));
      } else { // boardwalk
        vec2 f = fract(uv*vec2(0.3, 2.2));
        pc = mix(vec3(0.48,0.33,0.22), vec3(0.72,0.53,0.36) - hash3(vec3(floor(uv*vec2(0.3,2.2)),6.0))*0.08, step(0.1,f.y));
      }
      // curb ring
      float curb = smoothstep(0.0, 0.015, edge);
      col = mix(vec3(0.88,0.87,0.84), pc, curb);
    }
  }

  // roads
  float best = 1e9; float along = 0.0;
  for (int i = 0; i < 24; i++) {
    if (i >= uRoadN) break;
    vec3 a = uRoadA[i]; vec3 b = uRoadB[i];
    vec3 nrm = normalize(cross(a, b));
    float d = abs(dot(p, nrm)) * uR;
    if (d < best) {
      vec3 pp = normalize(p - nrm*dot(p,nrm));
      if (dot(cross(a, pp), nrm) > -0.002 && dot(cross(pp, b), nrm) > -0.002) {
        best = d;
        along = atan(dot(pp, cross(nrm, a)), dot(pp, a)) * uR;
      }
    }
  }
  float roadHalf = ${ROAD_HALF.toFixed(2)};
  if (best < roadHalf + 0.35) {
    vec3 rc = vec3(0.24,0.25,0.33) + n2*0.03;
    if (best > roadHalf) rc = vec3(0.86,0.85,0.82);
    else if (best > roadHalf - 0.12) rc = vec3(0.95);
    else if (best < 0.06 && fract(along*0.35) < 0.5) rc = vec3(0.98,0.96,0.9);
    col = rc;
  }
  return col;
}
`;

export function createPlanet() {
  let geo = new THREE.IcosahedronGeometry(1, 72);
  geo.deleteAttribute('uv');
  geo.deleteAttribute('normal');
  geo = mergeVertices(geo, 1e-5);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const hAttr = new Float32Array(pos.count);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const h = heightAt(v);
    hAttr[i] = h;
    v.multiplyScalar(R + h);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.setAttribute('aH', new THREE.BufferAttribute(hAttr, 1));
  geo.computeVertexNormals();

  const roadA = [], roadB = [];
  for (let i = 0; i < 24; i++) {
    const r = ROADS[i] || ROADS[0];
    roadA.push(dirFromLatLon(r[0][0], r[0][1]));
    roadB.push(dirFromLatLon(r[1][0], r[1][1]));
  }
  const plaza = PLAZAS.map((p) => { const d = dirFromLatLon(p.lat, p.lon); return new THREE.Vector4(d.x, d.y, d.z, Math.cos(p.r * DEG)); });
  const ptype = PLAZAS.map((p) => p.type);

  const mat = toonMat({ color: 0xffffff });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uRoadA = { value: roadA };
    shader.uniforms.uRoadB = { value: roadB };
    shader.uniforms.uRoadN = { value: ROADS.length };
    shader.uniforms.uPlaza = { value: plaza };
    shader.uniforms.uPlazaType = { value: ptype };
    shader.uniforms.uR = { value: R };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aH;\nvarying vec3 vPDir;\nvarying float vH;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPDir = position;\nvH = aH;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vH;\n' + groundGLSL)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( groundColor(normalize(vPDir), vH), opacity );');
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'planet';
  return mesh;
}

export function createSea() {
  const geo = new THREE.SphereGeometry(R + SEA_LEVEL, 120, 30, 0, Math.PI * 2, Math.PI / 2 + 41 * DEG, Math.PI / 2 - 41 * DEG);
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uDeep: { value: new THREE.Color('#1b6fa8') },
      uShallow: { value: new THREE.Color('#4fd1d9') },
      uFoam: { value: new THREE.Color('#ffffff') },
      uLight: { value: 1 },
      uIsland: { value: dirFromLatLon(-73, 60) },
    },
    vertexShader: /* glsl */ `
      uniform float uTime; uniform vec3 uIsland;
      varying vec3 vP; varying vec3 vW; varying float vLat; varying float vLon; varying float vIsl;
      void main(){
        vP = normalize(position);
        float lon = atan(vP.x, vP.z);
        vLat = asin(vP.y); vIsl = acos(clamp(dot(vP, uIsland), -1.0, 1.0));
        vLon = sin(lon*24.0 + uTime*1.5)*0.006; vW = vec3(sin(uTime*1.7 + lon*30.0)*0.004, 0.0, 0.0);
        vec3 pos = position + normal * (sin(position.x*0.8 + uTime*1.3)*0.06 + cos(position.z*0.9 + uTime)*0.06);
        vec4 w = modelMatrix * vec4(pos,1.0);
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFoam; uniform float uLight; uniform vec3 uIsland;
      varying vec3 vP; varying vec3 vW; varying float vLat; varying float vLon; varying float vIsl;
      void main(){
        float lat = vLat;
        float depth = smoothstep(-0.86, -1.25, lat);
        vec3 col = mix(uShallow, uDeep, depth);
        float isl = vIsl;
        col = mix(col, uShallow, smoothstep(0.13, 0.05, isl) * 0.8);
        // toon wave lines
        float w = sin(vP.x*90.0 + uTime*1.2 + sin(vP.z*40.0)*2.0) * sin(vP.z*80.0 - uTime*0.9 + sin(vP.x*30.0)*2.0);
        col = mix(col, vec3(1.0), step(0.93, w) * 0.55);
        // shore foam
        float shore = -0.866 + vLon;
        float foam = smoothstep(0.012, 0.0, abs(lat - shore));
        foam += smoothstep(0.012, 0.0, abs(isl - 0.084 - vW.x));
        col = mix(col, uFoam, clamp(foam, 0.0, 1.0));
        float alpha = mix(0.82, 0.94, depth);
        gl_FragColor = vec4(col * uLight, alpha);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.name = 'sea';
  m.renderOrder = 2;
  return m;
}
