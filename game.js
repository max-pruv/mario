/* ============================================================
   IAM KART — Inès · Alice · Marlon
   3D WebGL kart racer (Three.js): 5 circuits, 50/100/150cc,
   objets façon MK8 (roulette, carapace, étoile, pièces),
   records locaux, gyroscope + joystick, PWA hors ligne.
   Tous les assets sont générés en code.
   ============================================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/* ---------------- Constants ---------------- */
const HALFW = 100;
const N = 512;
const LAPS = 3;
const NUM_KARTS = 8;
const WORLDC = 1024;

const MAXSPEED = 260, ACCEL = 190, DRAG = 0.72, OFFDRAG = 2.6;
const BOOSTSPEED = 355, TURNRATE = 2.15;
const CAMBACK = 95, CAMH = 52;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

const CHARACTERS = [
  { name: 'INÈS',   color: '#ff4fa3', helmet: '#ffffff' },
  { name: 'ALICE',  color: '#38c8ff', helmet: '#ffe040' },
  { name: 'MARLON', color: '#6ede3a', helmet: '#ffffff' },
  { name: 'REX',    color: '#e03434', helmet: '#ffffff' },
  { name: 'NOVA',   color: '#f0c020', helmet: '#202020' },
  { name: 'ZIP',    color: '#3060f0', helmet: '#ffe040' },
  { name: 'VIOLET', color: '#9040e0', helmet: '#ffe040' },
  { name: 'BLAZE',  color: '#f07818', helmet: '#ffffff' },
];

const CC_CLASSES = [
  { label: '50cc',  desc: 'Tranquille', mul: 0.78 },
  { label: '100cc', desc: 'Rapide',     mul: 0.90 },
  { label: '150cc', desc: 'Turbo',      mul: 1.00 },
];

/* ---------------- Circuits ---------------- */
const MAPS = [
  {
    id: 'neon', name: 'Circuit Néon', desc: 'La nuit tombe sur la mégapole',
    ctrl: [
      [360, 120], [600, 110], [830, 170], [900, 360], [830, 540],
      [660, 600], [560, 720], [660, 850], [520, 930], [330, 880],
      [210, 760], [280, 620], [210, 500], [120, 380], [160, 220],
    ],
    theme: {
      sky: ['#1a2050', '#54308c', '#b04a80', '#ff9a5a', '#c98a7a', '#6a4a5a'],
      stars: 220, sun: { x: 260, y: 322, r: 90, color: '255,190,120' }, moon: false,
      mountains: ['#3a2a55', '#2a1e40'],
      fog: 0x8a5a78, fogNear: 900, fogFar: 3300,
      hemi: [0xb090e0, 0x3a5a3a, 1.05], sunL: [0xffd9a0, 2.4],
      ground: '#3f7a3f', groundDots: ['#356a35', '#48884a', '#4c8e4c', '#316231'],
      city: { count: 90, rMin: 1750, rVar: 700, hMin: 120, hVar: 380, color: 0x11111c, glow: 0.9, winDensity: 0.55 },
      rails: 'neon', trees: 'mixed', landmark: null, sea: null,
    },
  },
  {
    id: 'paris', name: 'Paris', desc: 'Un grand prix au pied de la Tour Eiffel',
    ctrl: [
      [150, 150], [500, 110], [850, 150], [900, 400], [860, 700],
      [600, 760], [520, 600], [400, 560], [300, 700], [150, 650], [110, 400],
    ],
    theme: {
      sky: ['#5a9ae0', '#7ab6f0', '#a8d0f5', '#d8ecfb', '#cfe4f4', '#bcd8ec'],
      stars: 0, sun: { x: 700, y: 140, r: 70, color: '255,246,214' }, moon: false,
      mountains: ['#8aa8c8', '#7898bc'],
      fog: 0xcfe0ee, fogNear: 1100, fogFar: 3600,
      hemi: [0xcfe0f5, 0x4a6a3a, 1.25], sunL: [0xfff2d0, 2.7],
      ground: '#4a8a44', groundDots: ['#3f7a3d', '#549552', '#589a56', '#3a713a'],
      city: { count: 70, rMin: 1450, rVar: 500, hMin: 70, hVar: 130, color: 0xcfc0a8, glow: 0.12, winDensity: 0.3 },
      rails: 'gold', trees: 'round', landmark: 'eiffel', sea: null,
    },
  },
  {
    id: 'nice', name: 'Nice', desc: 'Pleine vitesse sur la Promenade',
    ctrl: [
      [150, 300], [400, 200], [700, 180], [900, 300], [920, 520],
      [750, 650], [500, 700], [250, 680], [100, 500],
    ],
    theme: {
      sky: ['#2a7ae0', '#3f92ec', '#6ab4f4', '#c8e8fb', '#b8ddf2', '#a4d0ea'],
      stars: 0, sun: { x: 420, y: 120, r: 80, color: '255,250,224' }, moon: false,
      mountains: ['#7aa88a', '#6a987c'],
      fog: 0xbfe0f0, fogNear: 1100, fogFar: 3600,
      hemi: [0xd8ecfa, 0x4a7a52, 1.3], sunL: [0xfffbe8, 2.8],
      ground: '#58a04e', groundDots: ['#4c9044', '#64ac5a', '#68b05e', '#468442'],
      city: { count: 55, rMin: 1400, rVar: 420, hMin: 60, hVar: 90, color: 0xf0dfc0, glow: 0.1, winDensity: 0.28 },
      rails: 'white', trees: 'palm', landmark: null,
      sea: { x: 1024 + 500, z: 1024 + 2600, color: 0x1f8ad0 },
    },
  },
  {
    id: 'nyc', name: 'New York', desc: 'Néons et gratte-ciel à minuit',
    ctrl: [
      [150, 150], [450, 130], [460, 400], [750, 380], [760, 140],
      [900, 300], [880, 650], [600, 680], [590, 470], [300, 500],
      [280, 750], [120, 700],
    ],
    theme: {
      sky: ['#04060f', '#0a1024', '#141c3a', '#242c52', '#1a2340', '#101830'],
      stars: 420, sun: null, moon: { x: 760, y: 90, r: 34 },
      mountains: ['#0c1226', '#080d1c'],
      fog: 0x1a2138, fogNear: 750, fogFar: 3000,
      hemi: [0x8090c0, 0x1a2a2a, 0.8], sunL: [0xbcd0ff, 1.5],
      ground: '#2c5a30', groundDots: ['#254e2a', '#336637', '#356a39', '#204724'],
      city: { count: 140, rMin: 1450, rVar: 950, hMin: 220, hVar: 520, color: 0x0c0c16, glow: 1.15, winDensity: 0.62 },
      rails: 'neon', trees: 'sparse', landmark: null, sea: null,
    },
  },
  {
    id: 'biarritz', name: 'Biarritz', desc: 'Couchant doré sur l’océan',
    ctrl: [
      [200, 180], [500, 120], [800, 200], [870, 420], [760, 560],
      [850, 720], [650, 850], [400, 780], [450, 600], [300, 520],
      [130, 600], [110, 350],
    ],
    theme: {
      sky: ['#3a4a8c', '#7a5aa8', '#c86a90', '#ffb060', '#e8a078', '#9a7a88'],
      stars: 60, sun: { x: 512, y: 330, r: 110, color: '255,214,150' }, moon: false,
      mountains: ['#4a5a3a', '#3a4a30'],
      fog: 0xc09a88, fogNear: 950, fogFar: 3400,
      hemi: [0xd0a8c0, 0x4a6a42, 1.1], sunL: [0xffc890, 2.5],
      ground: '#4f8a46', groundDots: ['#447c3e', '#5a9a52', '#5e9e56', '#3e7238'],
      city: { count: 30, rMin: 1500, rVar: 400, hMin: 50, hVar: 80, color: 0xe8d8c0, glow: 0.25, winDensity: 0.3 },
      rails: 'coral', trees: 'palmpine', landmark: 'lighthouse',
      sea: { x: 1024 - 3050, z: 1024 - 300, w: 3600, h: 3600, color: 0x186098 },
    },
  },
];

const RAIL_COLORS = {
  neon:  [new THREE.Color(0.5, 1.75, 2.2), new THREE.Color(2.2, 0.6, 1.9)],
  gold:  [new THREE.Color(2.2, 1.7, 0.5), new THREE.Color(2.2, 1.7, 0.5)],
  white: [new THREE.Color(1.9, 1.9, 1.9), new THREE.Color(1.9, 1.9, 1.9)],
  coral: [new THREE.Color(2.2, 1.1, 0.8), new THREE.Color(0.6, 1.8, 1.8)],
};

/* ---------------- Input ---------------- */
const input = { left: false, right: false, gas: false, brake: false, item: false, start: false };
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'gas', KeyW: 'gas', Space: 'gas',
  ArrowDown: 'brake', KeyS: 'brake',
  ShiftLeft: 'item', ShiftRight: 'item', KeyX: 'item',
  Enter: 'start',
};
addEventListener('keydown', e => { const k = KEYMAP[e.code]; if (k) { input[k] = true; e.preventDefault(); unlockAudio(); } });
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) { input[k] = false; e.preventDefault(); } });

function bindBtn(id, key) {
  const el = document.getElementById(id);
  const on = e => { e.preventDefault(); input[key] = true; el.classList.add('pressed'); unlockAudio(); };
  const off = e => { e.preventDefault(); input[key] = false; el.classList.remove('pressed'); };
  el.addEventListener('touchstart', on, { passive: false });
  el.addEventListener('touchend', off, { passive: false });
  el.addEventListener('touchcancel', off, { passive: false });
  el.addEventListener('mousedown', on);
  el.addEventListener('mouseup', off);
  el.addEventListener('mouseleave', off);
}
bindBtn('btnA', 'gas'); bindBtn('btnB', 'item');

/* ---------- Analog joystick (overrides gyro while touched) ---------- */
const joy = { active: false, value: 0 };
{
  const stick = document.getElementById('stick');
  const knob = document.getElementById('knob');
  const RADIUS = 44;
  let pid = null;
  const move = (clientX) => {
    const r = stick.getBoundingClientRect();
    const dx = clamp(clientX - (r.left + r.width / 2), -RADIUS, RADIUS);
    joy.value = dx / RADIUS;
    knob.style.transform = `translateX(${dx}px)`;
  };
  stick.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    pid = e.pointerId;
    stick.setPointerCapture(pid);
    joy.active = true;
    move(e.clientX);
    unlockAudio();
  });
  stick.addEventListener('pointermove', (e) => {
    if (e.pointerId === pid && joy.active) move(e.clientX);
  });
  const end = (e) => {
    if (e.pointerId !== pid) return;
    joy.active = false; joy.value = 0; pid = null;
    knob.style.transform = 'translateX(0)';
  };
  stick.addEventListener('pointerup', end);
  stick.addEventListener('pointercancel', end);
}

/* ---------- Gyroscope steering ---------- */
const gyro = { enabled: false, steer: 0 };
const gyroBtn = document.getElementById('btnGyro');

function onOrientation(e) {
  if (e.beta === null && e.gamma === null) return;
  const angle = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
  let tilt;
  if (angle === 90) tilt = e.beta;
  else if (angle === 270 || angle === -90) tilt = -e.beta;
  else tilt = e.gamma;
  const DEAD = 2.5, FULL = 20;
  const mag = Math.max(0, Math.abs(tilt) - DEAD) / (FULL - DEAD);
  gyro.steer = clamp(Math.sign(tilt) * mag, -1, 1);
}

async function toggleGyro() {
  unlockAudio();
  if (gyro.enabled) {
    gyro.enabled = false; gyro.steer = 0;
  } else {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' &&
          typeof DeviceOrientationEvent.requestPermission === 'function') {
        const res = await DeviceOrientationEvent.requestPermission();
        if (res !== 'granted') return updateGyroBtn();
      }
      addEventListener('deviceorientation', onOrientation);
      gyro.enabled = true;
      beep(660, 0.1, 'square', 990);
    } catch (err) { /* refusé */ }
  }
  try { localStorage.setItem('iam-gyro', gyro.enabled ? '1' : '0'); } catch (e) {}
  updateGyroBtn();
}
function updateGyroBtn() {
  gyroBtn.textContent = gyro.enabled ? '🧭 GYRO : ON' : '🧭 GYRO : OFF';
  gyroBtn.classList.toggle('on', gyro.enabled);
}
gyroBtn.addEventListener('click', toggleGyro);
try {
  if (localStorage.getItem('iam-gyro') === '1' &&
      !(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function')) {
    addEventListener('deviceorientation', onOrientation);
    gyro.enabled = true;
  }
} catch (e) {}
updateGyroBtn();

function getPlayerSteer() {
  const kb = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (kb) return kb;
  if (joy.active) return joy.value;
  if (gyro.enabled) return gyro.steer;
  return 0;
}

const glCanvas = document.getElementById('game');
glCanvas.addEventListener('pointerdown', () => { input.start = true; unlockAudio(); });
glCanvas.addEventListener('pointerup', () => { input.start = false; });

/* ---------------- Audio ---------------- */
let AC = null, engineOsc = null, engineGain = null;
let muted = false;
function unlockAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = AC.createOscillator();
    engineOsc.type = 'sawtooth';
    const filter = AC.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 420;
    engineGain = AC.createGain(); engineGain.gain.value = 0;
    engineOsc.connect(filter).connect(engineGain).connect(AC.destination);
    engineOsc.start();
  } catch (e) { AC = null; }
}
function beep(freq, dur = 0.1, type = 'square', slideTo = 0, vol = 0.12) {
  if (!AC || muted) return;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, AC.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, AC.currentTime + dur);
  g.gain.setValueAtTime(vol, AC.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, AC.currentTime + dur);
  o.connect(g).connect(AC.destination);
  o.start(); o.stop(AC.currentTime + dur + 0.02);
}
function updateEngine(speed, racing) {
  if (!AC || !engineGain) return;
  engineGain.gain.setTargetAtTime((racing && !muted) ? 0.04 : 0, AC.currentTime, 0.1);
  engineOsc.frequency.setTargetAtTime(55 + speed * 0.55, AC.currentTime, 0.05);
}

/* ---------------- Renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8a5a78, 900, 3300);
const camera = new THREE.PerspectiveCamera(66, 3 / 2, 1, 6000);

const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(2, 2, {
  samples: 4, type: THREE.HalfFloatType,
}));
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(480, 320), 0.55, 0.65, 0.78));
composer.addPass(new OutputPass());

const hemi = new THREE.HemisphereLight(0xb090e0, 0x3a5a3a, 1.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd9a0, 2.4);
sun.position.set(400, 500, 150);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -500; sun.shadow.camera.right = 500;
sun.shadow.camera.top = 500; sun.shadow.camera.bottom = -500;
sun.shadow.camera.far = 2000;
sun.shadow.bias = -0.0006;
scene.add(sun);
scene.add(sun.target);

const headlight = new THREE.SpotLight(0xfff3d0, 0, 500, 0.55, 0.5, 1.2);
headlight.castShadow = false;
scene.add(headlight);
scene.add(headlight.target);

/* ---------------- Texture helpers ---------------- */
function canvasTexture(size, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4;
  return t;
}

function radialSprite(color, inner = 'rgba(255,255,255,1)') {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glowCyan = radialSprite('rgba(64,224,255,0.9)');
const glowMagenta = radialSprite('rgba(255,80,220,0.9)');
const glowOrange = radialSprite('rgba(255,160,60,0.9)');
const glowLime = radialSprite('rgba(150,255,80,0.9)');
const glowWhite = radialSprite('rgba(255,255,255,0.8)');

const roadTex = canvasTexture(256, (g) => {
  g.fillStyle = '#4a4a54'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.12)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  g.fillStyle = '#e8e8ea';
  g.fillRect(6, 0, 7, 256);
  g.fillRect(243, 0, 7, 256);
  g.fillStyle = '#ffd24a';
  g.fillRect(124, 10, 8, 100);
  g.fillRect(124, 146, 8, 100);
}, true);

const curbTex = canvasTexture(64, (g) => {
  g.fillStyle = '#e03030'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 32, 64, 32);
}, true);

/* ---------------- Kart models ---------------- */
function buildKartMesh(charIdx) {
  const ch = CHARACTERS[charIdx];
  const color = new THREE.Color(ch.color);
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color, roughness: 0.28, metalness: 0.45,
    clearcoat: 1.0, clearcoatRoughness: 0.12, envMapIntensity: 1.1,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.6, metalness: 0.4 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.15, metalness: 1.0, envMapIntensity: 1.3 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 16), bodyMat);
  body.position.y = 7;
  body.castShadow = true;
  chassis.add(body);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(7.5, 12, 4), bodyMat);
  nose.rotation.z = -Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.position.set(20, 7, 0);
  nose.castShadow = true;
  chassis.add(nose);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.5, 1.6, 8, 16), darkMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-2, 10.5, 0);
  chassis.add(rim);
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 18), bodyMat);
  spoiler.position.set(-16, 13, 0);
  chassis.add(spoiler);
  for (const sz of [-6, 6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 2), darkMat);
    strut.position.set(-15, 9.5, sz);
    chassis.add(strut);
  }
  const helmetMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(ch.helmet), roughness: 0.25, metalness: 0.15 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(4.5, 5, 4, 8), bodyMat);
  torso.position.set(-3, 13, 0);
  torso.castShadow = true;
  chassis.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(4.6, 14, 12), helmetMat);
  head.position.set(-3, 20, 0);
  head.castShadow = true;
  chassis.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 8, 0, Math.PI), new THREE.MeshPhysicalMaterial({ color: 0x1a2a3e, roughness: 0.05, metalness: 0.7, clearcoat: 1, envMapIntensity: 1.6 }));
  visor.rotation.y = Math.PI / 2;
  visor.position.set(0.4, 19.6, 0);
  visor.scale.set(1.15, 0.8, 1.1);
  chassis.add(visor);
  const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(3.2, 0.8, 6, 12), darkMat);
  wheelRing.rotation.y = Math.PI / 2;
  wheelRing.rotation.x = 0.5;
  wheelRing.position.set(5, 12.5, 0);
  chassis.add(wheelRing);
  for (const sz of [-4.5, 4.5]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.1, 9, 8), chromeMat);
    pipe.rotation.z = 1.25;
    pipe.position.set(-16, 9.5, sz);
    chassis.add(pipe);
  }
  for (const sz of [-9.5, 9.5]) {
    const pod = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 4), bodyMat);
    pod.position.set(2, 6.5, sz);
    chassis.add(pod);
  }
  const wing = new THREE.Mesh(new THREE.BoxGeometry(4, 1.6, 20), bodyMat);
  wing.position.set(23, 4.2, 0);
  chassis.add(wing);
  const lightMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.1, 1.7) });
  for (const sz of [-5.5, 5.5]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 8), lightMat);
    hl.position.set(24.5, 6.5, sz);
    chassis.add(hl);
  }

  const wheelGeo = new THREE.CylinderGeometry(5.5, 5.5, 5, 14);
  const hubGeo = new THREE.CylinderGeometry(2.6, 2.6, 5.4, 8);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.3, metalness: 0.7 });
  const wheels = [];
  for (const [wx, wz, front] of [[11, -11, true], [11, 11, true], [-11, -12, false], [-11, 12, false]]) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, 5.5, wz);
    const spin = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, darkMat);
    tyre.rotation.x = Math.PI / 2;
    tyre.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.x = Math.PI / 2;
    spin.add(tyre); spin.add(hub);
    steerPivot.add(spin);
    chassis.add(steerPivot);
    wheels.push({ steerPivot, spin, front });
  }

  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowOrange, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
  }));
  flame.position.set(-20, 7, 0);
  flame.scale.set(26, 26, 1);
  flame.visible = false;
  g.add(flame);

  const sparks = [];
  for (const sz of [-11, 11]) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowCyan, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    s.position.set(-13, 3, sz);
    s.scale.set(14, 14, 1);
    s.visible = false;
    g.add(s);
    sparks.push(s);
  }
  const starHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowWhite, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8,
  }));
  starHalo.position.set(0, 10, 0);
  starHalo.scale.set(70, 70, 1);
  starHalo.visible = false;
  g.add(starHalo);
  scene.add(g);
  return { group: g, chassis, wheels, flame, sparks, starHalo, bodyMat, baseColor: color.clone() };
}
const kartMeshes = CHARACTERS.map((_, i) => buildKartMesh(i));

/* ---------------- Item prototypes ---------------- */
const bananaProto = (() => {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.5 });
  for (let i = 0; i < 3; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(4.2, 8, 8), mat);
    seg.position.set((i - 1) * 4.5, 5 + (i === 1 ? 2.2 : 0), 0);
    seg.castShadow = true;
    g.add(seg);
  }
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.4, 3, 6), new THREE.MeshStandardMaterial({ color: 0x7a5f10 }));
  tip.position.set(-6.5, 8.5, 0);
  g.add(tip);
  return g;
})();

const shellProto = (() => {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(8, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x28a828, roughness: 0.3, metalness: 0.2 })
  );
  shell.scale.y = 0.75;
  shell.position.y = 7;
  shell.castShadow = true;
  g.add(shell);
  const rimw = new THREE.Mesh(
    new THREE.TorusGeometry(7.6, 1.6, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xf2f2e8, roughness: 0.5 })
  );
  rimw.rotation.x = Math.PI / 2;
  rimw.position.y = 5;
  g.add(rimw);
  return g;
})();

/* ---------------- Ships, planes, balloons ---------------- */
const ships = [];
function buildShip(type, colorHex, glowTex) {
  const g = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x202030, roughness: 0.35, metalness: 0.8, emissive: color, emissiveIntensity: 0.25 });
  const neonMat2 = new THREE.MeshBasicMaterial({ color: color.clone().multiplyScalar(1.9) });

  if (type === 0) {
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(7, 34, 4, 10), bodyMat);
    fus.rotation.z = Math.PI / 2;
    g.add(fus);
    const cock = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), neonMat2);
    cock.scale.set(1.4, 0.7, 0.9);
    cock.position.set(8, 5, 0);
    g.add(cock);
    for (const [ry, rz] of [[0.5, 0.35], [-0.5, 0.35], [0.5, -0.35], [-0.5, -0.35]]) {
      const wing = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 30), bodyMat);
      wing.position.set(-8, rz * 22, ry * 26);
      wing.rotation.x = rz;
      g.add(wing);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(6, 2.4, 4), neonMat2);
      tip.position.set(-8, rz * 22 + rz * 4, ry * 26 + ry * 14);
      g.add(tip);
    }
  } else if (type === 1) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(24, 30, 7, 20), bodyMat);
    g.add(disc);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 10, 0, TAU, 0, Math.PI / 2), neonMat2);
    dome.position.y = 3;
    g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(27, 2, 8, 24), neonMat2);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  } else if (type === 2) {
    const donut = new THREE.Mesh(new THREE.TorusGeometry(20, 7, 10, 22), bodyMat);
    g.add(donut);
    const core = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), neonMat2);
    g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.6, 6, 22), neonMat2);
    g.add(ring);
  } else {
    const fus = new THREE.Mesh(new THREE.CapsuleGeometry(9, 28, 4, 12), bodyMat);
    fus.rotation.z = Math.PI / 2;
    g.add(fus);
    const noseC = new THREE.Mesh(new THREE.ConeGeometry(9, 16, 12), neonMat2);
    noseC.rotation.z = -Math.PI / 2;
    noseC.position.x = 22;
    g.add(noseC);
    for (let i = 0; i < 3; i++) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(10, 1.8, 12), neonMat2);
      const a = i / 3 * TAU;
      fin.position.set(-14, Math.cos(a) * 9, Math.sin(a) * 9);
      fin.rotation.x = a;
      g.add(fin);
    }
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
  }));
  halo.scale.set(90, 90, 1);
  g.add(halo);
  const engine = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
  }));
  engine.position.set(type === 1 ? 0 : -26, type === 1 ? -8 : 0, 0);
  engine.scale.set(40, 40, 1);
  g.add(engine);
  const trail = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    s.scale.set(30, 30, 1);
    scene.add(s);
    trail.push(s);
  }
  scene.add(g);
  return { group: g, halo, trail };
}
{
  const defs = [
    { type: 0, color: 0x40e0ff, glow: glowCyan,    r: 750,  h: 260, w: 0.10, ph: 0 },
    { type: 1, color: 0xff50dc, glow: glowMagenta, r: 1050, h: 330, w: -0.07, ph: 2.1 },
    { type: 2, color: 0x96ff50, glow: glowLime,    r: 600,  h: 200, w: 0.14, ph: 4.0 },
    { type: 3, color: 0xffa03c, glow: glowOrange,  r: 900,  h: 420, w: -0.11, ph: 1.2 },
    { type: 0, color: 0xff50dc, glow: glowMagenta, r: 1250, h: 300, w: 0.06, ph: 5.3 },
  ];
  for (const d of defs) {
    const s = buildShip(d.type, d.color, d.glow);
    ships.push({ ...d, ...s, trailT: 0, hist: [] });
  }
}

const planes = [];
function buildPlane(colorHex) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.5 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.5 });
  const fus = new THREE.Mesh(new THREE.CapsuleGeometry(6, 24, 4, 10), mat);
  fus.rotation.z = Math.PI / 2;
  g.add(fus);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(10, 1.6, 52), white);
  wing.position.set(2, 2, 0);
  g.add(wing);
  const tailW = new THREE.Mesh(new THREE.BoxGeometry(6, 1.4, 20), white);
  tailW.position.set(-14, 3, 0);
  g.add(tailW);
  const tailV = new THREE.Mesh(new THREE.BoxGeometry(8, 10, 1.4), white);
  tailV.position.set(-15, 7, 0);
  g.add(tailV);
  const prop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 22, 2.4), new THREE.MeshStandardMaterial({ color: 0x202020 }));
  prop.position.set(19, 0, 0);
  g.add(prop);
  const trail = [];
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowWhite, blending: THREE.NormalBlending, depthWrite: false, opacity: 0, color: 0xffffff,
    }));
    s.scale.set(16, 16, 1);
    scene.add(s);
    trail.push(s);
  }
  scene.add(g);
  return { group: g, prop, trail };
}
{
  const defs = [
    { color: 0xe03434, y: 180, speed: 130, dir: 0.4, off: 0 },
    { color: 0xf0c020, y: 240, speed: 105, dir: 2.4, off: 900 },
    { color: 0x38c8ff, y: 150, speed: 150, dir: 4.2, off: 1800 },
  ];
  for (const d of defs) {
    const p = buildPlane(d.color);
    planes.push({ ...d, ...p, t: d.off, trailT: 0, hist: [] });
  }
}

const balloons = [];
(function buildBalloons() {
  const mk = (colors) => canvasTexture(128, (g) => {
    for (let i = 0; i < 8; i++) {
      g.fillStyle = colors[i % 2];
      g.fillRect(i * 16, 0, 16, 128);
    }
  }, true);
  const defs = [
    { x: WORLDC - 500, z: WORLDC + 650, y: 320, tex: mk(['#ff5060', '#ffd24a']), ph: 0 },
    { x: WORLDC + 720, z: WORLDC - 420, y: 380, tex: mk(['#40e0ff', '#f8f8ff']), ph: 2.5 },
  ];
  for (const d of defs) {
    const g = new THREE.Group();
    const env = new THREE.Mesh(
      new THREE.SphereGeometry(55, 18, 14),
      new THREE.MeshStandardMaterial({ map: d.tex, roughness: 0.6, emissive: 0x442211, emissiveIntensity: 0.25 })
    );
    env.scale.y = 1.15;
    g.add(env);
    const basket = new THREE.Mesh(
      new THREE.BoxGeometry(20, 16, 20),
      new THREE.MeshStandardMaterial({ color: 0x7a5a30, roughness: 0.9 })
    );
    basket.position.y = -85;
    g.add(basket);
    g.position.set(d.x, d.y, d.z);
    scene.add(g);
    balloons.push({ group: g, baseY: d.y, ph: d.ph });
  }
})();

/* ============================================================
   TRACK BUILDER
   ============================================================ */
let center = [];
let track = null;
let BOOST_IDX = [], BOX_IDX = [];

function sampleCenterline(ctrl) {
  const M = ctrl.length, per = Math.floor(N / M), pts = [];
  for (let i = 0; i < M; i++) {
    const p0 = ctrl[(i - 1 + M) % M], p1 = ctrl[i], p2 = ctrl[(i + 1) % M], p3 = ctrl[(i + 2) % M];
    const cnt = (i === M - 1) ? N - per * (M - 1) : per;
    for (let j = 0; j < cnt; j++) {
      const t = j / cnt, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      pts.push([x * 2, y * 2]);
    }
  }
  const out = [];
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    out.push({ x: a[0], y: a[1], dirx: dx, diry: dy, nx: -dy, ny: dx, curv: 0, seglen: l });
  }
  for (let i = 0; i < N; i++) {
    const a = out[i], b = out[(i + 7) % N];
    out[i].curv = Math.abs(angDiff(Math.atan2(a.diry, a.dirx), Math.atan2(b.diry, b.dirx)));
  }
  return out;
}

function idxDist(a, b) { let d = Math.abs(a - b); return Math.min(d, N - d); }

function makeSkyTexture(theme) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  const stops = [0, 0.42, 0.55, 0.62, 0.68, 1];
  theme.sky.forEach((col, i) => grad.addColorStop(stops[i], col));
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < theme.stars; i++) {
    const y = rnd() * 230;
    g.globalAlpha = 0.25 + rnd() * 0.6 * (1 - y / 240);
    g.fillStyle = '#fff';
    g.fillRect(rnd() * 1024, y, rnd() < 0.2 ? 2 : 1, 1);
  }
  g.globalAlpha = 1;
  if (theme.sun) {
    const s = theme.sun;
    const sg = g.createRadialGradient(s.x, s.y, 4, s.x, s.y, s.r);
    sg.addColorStop(0, 'rgba(255,248,220,1)');
    sg.addColorStop(0.2, `rgba(${s.color},0.85)`);
    sg.addColorStop(1, `rgba(${s.color},0)`);
    g.fillStyle = sg; g.beginPath(); g.arc(s.x, s.y, s.r, 0, TAU); g.fill();
  }
  if (theme.moon) {
    const m = theme.moon;
    g.fillStyle = 'rgba(240,244,255,0.95)';
    g.beginPath(); g.arc(m.x, m.y, m.r, 0, TAU); g.fill();
    g.fillStyle = 'rgba(180,190,220,0.5)';
    g.beginPath(); g.arc(m.x - 8, m.y - 6, m.r * 0.25, 0, TAU); g.fill();
    g.beginPath(); g.arc(m.x + 10, m.y + 8, m.r * 0.18, 0, TAU); g.fill();
  }
  if (theme.stars === 0) {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 16; i++) {
      const x = rnd() * 1024, y = 60 + rnd() * 180, r = 14 + rnd() * 22;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.arc(x + r, y + 4, r * 0.75, 0, TAU);
      g.arc(x - r, y + 5, r * 0.65, 0, TAU);
      g.fill();
    }
  }
  g.fillStyle = theme.mountains[0];
  for (let x = 0; x < 1024; x += 4) {
    const h = 26 + Math.sin(x * 0.014) * 14 + Math.sin(x * 0.041 + 2) * 8;
    g.fillRect(x, 340 - h, 4, h + 20);
  }
  g.fillStyle = theme.mountains[1];
  for (let x = 0; x < 1024; x += 4) {
    const h = 14 + Math.sin(x * 0.021 + 5) * 9 + Math.sin(x * 0.057) * 5;
    g.fillRect(x, 348 - h, 4, h + 30);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ribbon(cl, halfInner, halfOuter, y, vScale) {
  const pos = [], uv = [], idx = [], normal = [];
  let v = 0, vertBase = 0;
  const sides = halfInner > 0 ? [-1, 1] : [0];
  for (const side of sides) {
    v = 0;
    for (let i = 0; i <= N; i++) {
      const c = cl[i % N];
      if (i > 0) v += cl[(i - 1) % N].seglen / vScale;
      const o1 = side === 0 ? -halfOuter : side * halfInner;
      const o2 = side === 0 ? halfOuter : side * halfOuter;
      pos.push(c.x + c.nx * o1, y, c.y + c.ny * o1);
      pos.push(c.x + c.nx * o2, y, c.y + c.ny * o2);
      uv.push(0, v, 1, v);
      normal.push(0, 1, 0, 0, 1, 0);
    }
    for (let i = 0; i < N; i++) {
      const a = vertBase + i * 2, b = a + 1, c2 = a + 2, d = a + 3;
      idx.push(a, c2, b, b, c2, d);
    }
    vertBase += (N + 1) * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geo.setIndex(idx);
  return geo;
}

function buildEiffel(group, x, z) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a5648, roughness: 0.55, metalness: 0.55 });
  const H = 560;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(6, 12, H * 0.42, 6), mat);
    leg.position.set(x + sx * 70, H * 0.2, z + sz * 70);
    leg.rotation.z = -sx * 0.28;
    leg.rotation.x = sz * 0.28;
    group.add(leg);
  }
  const deck1 = new THREE.Mesh(new THREE.BoxGeometry(150, 14, 150), mat);
  deck1.position.set(x, H * 0.4, z);
  group.add(deck1);
  const mid = new THREE.Mesh(new THREE.CylinderGeometry(22, 55, H * 0.34, 4), mat);
  mid.rotation.y = Math.PI / 4;
  mid.position.set(x, H * 0.57, z);
  group.add(mid);
  const deck2 = new THREE.Mesh(new THREE.BoxGeometry(70, 10, 70), mat);
  deck2.position.set(x, H * 0.74, z);
  group.add(deck2);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6, 22, H * 0.24, 4), mat);
  top.rotation.y = Math.PI / 4;
  top.position.set(x, H * 0.86, z);
  group.add(top);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3, 60, 6), mat);
  antenna.position.set(x, H * 0.98 + 20, z);
  group.add(antenna);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(6, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.6) }));
  lamp.position.set(x, H + 44, z);
  group.add(lamp);
}

function buildLighthouse(group, x, z) {
  const stripeTex = canvasTexture(64, (g) => {
    g.fillStyle = '#f2f0ea'; g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#d03030'; g.fillRect(0, 0, 64, 16); g.fillRect(0, 32, 64, 16);
  }, true);
  stripeTex.repeat.set(1, 3);
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 22, 190, 12),
    new THREE.MeshStandardMaterial({ map: stripeTex, roughness: 0.6 })
  );
  tower.position.set(x, 95, z);
  tower.castShadow = true;
  group.add(tower);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(16, 24, 10),
    new THREE.MeshStandardMaterial({ color: 0x203040, roughness: 0.4, metalness: 0.5 })
  );
  cap.position.set(x, 214, z);
  group.add(cap);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(9, 10, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.3, 1.7) }));
  lamp.position.set(x, 196, z);
  group.add(lamp);
  const beam = new THREE.Group();
  for (const s of [-1, 1]) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(30, 340, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xfff2c8, transparent: true, opacity: 0.06,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
      })
    );
    cone.rotation.z = s * Math.PI / 2;
    cone.position.x = s * 170;
    beam.add(cone);
  }
  beam.position.set(x, 196, z);
  group.add(beam);
  return beam;
}

function disposeTrack() {
  if (!track) return;
  scene.remove(track.group);
  track.group.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
  });
  for (const d of track.disposables) d.dispose();
  if (track.envTex) track.envTex.dispose();
  track = null;
}

function buildTrack(mapIdx) {
  disposeTrack();
  const map = MAPS[mapIdx];
  const theme = map.theme;
  const cl = sampleCenterline(map.ctrl);
  center = cl;
  BOOST_IDX = [Math.floor(N * 0.30), Math.floor(N * 0.63), Math.floor(N * 0.86)];
  BOX_IDX = [Math.floor(N * 0.12), Math.floor(N * 0.48), Math.floor(N * 0.76)];

  const group = new THREE.Group();
  const disposables = [];
  track = { mapIdx, group, disposables, itemBoxes: [], boostPads: [], gateLights: [], coins: null, beacon: null, neonMat: null, envTex: null, miniCanvas: null };

  // atmosphere
  const skyTex = makeSkyTexture(theme);
  disposables.push(skyTex);
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(3800, 32, 24, 0, TAU, 0, Math.PI * 0.62),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false })
  );
  sky.position.set(WORLDC, -80, WORLDC);
  group.add(sky);
  const envTex = skyTex.clone();
  envTex.mapping = THREE.EquirectangularReflectionMapping;
  envTex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  track.envTex = pmrem.fromEquirectangular(envTex).texture;
  scene.environment = track.envTex;
  scene.environmentIntensity = 0.7;
  pmrem.dispose();
  envTex.dispose();

  scene.fog.color.setHex(theme.fog);
  scene.fog.near = theme.fogNear;
  scene.fog.far = theme.fogFar;
  hemi.color.setHex(theme.hemi[0]);
  hemi.groundColor.setHex(theme.hemi[1]);
  hemi.intensity = theme.hemi[2];
  sun.color.setHex(theme.sunL[0]);
  sun.intensity = theme.sunL[1];

  // ground
  const grassTex = canvasTexture(256, (g) => {
    g.fillStyle = theme.ground; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = theme.groundDots[i % 4];
      g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    }
    for (let i = 0; i < 26; i++) {
      g.fillStyle = 'rgba(20,60,20,0.3)';
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 16, 0, TAU); g.fill();
    }
  }, true);
  grassTex.repeat.set(60, 60);
  disposables.push(grassTex);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(3800, 48),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLDC, -0.1, WORLDC);
  ground.receiveShadow = true;
  group.add(ground);

  // sea
  if (theme.sea) {
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(theme.sea.w || 4200, theme.sea.h || 3000),
      new THREE.MeshStandardMaterial({
        color: theme.sea.color, roughness: 0.12, metalness: 0.25, envMapIntensity: 1.2,
      })
    );
    sea.rotation.x = -Math.PI / 2;
    sea.position.set(theme.sea.x, 0.4, theme.sea.z);
    group.add(sea);
  }

  // road + curbs + rails
  const road = new THREE.Mesh(
    ribbon(cl, 0, HALFW, 0.05, 220),
    new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92, side: THREE.DoubleSide })
  );
  road.receiveShadow = true;
  group.add(road);
  const curbs = new THREE.Mesh(
    ribbon(cl, HALFW, HALFW + 10, 0.12, 18),
    new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.85, side: THREE.DoubleSide })
  );
  curbs.receiveShadow = true;
  group.add(curbs);
  if (theme.rails === 'neon') {
    track.neonMat = new THREE.MeshBasicMaterial({
      color: 0x40e0ff, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
    });
    group.add(new THREE.Mesh(ribbon(cl, HALFW + 11, HALFW + 15, 0.18, 100), track.neonMat));
  }

  // start line
  const checkTex = canvasTexture(64, (g) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        { g.fillStyle = (x + y) % 2 ? '#101010' : '#f5f5f5'; g.fillRect(x * 8, y * 8, 8, 8); }
  }, true);
  checkTex.repeat.set(6, 1);
  disposables.push(checkTex);
  {
    const c = cl[0];
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(HALFW * 2, 34),
      new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.8 })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(c.diry, c.dirx) + Math.PI / 2;
    m.position.set(c.x, 0.1, c.y);
    m.receiveShadow = true;
    group.add(m);
  }

  // start gate
  {
    const c = cl[0];
    const gate = new THREE.Group();
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x30304a, roughness: 0.5, metalness: 0.6 });
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 110, 10), pillarMat);
      p.position.set(side * (HALFW + 22), 55, 0);
      p.castShadow = true;
      gate.add(p);
    }
    const label = `IAM KART · ${map.name.toUpperCase()}`;
    const bannerTex = canvasTexture(512, (g) => {
      g.fillStyle = '#181830'; g.fillRect(0, 0, 512, 512);
      g.fillStyle = '#40e0ff'; g.fillRect(0, 165, 512, 6);
      g.fillStyle = '#ff50dc'; g.fillRect(0, 341, 512, 6);
      let size = 64;
      g.font = `bold ${size}px system-ui, sans-serif`;
      while (g.measureText(label).width > 480 && size > 30) {
        size -= 4;
        g.font = `bold ${size}px system-ui, sans-serif`;
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffffff';
      g.fillText(label, 256, 256);
    });
    bannerTex.repeat.set(1, 0.28); bannerTex.offset.set(0, 0.36);
    bannerTex.wrapS = bannerTex.wrapT = THREE.ClampToEdgeWrapping;
    disposables.push(bannerTex);
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(HALFW * 2 + 60, 26, 8),
      new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4, emissive: 0x222244 })
    );
    banner.position.set(0, 108, 0);
    gate.add(banner);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(5, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x110000, emissiveIntensity: 2 })
      );
      lamp.position.set((i - 1) * 26, 88, 3);
      gate.add(lamp);
      track.gateLights.push(lamp);
    }
    gate.position.set(c.x, 0, c.y);
    gate.rotation.y = -Math.atan2(c.diry, c.dirx) + Math.PI / 2;
    group.add(gate);
  }

  // boost pads
  const padTex0 = canvasTexture(128, (g) => {
    g.fillStyle = '#7a3c00'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffb020';
    for (const oy of [8, 72]) {
      g.beginPath();
      g.moveTo(14, oy); g.lineTo(114, oy + 24); g.lineTo(14, oy + 48);
      g.lineTo(14, oy + 34); g.lineTo(84, oy + 24); g.lineTo(14, oy + 14);
      g.closePath(); g.fill();
    }
  }, true);
  disposables.push(padTex0);
  for (const bi of BOOST_IDX) {
    const c = cl[bi];
    const tex = padTex0.clone();
    tex.needsUpdate = true;
    disposables.push(tex);
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(64, HALFW * 1.4),
      new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.7, 1.7, 1.7) })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(c.diry, c.dirx);
    m.position.set(c.x, 0.15, c.y);
    group.add(m);
    track.boostPads.push({ tex });
  }

  // item boxes
  for (const bi of BOX_IDX) {
    const c = cl[bi];
    for (const off of [-60, 0, 60]) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(22, 22, 22),
        new THREE.MeshStandardMaterial({
          color: 0x60c0ff, transparent: true, opacity: 0.55,
          emissive: 0x2060a0, roughness: 0.2, metalness: 0.4,
        })
      );
      mesh.position.set(c.x + c.nx * off, 18, c.y + c.ny * off);
      mesh.castShadow = true;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowWhite, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.5,
      }));
      halo.scale.set(50, 50, 1);
      mesh.add(halo);
      group.add(mesh);
      track.itemBoxes.push({ x: mesh.position.x, y: mesh.position.z, respawn: 0, mesh });
    }
  }

  // coins
  {
    const coinData = [];
    for (let i = 20; i < N; i += 26) {
      const c = cl[i];
      if (BOOST_IDX.some(b => idxDist(i, b) < 8) || BOX_IDX.some(b => idxDist(i, b) < 8)) continue;
      const offs = (i / 26 | 0) % 2 ? [-50, 0, 50] : [0];
      for (const off of offs)
        coinData.push({ x: c.x + c.nx * off, y: c.y + c.ny * off, taken: false });
    }
    const geo = new THREE.CylinderGeometry(8, 8, 2.4, 14);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffd24a, roughness: 0.25, metalness: 0.9,
      emissive: 0xaa7710, emissiveIntensity: 0.35, envMapIntensity: 1.4,
    });
    const inst = new THREE.InstancedMesh(geo, mat, coinData.length);
    group.add(inst);
    track.coins = { inst, data: coinData };
  }

  // trees / palms
  {
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const spots = [];
    const step = theme.trees === 'sparse' ? 22 : 6;
    for (let i = 0; i < N; i += step) {
      const c = cl[i];
      const side = rnd() < 0.5 ? -1 : 1;
      const off = HALFW + 90 + rnd() * 420;
      const x = c.x + c.nx * side * off;
      const z = c.y + c.ny * side * off;
      let ok = true;
      for (let j = 0; j < N; j += 4) {
        const cc = cl[j];
        if ((cc.x - x) ** 2 + (cc.y - z) ** 2 < (HALFW + 55) ** 2) { ok = false; break; }
      }
      if (ok) spots.push({ x, z, s: 0.7 + rnd() * 0.9 });
    }
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4520, roughness: 1 });
    const mk = (geo, mat, list, yOff, tilt) => {
      if (!list.length) return;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      list.forEach((s, i) => {
        e.set(tilt ? (Math.sin(i) * 0.18) : 0, i * 1.3, tilt ? (Math.cos(i) * 0.18) : 0);
        q.setFromEuler(e);
        sc.set(s.s, s.s, s.s);
        v.set(s.x, yOff * s.s, s.z);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
      });
      im.castShadow = true;
      group.add(im);
    };
    const kind = theme.trees;
    const half = Math.ceil(spots.length / 2);
    if (kind === 'palm' || kind === 'palmpine') {
      const palms = kind === 'palm' ? spots : spots.slice(0, half);
      mk(new THREE.CylinderGeometry(2.5, 4, 55, 6), trunkMat, palms, 27, true);
      mk(new THREE.IcosahedronGeometry(20, 1), new THREE.MeshStandardMaterial({ color: 0x2a8a40, roughness: 1, flatShading: true }), palms.map(s => ({ ...s, s: s.s * 1.05 })), 56, false);
      if (kind === 'palmpine') {
        const pines = spots.slice(half);
        mk(new THREE.CylinderGeometry(3, 4.5, 30, 6), trunkMat, pines, 15, false);
        mk(new THREE.ConeGeometry(22, 60, 8), new THREE.MeshStandardMaterial({ color: 0x1e5f30, roughness: 1 }), pines, 55, false);
      }
    } else if (kind === 'round') {
      mk(new THREE.CylinderGeometry(3, 4.5, 30, 6), trunkMat, spots, 15, false);
      mk(new THREE.IcosahedronGeometry(24, 1), new THREE.MeshStandardMaterial({ color: 0x2e7a38, roughness: 1, flatShading: true }), spots, 46, false);
    } else {
      const pines = spots.slice(0, half), rounds = spots.slice(half);
      mk(new THREE.CylinderGeometry(3, 4.5, 30, 6), trunkMat, spots, 15, false);
      mk(new THREE.ConeGeometry(22, 60, 8), new THREE.MeshStandardMaterial({ color: 0x1e5f30, roughness: 1 }), pines, 55, false);
      mk(new THREE.IcosahedronGeometry(24, 1), new THREE.MeshStandardMaterial({ color: 0x2e7a38, roughness: 1, flatShading: true }), rounds, 46, false);
    }
  }

  // bollards
  {
    const idxs = [];
    for (let i = 0; i < N; i += 8) idxs.push(i);
    const count = idxs.length * 2;
    const posts = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1.8, 2.2, 9, 6),
      new THREE.MeshStandardMaterial({ color: 0x22222e, roughness: 0.5, metalness: 0.6 }),
      count
    );
    const tips = new THREE.InstancedMesh(
      new THREE.SphereGeometry(2.6, 8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1) }),
      count
    );
    const m4 = new THREE.Matrix4();
    const [cA, cB] = RAIL_COLORS[theme.rails] || RAIL_COLORS.white;
    let n = 0;
    for (const i of idxs) {
      const c = cl[i];
      for (const side of [-1, 1]) {
        const x = c.x + c.nx * side * (HALFW + 22);
        const z = c.y + c.ny * side * (HALFW + 22);
        m4.identity(); m4.setPosition(x, 4.5, z);
        posts.setMatrixAt(n, m4);
        m4.identity(); m4.setPosition(x, 10.5, z);
        tips.setMatrixAt(n, m4);
        tips.setColorAt(n, side < 0 ? cA : cB);
        n++;
      }
    }
    group.add(posts); group.add(tips);
  }

  // city ring
  if (theme.city && theme.city.count > 0) {
    let seed = 42;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cc = theme.city;
    const winTex = canvasTexture(128, (g) => {
      g.fillStyle = '#0a0a14'; g.fillRect(0, 0, 128, 128);
      for (let y = 6; y < 122; y += 12)
        for (let x = 8; x < 120; x += 14) {
          if (rnd() < cc.winDensity) {
            g.fillStyle = ['#ffd27a', '#9adcff', '#ff9ad0', '#fff0c0'][(x + y) % 4];
            g.fillRect(x, y, 7, 7);
          }
        }
    }, true);
    disposables.push(winTex);
    const city = new THREE.InstancedMesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({
        color: cc.color, roughness: 0.8, metalness: 0.2,
        emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: cc.glow, map: winTex,
      }),
      cc.count
    );
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < cc.count; i++) {
      const a = (i / cc.count) * TAU + rnd() * 0.08;
      const r = cc.rMin + rnd() * cc.rVar;
      const w = 70 + rnd() * 110;
      const h = cc.hMin + rnd() * cc.hVar;
      m4.makeScale(w, h, w);
      m4.setPosition(WORLDC + Math.cos(a) * r, h / 2 - 4, WORLDC + Math.sin(a) * r);
      city.setMatrixAt(i, m4);
    }
    group.add(city);
  }

  // grandstand + floodlights
  {
    const c = cl[(N - 14 + N) % N];
    const bx = c.x + c.nx * (HALFW + 95);
    const bz = c.y + c.ny * (HALFW + 95);
    const yaw = -Math.atan2(c.diry, c.dirx);
    const stand = new THREE.Group();
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(230, 8, 70),
      new THREE.MeshStandardMaterial({ color: 0x2a2a3c, roughness: 0.7 })
    );
    base.position.y = 4;
    stand.add(base);
    for (let row = 0; row < 4; row++) {
      const stepM = new THREE.Mesh(
        new THREE.BoxGeometry(230, 10, 16),
        new THREE.MeshStandardMaterial({ color: 0x353550, roughness: 0.7 })
      );
      stepM.position.set(0, 8 + row * 10, 10 + row * 16);
      stand.add(stepM);
    }
    let seed = 99;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const CROWD = 180;
    const fan = new THREE.InstancedMesh(
      new THREE.SphereGeometry(3.4, 6, 6),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }),
      CROWD
    );
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    for (let i = 0; i < CROWD; i++) {
      const row = i % 4;
      m4.identity();
      m4.setPosition(-108 + rnd() * 216, 17 + row * 10, 8 + row * 16 + (rnd() - 0.5) * 6);
      fan.setMatrixAt(i, m4);
      fan.setColorAt(i, col.setHSL(rnd(), 0.75, 0.6));
    }
    stand.add(fan);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(238, 4, 90),
      new THREE.MeshStandardMaterial({ color: 0x1c1c2c, roughness: 0.5, metalness: 0.5 })
    );
    roof.position.set(0, 62, 24);
    stand.add(roof);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(238, 2, 4),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.75, 2) })
    );
    trim.position.set(0, 62, -21);
    stand.add(trim);
    stand.position.set(bx, 0, bz);
    stand.rotation.y = yaw;
    group.add(stand);

    for (const off of [-38, 10]) {
      const ci = cl[(N - 14 + off + N) % N];
      const tx = ci.x + ci.nx * -1 * (HALFW + 55);
      const tz = ci.y + ci.ny * -1 * (HALFW + 55);
      const tower = new THREE.Group();
      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 4.5, 150, 8),
        new THREE.MeshStandardMaterial({ color: 0x30304a, roughness: 0.5, metalness: 0.6 })
      );
      pole.position.y = 75;
      tower.add(pole);
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(34, 16, 6),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.2, 1.8) })
      );
      panel.position.set(0, 152, 8);
      panel.rotation.x = 0.7;
      tower.add(panel);
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(70, 170, 16, 1, true),
        new THREE.MeshBasicMaterial({
          color: 0xffeebb, transparent: true, opacity: 0.035,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
        })
      );
      cone.position.set(0, 70, 60);
      cone.rotation.x = 0.55;
      tower.add(cone);
      tower.position.set(tx, 0, tz);
      tower.rotation.y = yaw;
      group.add(tower);
    }
  }

  // landmarks
  if (theme.landmark === 'eiffel') {
    buildEiffel(group, WORLDC + 120, WORLDC + 60);
  } else if (theme.landmark === 'lighthouse') {
    track.beacon = buildLighthouse(group, theme.sea ? theme.sea.x + 1550 : WORLDC, theme.sea ? theme.sea.z + 800 : WORLDC);
  }

  // minimap
  const mini = document.createElement('canvas');
  mini.width = mini.height = 84;
  {
    const g = mini.getContext('2d');
    g.fillStyle = 'rgba(10,10,30,0.7)';
    g.fillRect(0, 0, 84, 84);
    g.strokeStyle = '#e8e8e8'; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(cl[0].x / 2048 * 84, cl[0].y / 2048 * 84);
    for (let i = 1; i < N; i += 4) g.lineTo(cl[i].x / 2048 * 84, cl[i].y / 2048 * 84);
    g.closePath(); g.stroke();
  }
  track.miniCanvas = mini;

  scene.add(group);
  return track;
}

/* ---------------- Records ---------------- */
function loadRecords() {
  try { return JSON.parse(localStorage.getItem('iam-records')) || {}; } catch (e) { return {}; }
}
function recordsFor(mapId, ccIdx2) {
  const all = loadRecords();
  return all[`${mapId}-${ccIdx2}`] || [];
}
function saveRecord(mapId, ccIdx2, time, name) {
  const all = loadRecords();
  const key = `${mapId}-${ccIdx2}`;
  const list = all[key] || [];
  list.push({ t: time, name, d: new Date().toISOString().slice(0, 10) });
  list.sort((a, b) => a.t - b.t);
  all[key] = list.slice(0, 5);
  try { localStorage.setItem('iam-records', JSON.stringify(all)); } catch (e) {}
  return all[key].findIndex(r => r.t === time && r.name === name);
}

/* ---------------- Game state ---------------- */
function makeKart(charIdx, isPlayer, gridPos) {
  return {
    charIdx, isPlayer,
    x: 0, y: 0, angle: 0, speed: 0,
    trackIdx: 0, lap: 0, key: 0,
    boostT: 0, spinT: 0, spinAng: 0, starT: 0,
    item: null, itemDelay: 0, rouletteT: 0,
    coins: 0,
    driftCharge: 0, driftDir: 0,
    offroadT: 0, finishTime: 0, place: gridPos + 1,
    aiSkill: 0.87 + (gridPos % 7) * 0.017,
    laneSeed: gridPos * 1.7,
    steerVis: 0, wheelSpin: 0,
  };
}

let karts = [], player = null, bananas = [], shells = [];
let state = 'menu';
let menuChar = 0, mapSel = 0, ccSel = 1;
let ccMul = CC_CLASSES[1].mul;
let countdownT = 0, raceTime = 0, finishDelay = 0;
let camAngle = 0;
let lastBeep = -1;
let newRecordRank = -1;
let prevStart = false, prevLeft = false, prevRight = false, prevItem = false;

function clearProjectiles() {
  for (const b of bananas) scene.remove(b.mesh);
  for (const s of shells) scene.remove(s.mesh);
  bananas = []; shells = [];
}

function resetRace(playerChar) {
  clearProjectiles();
  karts = [];
  const order = [playerChar];
  for (let i = 0; i < CHARACTERS.length; i++) if (i !== playerChar) order.push(i);
  for (let i = 0; i < NUM_KARTS; i++) {
    const k = makeKart(order[i], i === 0, i);
    const row = i >> 1, lane = (i % 2 === 0 ? 1 : -1) * 38;
    const idx = (N - 8 - row * 9 + N) % N;
    const c = center[idx];
    k.x = c.x + c.nx * lane;
    k.y = c.y + c.ny * lane;
    k.angle = Math.atan2(c.diry, c.dirx);
    k.trackIdx = idx;
    karts.push(k);
  }
  player = karts[0];
  for (const b of track.itemBoxes) { b.respawn = 0; b.mesh.visible = true; }
  for (const cn of track.coins.data) cn.taken = false;
  camAngle = player.angle;
  raceTime = 0;
  newRecordRank = -1;
}

/* ---------------- Items (MK8-style) ---------------- */
const ROULETTE_ITEMS = ['mushroom', 'banana', 'shell', 'bolt', 'star'];

function rollItem(k) {
  const p = k.place;
  let table;
  if (p <= 2) table = [['banana', 0.4], ['shell', 0.35], ['mushroom', 0.25]];
  else if (p <= 5) table = [['mushroom', 0.3], ['shell', 0.25], ['banana', 0.2], ['bolt', 0.15], ['star', 0.1]];
  else table = [['mushroom', 0.3], ['star', 0.25], ['bolt', 0.25], ['shell', 0.1], ['banana', 0.1]];
  let r = Math.random();
  for (const [item, w] of table) { r -= w; if (r <= 0) return item; }
  return 'mushroom';
}

function useItem(k) {
  if (!k.item) return;
  const fwdX = Math.cos(k.angle), fwdY = Math.sin(k.angle);
  if (k.item === 'mushroom') {
    k.boostT = Math.max(k.boostT, 1.4);
    if (k.isPlayer) beep(300, 0.35, 'sawtooth', 900, 0.15);
  } else if (k.item === 'banana') {
    const mesh = bananaProto.clone();
    mesh.position.set(k.x - fwdX * 55, 0, k.y - fwdY * 55);
    scene.add(mesh);
    bananas.push({ x: mesh.position.x, y: mesh.position.z, mesh });
    if (k.isPlayer) beep(500, 0.08, 'square');
  } else if (k.item === 'shell') {
    const mesh = shellProto.clone();
    mesh.position.set(k.x + fwdX * 40, 0, k.y + fwdY * 40);
    scene.add(mesh);
    shells.push({
      x: k.x + fwdX * 40, y: k.y + fwdY * 40,
      angle: k.angle, life: 4.5, owner: k, grace: 0.35,
      trackIdx: k.trackIdx, mesh,
    });
    if (k.isPlayer) beep(760, 0.12, 'square', 500);
  } else if (k.item === 'bolt') {
    for (const o of karts)
      if (o !== k && o.key > k.key && o.spinT <= 0 && o.starT <= 0) { o.spinT = 1.1; o.speed *= 0.35; }
    beep(1200, 0.5, 'sawtooth', 200, 0.18);
  } else if (k.item === 'star') {
    k.starT = 5.5;
    if (k.isPlayer) beep(520, 0.4, 'square', 1560, 0.15);
  }
  k.item = null;
}

function spinKart(k) {
  if (k.spinT > 0 || k.boostT > 0.8 || k.starT > 0) return;
  k.spinT = 1.0;
  k.speed *= 0.3;
  k.coins = Math.max(0, k.coins - 3);
  if (k.isPlayer) beep(700, 0.4, 'square', 120, 0.15);
}

/* ---------------- Physics & AI ---------------- */
function nearestIdx(k) {
  let best = k.trackIdx, bestD = Infinity;
  for (let o = -8; o <= 24; o++) {
    const i = (k.trackIdx + o + N) % N;
    const c = center[i];
    const d = (c.x - k.x) ** 2 + (c.y - k.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function lateralOffset(k, c) {
  return (k.x - c.x) * c.nx + (k.y - c.y) * c.ny;
}

function updateKart(k, dt) {
  const maxSp = MAXSPEED * ccMul * (1 + k.coins * 0.004) * (k.starT > 0 ? 1.12 : 1);
  const boostSp = BOOSTSPEED * ccMul * (k.starT > 0 ? 1.08 : 1);
  const accel = ACCEL * ccMul;

  const ci = center[k.trackIdx];
  const lat = Math.abs(lateralOffset(k, ci));
  const offroad = lat > HALFW + 12;

  let throttle = 0, steer = 0;

  if (state === 'race' || (state === 'finish' && !k.isPlayer) || (k.lap > LAPS)) {
    if (k.isPlayer && k.lap <= LAPS && state === 'race') {
      throttle = input.gas ? 1 : 0;
      if (input.brake) throttle = -1;
      steer = getPlayerSteer();
    } else {
      const look = (k.trackIdx + 14 + ((k.speed / maxSp) * 14) | 0) % N;
      const c = center[look];
      const lane = Math.sin(raceTime * 0.35 + k.laneSeed) * 28;
      const tx = c.x + c.nx * lane, ty = c.y + c.ny * lane;
      const want = Math.atan2(ty - k.y, tx - k.x);
      const diff = angDiff(k.angle, want);
      steer = clamp(diff * 3.2, -1, 1);
      const curvAhead = center[(k.trackIdx + 26) % N].curv;
      let target = maxSp * k.aiSkill * clamp(1.18 - curvAhead * 1.9, 0.5, 1);
      if (player && !k.isPlayer) {
        const diffKey = player.key - k.key;
        target *= clamp(1 + diffKey * 0.00035, 0.93, 1.09);
      }
      throttle = k.speed < target ? 1 : -0.3;
      if (!k.isPlayer && k.item) {
        k.itemDelay -= dt;
        if (k.itemDelay <= 0) useItem(k);
      }
    }
  }

  if (k.rouletteT > 0) {
    k.rouletteT -= dt;
    if (k.rouletteT <= 0) {
      k.item = rollItem(k);
      if (k.isPlayer) beep(880, 0.12, 'square', 1320);
    }
  }

  if (k.spinT > 0) {
    k.spinT -= dt;
    k.spinAng += dt * 12;
    throttle = 0; steer = 0;
  } else k.spinAng = 0;
  if (k.starT > 0) k.starT -= dt;

  const grip = clamp(k.speed / 70, 0, 1);
  k.angle += steer * TURNRATE * grip * dt;
  k.steerVis = lerp(k.steerVis, steer, Math.min(1, dt * 10));

  if (k.isPlayer) {
    const sDir = Math.abs(steer) > 0.3 ? Math.sign(steer) : 0;
    if (sDir !== 0 && k.speed > maxSp * 0.72 && (k.driftDir === 0 || k.driftDir === sDir)) {
      k.driftDir = sDir;
      k.driftCharge += dt;
    } else {
      if (k.driftCharge > 1.05) { k.boostT = Math.max(k.boostT, 0.55); beep(200, 0.25, 'sawtooth', 700, 0.12); }
      k.driftCharge = 0; k.driftDir = 0;
    }
  }

  if (throttle > 0) k.speed += accel * dt;
  else if (throttle < 0) k.speed -= 260 * dt;
  const drag = DRAG + (offroad && k.starT <= 0 ? OFFDRAG : 0);
  k.speed -= k.speed * drag * dt;
  if (k.boostT > 0) {
    k.boostT -= dt;
    k.speed = Math.max(k.speed, lerp(k.speed, boostSp, 0.25));
  }
  if (k.boostT <= 0 && lat < HALFW * 0.7) {
    for (const bi of BOOST_IDX)
      if (idxDist(k.trackIdx, bi) <= 3) {
        k.boostT = 0.9;
        if (k.isPlayer) beep(240, 0.3, 'sawtooth', 800, 0.13);
        break;
      }
  }
  k.speed = clamp(k.speed, 0, boostSp);
  k.wheelSpin += k.speed * dt / 5.5;

  k.x += Math.cos(k.angle) * k.speed * dt;
  k.y += Math.sin(k.angle) * k.speed * dt;

  const ni = nearestIdx(k);
  if (k.trackIdx > N - 30 && ni < 30) { k.lap++; if (k.isPlayer && k.lap <= LAPS && k.lap > 1) beep(660, 0.15, 'square', 990); }
  else if (k.trackIdx < 30 && ni > N - 30) k.lap--;
  k.trackIdx = ni;
  k.key = k.lap * N + ni;
  if (k.lap > LAPS && !k.finishTime) k.finishTime = raceTime;

  const cc = center[ni];
  const dc = Math.hypot(cc.x - k.x, cc.y - k.y);
  if (offroad && dc > 300) {
    k.offroadT += dt;
    if (k.offroadT > 1.4) {
      k.x = cc.x; k.y = cc.y;
      k.angle = Math.atan2(cc.diry, cc.dirx);
      k.speed = 0; k.offroadT = 0;
    }
  } else k.offroadT = 0;

  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i];
    if ((b.x - k.x) ** 2 + (b.y - k.y) ** 2 < 28 * 28) {
      scene.remove(b.mesh);
      bananas.splice(i, 1);
      spinKart(k);
    }
  }
  for (const box of track.itemBoxes) {
    if (box.respawn > 0) continue;
    if ((box.x - k.x) ** 2 + (box.y - k.y) ** 2 < 32 * 32) {
      box.respawn = 3;
      if (!k.item && k.rouletteT <= 0) {
        if (k.isPlayer) { k.rouletteT = 1.5; beep(440, 0.06, 'square'); }
        else { k.rouletteT = 0.8; k.itemDelay = 1 + Math.random() * 3.5; }
      }
    }
  }
  {
    const cd = track.coins.data;
    for (let i = 0; i < cd.length; i++) {
      const cn = cd[i];
      if (cn.taken) continue;
      if ((cn.x - k.x) ** 2 + (cn.y - k.y) ** 2 < 24 * 24) {
        cn.taken = true;
        if (k.coins < 10) k.coins++;
        if (k.isPlayer) beep(1180, 0.07, 'square', 1560, 0.08);
      }
    }
  }
}

function updateShells(dt) {
  for (let i = shells.length - 1; i >= 0; i--) {
    const s = shells[i];
    s.life -= dt;
    s.grace -= dt;
    const sp = 470 * ccMul;
    s.x += Math.cos(s.angle) * sp * dt;
    s.y += Math.sin(s.angle) * sp * dt;
    let best = s.trackIdx, bestD = Infinity;
    for (let o = -6; o <= 20; o++) {
      const idx = (s.trackIdx + o + N) % N;
      const c = center[idx];
      const d = (c.x - s.x) ** 2 + (c.y - s.y) ** 2;
      if (d < bestD) { bestD = d; best = idx; }
    }
    s.trackIdx = best;
    const c = center[best];
    const lat = Math.abs((s.x - c.x) * c.nx + (s.y - c.y) * c.ny);
    let dead = s.life <= 0 || lat > HALFW + 24;
    if (!dead) {
      for (const k of karts) {
        if (k === s.owner && s.grace > 0) continue;
        if ((k.x - s.x) ** 2 + (k.y - s.y) ** 2 < 26 * 26) {
          if (k.starT <= 0) spinKart(k);
          dead = true;
          break;
        }
      }
    }
    if (dead) {
      scene.remove(s.mesh);
      shells.splice(i, 1);
    } else {
      s.mesh.position.set(s.x, 0, s.y);
      s.mesh.rotation.y -= dt * 12;
    }
  }
}

function kartCollisions() {
  for (let i = 0; i < karts.length; i++)
    for (let j = i + 1; j < karts.length; j++) {
      const a = karts[i], b = karts[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 30 * 30 && d2 > 0.01) {
        const d = Math.sqrt(d2), push = (30 - d) / 2;
        const ux = dx / d, uy = dy / d;
        a.x -= ux * push; a.y -= uy * push;
        b.x += ux * push; b.y += uy * push;
        if (a.starT > 0 && b.starT <= 0) spinKart(b);
        else if (b.starT > 0 && a.starT <= 0) spinKart(a);
      }
    }
}

function updatePlaces() {
  const sorted = [...karts].sort((a, b) => b.key - a.key);
  sorted.forEach((k, i) => k.place = i + 1);
}

/* ---------------- Mesh sync & world FX ---------------- */
function syncKartMeshes(dt) {
  for (const k of karts) {
    const m = kartMeshes[k.charIdx];
    m.group.visible = true;
    m.group.position.set(k.x, 0, k.y);
    m.group.rotation.y = -(k.angle + k.spinAng);
    m.chassis.rotation.x = k.steerVis * 0.10;
    m.chassis.rotation.z = clamp(k.speed * 0.0004, 0, 0.1) - (k.boostT > 0 ? 0.06 : 0);
    for (const w of m.wheels) {
      if (w.front) w.steerPivot.rotation.y = -k.steerVis * 0.45;
      w.spin.rotation.z = -k.wheelSpin;
    }
    m.flame.visible = k.boostT > 0;
    if (m.flame.visible) {
      const s = 20 + Math.sin(perfNow * 0.04) * 6;
      m.flame.scale.set(s, s, 1);
    }
    if (k.starT > 0) {
      const hue = (perfNow * 0.0012) % 1;
      m.bodyMat.emissive.setHSL(hue, 0.9, 0.4);
      m.bodyMat.emissiveIntensity = 0.8;
      m.starHalo.visible = true;
      m.starHalo.material.opacity = 0.5 + Math.sin(perfNow * 0.02) * 0.3;
    } else {
      m.bodyMat.emissive.setRGB(0, 0, 0);
      m.starHalo.visible = false;
    }
    const drifting = k.isPlayer && k.driftCharge > 1.05;
    for (const sp of m.sparks) sp.visible = drifting;
  }
  const active = new Set(karts.map(k => k.charIdx));
  kartMeshes.forEach((m, i) => { if (!active.has(i)) m.group.visible = false; });
}

const coinM4 = new THREE.Matrix4();
const coinQ = new THREE.Quaternion();
const coinE = new THREE.Euler();
const coinV = new THREE.Vector3();
const coinS = new THREE.Vector3(1, 1, 1);
const coinHidden = new THREE.Vector3(0.001, 0.001, 0.001);

function updateWorldFX(dt, t) {
  if (track.neonMat) track.neonMat.opacity = 0.6 + Math.sin(t * 2.2) * 0.25;
  for (const p of track.boostPads) p.tex.offset.y = (p.tex.offset.y - dt * 1.6) % 1;
  for (const b of track.itemBoxes) {
    if (b.respawn > 0) { b.respawn -= dt; b.mesh.visible = false; }
    else b.mesh.visible = true;
    b.mesh.rotation.y += dt * 1.5;
    b.mesh.rotation.x += dt * 0.9;
    const hue = (t * 0.15 + b.x * 0.001) % 1;
    b.mesh.material.color.setHSL(hue, 0.8, 0.6);
    b.mesh.material.emissive.setHSL(hue, 0.9, 0.35);
  }
  {
    const { inst, data } = track.coins;
    coinE.set(Math.PI / 2, 0, t * 2.5);
    coinQ.setFromEuler(coinE);
    for (let i = 0; i < data.length; i++) {
      const cn = data[i];
      coinV.set(cn.x, 14, cn.y);
      coinM4.compose(coinV, coinQ, cn.taken ? coinHidden : coinS);
      inst.setMatrixAt(i, coinM4);
    }
    inst.instanceMatrix.needsUpdate = true;
  }
  if (track.beacon) track.beacon.rotation.y = t * 1.1;

  for (const s of ships) {
    const a = t * s.w + s.ph;
    const x = WORLDC + Math.cos(a) * s.r;
    const z = WORLDC + Math.sin(a) * s.r * 0.85;
    const y = s.h + Math.sin(t * 0.7 + s.ph) * 30;
    const prev = s.group.position.clone();
    s.group.position.set(x, y, z);
    const dir = s.group.position.clone().sub(prev);
    if (dir.lengthSq() > 0.0001) {
      const yaw = Math.atan2(-dir.z, dir.x);
      s.group.rotation.set(0, yaw, clamp(-s.w * 6, -0.5, 0.5));
    }
    s.halo.material.opacity = 0.65 + Math.sin(t * 3 + s.ph) * 0.25;
    s.trailT += dt;
    if (s.trailT > 0.06) {
      s.trailT = 0;
      s.hist.unshift({ x, y, z });
      if (s.hist.length > s.trail.length) s.hist.pop();
    }
    s.trail.forEach((spr, i) => {
      const h = s.hist[i];
      if (!h) { spr.material.opacity = 0; return; }
      spr.position.set(h.x, h.y, h.z);
      spr.material.opacity = 0.5 * (1 - i / s.trail.length);
      const sc = 34 * (1 - i / (s.trail.length * 1.3));
      spr.scale.set(sc, sc, 1);
    });
  }
  for (const p of planes) {
    p.t += dt * p.speed;
    const range = 2600;
    const prog = (p.t % range) - range / 2;
    const dx = Math.cos(p.dir), dz = Math.sin(p.dir);
    const x = WORLDC + dx * prog - dz * 300;
    const z = WORLDC + dz * prog + dx * 300;
    const y = p.y + Math.sin(p.t * 0.01) * 12;
    p.group.position.set(x, y, z);
    p.group.rotation.y = Math.atan2(-dz, dx);
    p.prop.rotation.x += dt * 40;
    p.trailT += dt;
    if (p.trailT > 0.08) {
      p.trailT = 0;
      p.hist.unshift({ x, y, z });
      if (p.hist.length > p.trail.length) p.hist.pop();
    }
    p.trail.forEach((spr, i) => {
      const h = p.hist[i];
      if (!h) { spr.material.opacity = 0; return; }
      spr.position.set(h.x - dx * 24, h.y, h.z - dz * 24);
      spr.material.opacity = 0.35 * (1 - i / p.trail.length);
    });
  }
  for (const b of balloons) {
    b.group.position.y = b.baseY + Math.sin(t * 0.4 + b.ph) * 22;
    b.group.rotation.y = t * 0.1 + b.ph;
  }
  if (player && (state === 'race' || state === 'countdown' || state === 'finish')) {
    const fx = Math.cos(player.angle), fz = Math.sin(player.angle);
    headlight.intensity = 900;
    headlight.position.set(player.x + fx * 26, 10, player.y + fz * 26);
    headlight.target.position.set(player.x + fx * 240, 0, player.y + fz * 240);
  } else headlight.intensity = 0;
  if (confetti) {
    confettiT += dt;
    const pos = confetti.geometry.attributes.position;
    for (let i = 0; i < CONFETTI_N; i++) {
      confettiVel[i * 3 + 1] -= 60 * dt;
      pos.array[i * 3] += (confettiVel[i * 3] + Math.sin(t * 3 + i) * 14) * dt;
      pos.array[i * 3 + 1] += confettiVel[i * 3 + 1] * dt;
      pos.array[i * 3 + 2] += confettiVel[i * 3 + 2] * dt;
    }
    pos.needsUpdate = true;
    if (confettiT > 7) {
      scene.remove(confetti);
      confetti.geometry.dispose();
      confetti.material.dispose();
      confetti = null;
    }
  }
  const gl = track.gateLights;
  if (state === 'countdown') {
    const n = Math.ceil(3 - countdownT);
    gl.forEach((l, i) => {
      const on = 3 - n >= i + 1 || n <= 0;
      l.material.emissive.setHex(n <= 0 ? 0x00cc30 : on ? 0xcc2000 : 0x110000);
      l.material.color.setHex(n <= 0 ? 0x00ff40 : on ? 0xff3020 : 0x330000);
    });
  } else if (state === 'race') {
    gl.forEach(l => { l.material.emissive.setHex(0x00cc30); l.material.color.setHex(0x00ff40); });
  } else {
    gl.forEach(l => { l.material.emissive.setHex(0x110000); l.material.color.setHex(0x330000); });
  }
}

/* ---------------- Confetti ---------------- */
const CONFETTI_N = 260;
let confetti = null, confettiT = 0, confettiVel = null;
function spawnConfetti() {
  if (confetti) scene.remove(confetti);
  const posArr = new Float32Array(CONFETTI_N * 3);
  const colArr = new Float32Array(CONFETTI_N * 3);
  confettiVel = new Float32Array(CONFETTI_N * 3);
  const col = new THREE.Color();
  for (let i = 0; i < CONFETTI_N; i++) {
    posArr[i * 3] = player.x + (Math.random() - 0.5) * 260;
    posArr[i * 3 + 1] = 90 + Math.random() * 120;
    posArr[i * 3 + 2] = player.y + (Math.random() - 0.5) * 260;
    confettiVel[i * 3] = (Math.random() - 0.5) * 30;
    confettiVel[i * 3 + 1] = Math.random() * 25;
    confettiVel[i * 3 + 2] = (Math.random() - 0.5) * 30;
    col.setHSL(Math.random(), 0.9, 0.6);
    colArr[i * 3] = col.r; colArr[i * 3 + 1] = col.g; colArr[i * 3 + 2] = col.b;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  confetti = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 7, vertexColors: true, sizeAttenuation: true, fog: false,
  }));
  confettiT = 0;
  scene.add(confetti);
}

/* ---------------- Camera ---------------- */
function updateCamera(dt) {
  if (state === 'menu' || state === 'map' || state === 'cc') {
    const t = perfNow * 0.0003;
    const c = center[(N - 20) % N];
    camera.position.set(c.x + Math.cos(t) * 130, 55 + Math.sin(t * 0.7) * 12, c.y + Math.sin(t) * 130);
    camera.lookAt(c.x, 18, c.y);
    sun.position.set(c.x + 300, 500, c.y + 120);
    sun.target.position.set(c.x, 0, c.y);
  } else {
    camAngle += angDiff(camAngle, player.angle) * Math.min(1, dt * 7);
    const fx = Math.cos(camAngle), fz = Math.sin(camAngle);
    camera.position.set(player.x - fx * CAMBACK, CAMH, player.y - fz * CAMBACK);
    camera.lookAt(player.x + fx * 70, 22, player.y + fz * 70);
    // wider vertical FOV in portrait so the road stays visible
    const baseFov = camera.aspect < 1 ? 94 : 66;
    camera.fov = lerp(camera.fov, player.boostT > 0 ? baseFov + 8 : baseFov, Math.min(1, dt * 5));
    camera.updateProjectionMatrix();
    sun.position.set(player.x + 300, 500, player.y + 120);
    sun.target.position.set(player.x, 0, player.y);
  }
}

/* ---------------- HUD ---------------- */
const hud = document.getElementById('hud');
const hctx = hud.getContext('2d');
const PLACE_TXT = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const PLACE_COL = ['#ffd700', '#c0c0c0', '#cd7f32', '#fff', '#fff', '#fff', '#fff', '#fff'];
// HUD logical space: scaled so at least 480x320 fits, then stretched to the
// real screen ratio (full-bleed, portrait and landscape both playable).
const HH = 320;
let HW = 480;   // logical width  (dynamic)
let HB = 320;   // logical height (dynamic)
let OY = 0;     // vertical offset to center the menu screens in portrait

function text(str, x, y, size = 14, align = 'left', color = '#fff') {
  hctx.font = `bold ${size}px system-ui, sans-serif`;
  hctx.textAlign = align; hctx.textBaseline = 'top';
  hctx.lineWidth = Math.max(2, size / 5);
  hctx.lineJoin = 'round';
  hctx.strokeStyle = 'rgba(10,10,30,0.9)';
  hctx.strokeText(str, x, y);
  hctx.fillStyle = color;
  hctx.fillText(str, x, y);
}

function fmtTime(t) {
  const m = (t / 60) | 0, s = (t % 60) | 0, c = ((t * 100) % 100) | 0;
  return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function drawItemIcon(x, y, item, s = 1) {
  hctx.save();
  hctx.translate(x, y);
  hctx.scale(s, s);
  if (item === 'mushroom') {
    hctx.fillStyle = '#e03030';
    hctx.beginPath(); hctx.arc(0, -2, 9, Math.PI, TAU); hctx.fill();
    hctx.fillStyle = '#fff';
    hctx.beginPath(); hctx.arc(-4, -6, 2.5, 0, TAU); hctx.arc(4, -6, 2.5, 0, TAU); hctx.fill();
    hctx.fillRect(-4, -2, 8, 6);
  } else if (item === 'banana') {
    hctx.fillStyle = '#ffd21f';
    hctx.beginPath(); hctx.ellipse(0, 0, 9, 6, 0.6, 0, TAU); hctx.fill();
  } else if (item === 'bolt') {
    hctx.fillStyle = '#ffe040';
    hctx.beginPath();
    hctx.moveTo(2, -10); hctx.lineTo(-5, 2); hctx.lineTo(-1, 2);
    hctx.lineTo(-2, 10); hctx.lineTo(5, -2); hctx.lineTo(1, -2);
    hctx.closePath(); hctx.fill();
  } else if (item === 'shell') {
    hctx.fillStyle = '#28a828';
    hctx.beginPath(); hctx.arc(0, 0, 9, 0, TAU); hctx.fill();
    hctx.strokeStyle = '#f2f2e8';
    hctx.lineWidth = 3;
    hctx.beginPath(); hctx.arc(0, 2, 8, 0.15 * Math.PI, 0.85 * Math.PI); hctx.stroke();
  } else if (item === 'star') {
    hctx.fillStyle = '#ffe040';
    hctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 4.5 : 10;
      const a = -Math.PI / 2 + i * Math.PI / 5;
      hctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r);
    }
    hctx.closePath(); hctx.fill();
  }
  hctx.restore();
}

function drawCoinIcon(x, y, s = 1) {
  hctx.save();
  hctx.translate(x, y);
  hctx.scale(s, s);
  hctx.fillStyle = '#ffd24a';
  hctx.beginPath(); hctx.ellipse(0, 0, 8, 9, 0, 0, TAU); hctx.fill();
  hctx.fillStyle = '#c89018';
  hctx.beginPath(); hctx.ellipse(0, 0, 5, 6.5, 0, 0, TAU); hctx.fill();
  hctx.fillStyle = '#ffd24a';
  hctx.fillRect(-1.5, -4, 3, 8);
  hctx.restore();
}

function drawHUD() {
  if (player.boostT > 0) {
    hctx.save();
    hctx.strokeStyle = 'rgba(255,255,255,0.5)';
    hctx.lineWidth = 2;
    const cx = HW / 2, cy = HH / 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + (perfNow * 0.01 % TAU);
      const r1 = 110 + ((perfNow * 0.7 + i * 37) % 60);
      const r2 = r1 + 45 + (i % 3) * 18;
      hctx.beginPath();
      hctx.moveTo(cx + Math.cos(a) * r1 * 1.6, cy + Math.sin(a) * r1);
      hctx.lineTo(cx + Math.cos(a) * r2 * 1.6, cy + Math.sin(a) * r2);
      hctx.stroke();
    }
    hctx.restore();
  }
  text(PLACE_TXT[player.place - 1], 10, 8, 26, 'left', PLACE_COL[player.place - 1]);
  text(CC_CLASSES[ccSel].label, 12, 38, 11, 'left', '#9fe');
  text(`LAP ${clamp(player.lap, 1, LAPS)}/${LAPS}`, HW - 10, 8, 16, 'right');
  text(fmtTime(raceTime), HW - 10, 28, 12, 'right', '#cfe');
  hctx.fillStyle = 'rgba(0,0,20,0.45)';
  hctx.strokeStyle = 'rgba(255,255,255,0.7)';
  hctx.lineWidth = 2;
  hctx.beginPath(); hctx.roundRect(HW / 2 - 18, 6, 36, 36, 6); hctx.fill(); hctx.stroke();
  if (player.rouletteT > 0) {
    const idx = Math.floor(perfNow / 90) % ROULETTE_ITEMS.length;
    drawItemIcon(HW / 2, 24, ROULETTE_ITEMS[idx], 1.4);
  } else if (player.item) {
    drawItemIcon(HW / 2, 24, player.item, 1.4);
  }
  drawCoinIcon(18, HB - 20, 1.1);
  text(`× ${player.coins}`, 30, HB - 28, 15, 'left', '#ffd24a');
  hctx.globalAlpha = 0.9;
  hctx.drawImage(track.miniCanvas, HW - 94, HB - 94);
  for (const k of karts) {
    hctx.fillStyle = k.isPlayer ? '#fff' : CHARACTERS[k.charIdx].color;
    const mx = HW - 94 + k.x / 2048 * 84, my = HB - 94 + k.y / 2048 * 84;
    hctx.beginPath(); hctx.arc(mx, my, k.isPlayer ? 3 : 2.2, 0, TAU); hctx.fill();
  }
  hctx.globalAlpha = 1;
}

function drawMenu() {
  hctx.fillStyle = 'rgba(8,5,25,0.35)';
  hctx.fillRect(0, 0, HW, HB);
  text('IAM KART', HW / 2, OY + 26, 54, 'center', '#40e0ff');
  text('Inès · Alice · Marlon', HW / 2, OY + 84, 16, 'center', '#ff50dc');
  text('Choisis ton pilote', HW / 2, OY + 118, 12, 'center', '#cfe');

  const ch = CHARACTERS[menuChar];
  text('◀', HW / 2 - 100, OY + 168, 26, 'center', '#fff');
  text('▶', HW / 2 + 100, OY + 168, 26, 'center', '#fff');
  text(ch.name, HW / 2, OY + 172, 22, 'center', ch.color);

  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR CONTINUER', HW / 2, OY + 250, 14, 'center', '#fff');
  text('← → choisir · A/↑ gaz · B/Shift objet', HW / 2, OY + 292, 10, 'center', '#9ab');
  if (innerHeight > innerWidth && matchMedia('(pointer: coarse)').matches)
    text('Astuce : verrouille la rotation iOS pour jouer au gyro en paysage 🔒', HW / 2, OY + 270, 9, 'center', '#8ac');
}

function drawMapSelect() {
  hctx.fillStyle = 'rgba(8,5,25,0.45)';
  hctx.fillRect(0, 0, HW, HB);
  text('CHOISIS TON CIRCUIT', HW / 2, OY + 18, 22, 'center', '#40e0ff');
  const map = MAPS[mapSel];
  text('◀', HW / 2 - 130, OY + 120, 30, 'center', '#fff');
  text('▶', HW / 2 + 130, OY + 120, 30, 'center', '#fff');
  text(map.name.toUpperCase(), HW / 2, OY + 60, 30, 'center', '#ffd24a');
  text(map.desc, HW / 2, OY + 98, 12, 'center', '#cfe');
  hctx.globalAlpha = 0.95;
  hctx.drawImage(track.miniCanvas, HW / 2 - 50, OY + 122, 100, 100);
  hctx.globalAlpha = 1;
  text(`${mapSel + 1} / ${MAPS.length}`, HW / 2, OY + 232, 11, 'center', '#9ab');
  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR VALIDER', HW / 2, OY + 262, 14, 'center', '#fff');
}

function drawCcSelect() {
  hctx.fillStyle = 'rgba(8,5,25,0.45)';
  hctx.fillRect(0, 0, HW, HB);
  text('CHOISIS TA CATÉGORIE', HW / 2, OY + 18, 22, 'center', '#40e0ff');
  CC_CLASSES.forEach((cc, i) => {
    const sel = i === ccSel;
    const y = OY + 64 + i * 44;
    if (sel) {
      hctx.fillStyle = 'rgba(64,224,255,0.18)';
      hctx.beginPath(); hctx.roundRect(HW / 2 - 130, y - 6, 260, 38, 8); hctx.fill();
    }
    text(cc.label, HW / 2 - 60, y, 22, 'left', sel ? '#ffd24a' : '#eee');
    text(cc.desc, HW / 2 + 60, y + 5, 13, 'right', sel ? '#fff' : '#9ab');
  });
  const recs = recordsFor(MAPS[mapSel].id, ccSel);
  text(`RECORDS — ${MAPS[mapSel].name} · ${CC_CLASSES[ccSel].label}`, HW / 2, OY + 212, 11, 'center', '#ff50dc');
  if (recs.length === 0) text('Aucun temps enregistré — à toi de jouer !', HW / 2, OY + 232, 11, 'center', '#9ab');
  recs.slice(0, 3).forEach((r, i) => {
    text(`${i + 1}. ${fmtTime(r.t)}  ${r.name}`, HW / 2, OY + 230 + i * 16, 12, 'center', i === 0 ? '#ffd24a' : '#cfe');
  });
  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR COURIR !', HW / 2, OY + 292, 13, 'center', '#fff');
}

function drawCountdown() {
  const n = Math.ceil(3 - countdownT);
  if (n !== lastBeep && n > 0) { beep(440, 0.15, 'square'); lastBeep = n; }
  if (n > 0) text(String(n), HW / 2, OY + 100, 80, 'center', '#ffd21f');
  else {
    if (lastBeep !== 0) { beep(880, 0.4, 'square'); lastBeep = 0; }
    if (countdownT < 3.7) text('GO!', HW / 2, OY + 100, 80, 'center', '#40e060');
  }
}

function drawFinish() {
  hctx.fillStyle = 'rgba(5,5,25,0.7)';
  hctx.fillRect(0, 0, HW, HB);
  text('COURSE TERMINÉE !', HW / 2, OY + 12, 22, 'center', '#ffd21f');
  if (newRecordRank === 0) text('★ NOUVEAU RECORD ! ★', HW / 2, OY + 36, 15, 'center', '#ffd24a');
  else if (newRecordRank > 0) text(`Top ${newRecordRank + 1} local !`, HW / 2, OY + 36, 13, 'center', '#9fe');
  const sorted = [...karts].sort((a, b) => {
    if (a.finishTime && b.finishTime) return a.finishTime - b.finishTime;
    if (a.finishTime) return -1;
    if (b.finishTime) return 1;
    return b.key - a.key;
  });
  sorted.forEach((k, i) => {
    const ch = CHARACTERS[k.charIdx];
    const y = OY + 58 + i * 22;
    text(PLACE_TXT[i], HW / 2 - 130, y, 14, 'left', PLACE_COL[i]);
    text(ch.name + (k.isPlayer ? '  ★' : ''), HW / 2 - 70, y, 14, 'left', k.isPlayer ? '#fff' : ch.color);
    if (k.finishTime) text(fmtTime(k.finishTime), HW / 2 + 130, y, 12, 'right', '#cfe');
  });
  const recs = recordsFor(MAPS[mapSel].id, ccSel);
  if (recs.length) text(`Record local : ${fmtTime(recs[0].t)} (${recs[0].name})`, HW / 2, HB - 44, 11, 'center', '#ff50dc');
  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR REJOUER', HW / 2, HB - 24, 13, 'center', '#fff');
}

/* ---------------- Resize ---------------- */
function resize() {
  const r = glCanvas.getBoundingClientRect();
  if (r.width === 0) return;
  renderer.setSize(r.width, r.height, false);
  composer.setSize(r.width, r.height);
  composer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  camera.aspect = r.width / r.height;
  camera.updateProjectionMatrix();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  hud.width = Math.round(r.width * dpr);
  hud.height = Math.round(r.height * dpr);
}
addEventListener('resize', resize);
resize();

/* ---------------- Main loop ---------------- */
let perfNow = 0, lastT = 0;

function frame(t) {
  requestAnimationFrame(frame);
  perfNow = t;
  const dt = clamp((t - lastT) / 1000, 0, 0.033);
  lastT = t;
  const tSec = t * 0.001;

  const startPressed = input.start && !prevStart;
  const effLeft = input.left || joy.value < -0.5;
  const effRight = input.right || joy.value > 0.5;
  const leftPressed = effLeft && !prevLeft;
  const rightPressed = effRight && !prevRight;
  const itemPressed = input.item && !prevItem;
  prevStart = input.start; prevLeft = effLeft; prevRight = effRight; prevItem = input.item;

  if (window.__iamUpdateReady && state !== 'race' && state !== 'countdown') {
    window.__iamUpdateReady = false;
    location.reload();
    return;
  }

  if (state === 'menu') {
    if (leftPressed) menuChar = (menuChar + CHARACTERS.length - 1) % CHARACTERS.length;
    if (rightPressed) menuChar = (menuChar + 1) % CHARACTERS.length;
    if (karts.length === 0 || karts[0].charIdx !== menuChar) resetRace(menuChar);
    if (startPressed) { state = 'map'; beep(560, 0.08, 'square'); }
  } else if (state === 'map') {
    let changed = false;
    if (leftPressed) { mapSel = (mapSel + MAPS.length - 1) % MAPS.length; changed = true; }
    if (rightPressed) { mapSel = (mapSel + 1) % MAPS.length; changed = true; }
    if (changed) {
      buildTrack(mapSel);
      resetRace(menuChar);
      beep(480, 0.06, 'square');
    }
    if (startPressed) { state = 'cc'; beep(560, 0.08, 'square'); }
  } else if (state === 'cc') {
    if (leftPressed) ccSel = (ccSel + CC_CLASSES.length - 1) % CC_CLASSES.length;
    if (rightPressed) ccSel = (ccSel + 1) % CC_CLASSES.length;
    if (startPressed) {
      ccMul = CC_CLASSES[ccSel].mul;
      resetRace(menuChar);
      state = 'countdown';
      countdownT = 0; lastBeep = -1;
      tryFullscreen();
    }
  } else if (state === 'countdown') {
    countdownT += dt;
    if (countdownT >= 3) { raceTime = 0; state = 'race'; }
  }

  if (state === 'race' || state === 'finish') {
    raceTime += dt;
    if (state === 'race') countdownT += dt;
    for (const b of track.itemBoxes) if (b.respawn > 0) b.respawn -= dt;
    for (const k of karts) updateKart(k, dt);
    updateShells(dt);
    kartCollisions();
    updatePlaces();
    if (state === 'race' && player.lap > LAPS) {
      finishDelay = 1.4;
      state = 'finish';
      newRecordRank = saveRecord(MAPS[mapSel].id, ccSel, player.finishTime, CHARACTERS[player.charIdx].name);
      spawnConfetti();
      beep(523, 0.15, 'square'); beep(659, 0.15, 'square');
      setTimeout(() => beep(784, 0.3, 'square', 1046), 180);
    }
  }
  if (state === 'finish') {
    if (finishDelay > 0) finishDelay -= dt;
    else if (startPressed) { state = 'menu'; resetRace(menuChar); }
  }
  if (itemPressed && state === 'race') useItem(player);

  syncKartMeshes(dt);
  updateWorldFX(dt, tSec);
  updateCamera(dt);
  composer.render();

  const S = Math.min(hud.width / 480, hud.height / HH);
  HW = Math.round(hud.width / S);
  HB = Math.round(hud.height / S);
  OY = Math.max(0, Math.round((HB - HH) / 2));
  hctx.setTransform(S, 0, 0, S, 0, 0);
  hctx.clearRect(0, 0, HW, HB);
  if (state === 'menu') drawMenu();
  else if (state === 'map') drawMapSelect();
  else if (state === 'cc') drawCcSelect();
  else {
    drawHUD();
    if (state === 'countdown' || (state === 'race' && countdownT < 3.7)) drawCountdown();
    if (state === 'finish' && finishDelay <= 0) drawFinish();
  }
  if (window.__iamUpdateReady)
    text('✨ Mise à jour prête — appliquée après la course', HW / 2, HB - 14, 9, 'center', '#9fe');

  updateEngine(player ? player.speed : 0, state === 'race' || state === 'countdown');
}

function tryFullscreen() {
  try {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const el = document.getElementById('wrap');
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    if (screen.orientation && screen.orientation.lock)
      screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* pas bloquant */ }
}

buildTrack(0);
resetRace(0);
requestAnimationFrame(frame);

/* ---------------- Debug handle (automated tests) ---------------- */
window.IAM = {
  get state() { return state; },
  get raceTime() { return raceTime; },
  get karts() { return karts; },
  get player() { return player; },
  get mapSel() { return mapSel; },
  get ccSel() { return ccSel; },
  CHARACTERS, MAPS,
  records: loadRecords,
  makePlayerAI() { if (player) player.isPlayer = false; },
  start(mapIdx = 0, ccIdx = 2, charIdx = 0) {
    menuChar = charIdx; mapSel = mapIdx; ccSel = ccIdx;
    ccMul = CC_CLASSES[ccSel].mul;
    buildTrack(mapSel);
    resetRace(menuChar);
    state = 'countdown';
    countdownT = 0; lastBeep = -1;
  },
};
