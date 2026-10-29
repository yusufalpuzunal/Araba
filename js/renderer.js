/* 3B motor: renderer, sahne, kamera, gökyüzü, güneş ve ortam ışığı. */
"use strict";

/* ---------- renderer & scene ---------- */
const canvas = $("gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (e) {
  $("loading").textContent = "Bu cihazda 3D grafik açılamadı.";
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isTouch ? 1.5 : 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 4000);

const sunDir = new THREE.Vector3(-0.55, 0.62, -0.42).normalize();
const DAY = {
  zen: C("#3f6fae"),
  hor: C("#cfdbe6"),
  gnd: C("#8c9294"),
  sunCol: C("#ffe2b8"),
  sunSize: 0.9994,
  stars: 0,
  dir: new THREE.Vector3(-0.55, 0.62, -0.42).normalize(),
  light: C("#fff0d8"),
  sunI: 2.4,
  hemiI: 0.35,
  hemiSky: C("#bcd3ea"),
  exp: 1.05,
  envGround: C("#5f6a55"),
};
const NIGHT = {
  zen: C("#060a14"),
  hor: C("#1a2232"),
  gnd: C("#0b0d12"),
  sunCol: C("#8d9cbc"),
  sunSize: 0.99965,
  stars: 1,
  dir: new THREE.Vector3(0.45, 0.55, 0.55).normalize(),
  light: C("#9fb2e8"),
  sunI: 0.32,
  hemiI: 0.12,
  hemiSky: C("#3a4a6a"),
  exp: 1.2,
  envGround: C("#0e1014"),
};
scene.fog = new THREE.Fog(DAY.hor.clone(), 280, 1500);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    sunDir: { value: sunDir },
    zen: { value: DAY.zen.clone() },
    hor: { value: DAY.hor.clone() },
    gnd: { value: DAY.gnd.clone() },
    sunCol: { value: DAY.sunCol.clone() },
    sunSize: { value: DAY.sunSize },
    stars: { value: 0 },
  },
  vertexShader:
    "varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
  fragmentShader:
    "uniform vec3 sunDir,zen,hor,gnd,sunCol;uniform float sunSize,stars;varying vec3 vD;float h3(vec3 p){return fract(sin(dot(p,vec3(12.9898,78.233,45.164)))*43758.5453);}void main(){vec3 d=normalize(vD);float h=d.y;vec3 c=mix(hor,zen,pow(clamp(h,0.0,1.0),0.5));c=mix(c,gnd,smoothstep(0.0,-0.2,h));float s=max(dot(d,sunDir),0.0);c+=sunCol*(pow(s,6.0)*0.22+pow(s,80.0)*0.5);c+=sunCol*smoothstep(sunSize,sunSize+0.0003,s)*6.0;if(stars>0.0){vec3 q=floor(d*420.0);float r=h3(q);c+=vec3(0.9,0.95,1.0)*step(0.9975,r)*stars*smoothstep(0.0,0.25,h)*(0.4+0.6*h3(q+1.0));}gl_FragColor=vec4(c,1.0);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}",
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
sky.renderOrder = -1;
scene.add(sky);
function applySky(P) {
  const u = skyMat.uniforms;
  u.zen.value.copy(P.zen);
  u.hor.value.copy(P.hor);
  u.gnd.value.copy(P.gnd);
  u.sunCol.value.copy(P.sunCol);
  u.sunSize.value = P.sunSize;
  u.stars.value = P.stars;
  sunDir.copy(P.dir);
}
let envDay, envNight;
{
  const es = new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat));
  const gm = new THREE.MeshBasicMaterial({ color: DAY.envGround });
  const gp = new THREE.Mesh(new THREE.CircleGeometry(49, 32), gm);
  gp.rotation.x = -Math.PI / 2;
  gp.position.y = -2;
  es.add(gp);
  const pm = new THREE.PMREMGenerator(renderer);
  applySky(NIGHT);
  gm.color.copy(NIGHT.envGround);
  envNight = pm.fromScene(es, 0.02).texture;
  applySky(DAY);
  gm.color.copy(DAY.envGround);
  envDay = pm.fromScene(es, 0.02).texture;
  pm.dispose();
}
scene.environment = envDay;

const hemi = new THREE.HemisphereLight(DAY.hemiSky.clone(), C("#4e4c3e"), DAY.hemiI);
scene.add(hemi);
const sun = new THREE.DirectionalLight(DAY.light.clone(), DAY.sunI);
sun.castShadow = true;
sun.shadow.mapSize.set(isTouch ? 1024 : 1536, isTouch ? 1024 : 1536);
Object.assign(sun.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 1, far: 420 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);
