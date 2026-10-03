import * as THREE from 'three';

let _gradient;
export function gradientMap() {
  if (_gradient) return _gradient;
  // 3 crisp bands, anime-style
  const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
  _gradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  _gradient.minFilter = THREE.NearestFilter;
  _gradient.magFilter = THREE.NearestFilter;
  _gradient.generateMipmaps = false;
  _gradient.needsUpdate = true;
  return _gradient;
}

export function toonMat(opts = {}) {
  return new THREE.MeshToonMaterial({ gradientMap: gradientMap(), ...opts });
}

const outlineUniforms = {
  uInk: { value: new THREE.Color('#14111c') },
  uWidth: { value: 1.0 },
};
export const OUTLINE = outlineUniforms;

export function outlineMat(width = 1) {
  return new THREE.ShaderMaterial({
    uniforms: { uInk: outlineUniforms.uInk, uWidth: outlineUniforms.uWidth, uLocal: { value: width } },
    side: THREE.BackSide,
    vertexShader: /* glsl */ `
      uniform float uWidth; uniform float uLocal;
      #include <common>
      #include <skinning_pars_vertex>
      void main(){
        vec3 transformed = position;
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0);
        vec3 n = normalize(normalMatrix * normal);
        float d = clamp(-mv.z, 3.0, 80.0);
        mv.xyz += n * uWidth * uLocal * (0.012 + d * 0.0016);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uInk;
      void main(){ gl_FragColor = vec4(uInk, 1.0); }`,
  });
}

// Shared materials for merged static world geometry
export const MATS = {};
export function worldMats() {
  if (MATS.toon) return MATS;
  MATS.toon = toonMat({ vertexColors: true });
  MATS.glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  MATS.outline = outlineMat(1);
  return MATS;
}
