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
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
      city: { count: 70, rMin: 1750, rVar: 700, hMin: 140, hVar: 340, glow: 1.0, style: 'modern', signs: 0.30 },
      rails: 'neon', trees: 'mixed', landmark: null, sea: null, hills: 40, peaks: [0x4a3a68, true],
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
      fog: 0xb8cfe4, fogNear: 1000, fogFar: 3400,
      hemi: [0xc4d8ec, 0x4a6a3a, 1.05], sunL: [0xfff2d0, 2.5],
      ground: '#4a8a44', groundDots: ['#3f7a3d', '#549552', '#589a56', '#3a713a'],
      city: { count: 60, rMin: 1450, rVar: 500, hMin: 70, hVar: 60, glow: 0.15, style: 'paris', signs: 0 },
      rails: 'gold', trees: 'round', landmark: 'eiffel', sea: null, hills: 28, peaks: [0x6a8a5a, true],
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
      fog: 0xaed6ec, fogNear: 1000, fogFar: 3400,
      hemi: [0xcfe4f4, 0x4a7a52, 1.1], sunL: [0xfffbe8, 2.6],
      ground: '#58a04e', groundDots: ['#4c9044', '#64ac5a', '#68b05e', '#468442'],
      city: { count: 48, rMin: 1400, rVar: 420, hMin: 55, hVar: 70, glow: 0.12, style: 'riviera', signs: 0 },
      rails: 'white', trees: 'palm', landmark: null, hills: 32, peaks: [0x5f9a68, false],
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
      city: { count: 110, rMin: 1450, rVar: 950, hMin: 220, hVar: 460, glow: 1.25, style: 'modern', signs: 0.35 },
      rails: 'neon', trees: 'sparse', landmark: null, sea: null, hills: 14, peaks: [0x10162a, false],
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
      city: { count: 26, rMin: 1500, rVar: 400, hMin: 45, hVar: 55, glow: 0.2, style: 'riviera', signs: 0 },
      rails: 'coral', trees: 'palmpine', landmark: 'lighthouse', hills: 55, peaks: [0x55784a, true],
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
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return; // typing a name
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); unlockAudio(); }
  else if (e.code === 'KeyR') uiQueue.push({ t: 'restart' });
});
addEventListener('keyup', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  const k = KEYMAP[e.code];
  if (k) { input[k] = false; e.preventDefault(); }
});

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
// gyro is ON by default (unless the player explicitly turned it off)
let gyroPref = true;
try { gyroPref = localStorage.getItem('iam-gyro') !== '0'; } catch (e) {}
const needsGyroPermission = typeof DeviceOrientationEvent !== 'undefined' &&
  typeof DeviceOrientationEvent.requestPermission === 'function';
if (gyroPref && !needsGyroPermission && 'DeviceOrientationEvent' in window) {
  addEventListener('deviceorientation', onOrientation);
  gyro.enabled = true;
}
// iOS: permission must come from a user gesture -> ask on the first tap
let gyroAsked = false;
async function maybeAskGyro() {
  if (gyroAsked || gyro.enabled || !gyroPref || !needsGyroPermission) return;
  gyroAsked = true;
  try {
    const res = await DeviceOrientationEvent.requestPermission();
    if (res === 'granted') {
      addEventListener('deviceorientation', onOrientation);
      gyro.enabled = true;
      updateGyroBtn();
    }
  } catch (e) { /* refusé */ }
}
updateGyroBtn();

// auto-accelerate (MK-style assist), ON by default
let autoGas = true;
try { autoGas = localStorage.getItem('iam-autogas') !== '0'; } catch (e) {}
const autoBtn = document.getElementById('btnAuto');
function updateAutoBtn() { if (autoBtn) { autoBtn.textContent = autoGas ? '🚗 AUTO' : '🚗 MANU'; autoBtn.classList.toggle('on', autoGas); } }
if (autoBtn) autoBtn.addEventListener('click', () => {
  autoGas = !autoGas;
  try { localStorage.setItem('iam-autogas', autoGas ? '1' : '0'); } catch (e) {}
  updateAutoBtn();
  beep(autoGas ? 660 : 440, 0.08, 'square');
});
updateAutoBtn();

function getPlayerSteer() {
  const kb = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  if (kb) return kb;
  if (joy.active) return joy.value;
  if (gyro.enabled) return gyro.steer;
  return 0;
}

const glCanvas = document.getElementById('game');
// tappable HUD regions (rebuilt every frame by the menu screens)
let hudRegions = [];
const uiQueue = [];
let tapStart = false;
function hitR(x, y, w, h, action) { hudRegions.push({ x, y, w, h, action }); }
// tap = validate / hit a widget; horizontal (or vertical on lists) swipe =
// scroll through the current selection
let ptrDown = null;
glCanvas.addEventListener('pointerdown', (e) => {
  unlockAudio();
  maybeAskGyro(); // iOS gyro permission needs a genuine tap
  ptrDown = { cx: e.clientX, cy: e.clientY };
});
glCanvas.addEventListener('pointerup', (e) => {
  input.start = false;
  if (!ptrDown) return;
  const start = ptrDown; ptrDown = null;
  const dx = e.clientX - start.cx, dy = e.clientY - start.cy;
  const r = glCanvas.getBoundingClientRect();
  if (Math.hypot(dx, dy) < 14) {
    // tap
    const x = (start.cx - r.left) / r.width * HW;
    const y = (start.cy - r.top) / r.height * HB;
    const hit = hudRegions.find(rg => x >= rg.x && x <= rg.x + rg.w && y >= rg.y && y <= rg.y + rg.h);
    if (hit) { uiQueue.push(hit.action); return; }
    tapStart = true; // latched so a quick tap is never missed between frames
    return;
  }
  // swipe
  if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy))
    uiQueue.push({ t: 'nav', d: dx < 0 ? 1 : -1 });
  else if (Math.abs(dy) > 35)
    uiQueue.push({ t: 'nav', d: dy < 0 ? 1 : -1 }); // vertical lists (cylindrée)
});
glCanvas.addEventListener('pointercancel', () => { ptrDown = null; input.start = false; });

/* ---------------- Audio ---------------- */
let AC = null, engineOsc = null, engineGain = null;
let muted = false;
try { muted = localStorage.getItem('iam-muted') === '1'; } catch (e) {}
const audioBtn = document.getElementById('btnAudio');
function updateAudioBtn() { if (audioBtn) audioBtn.textContent = muted ? '🔇' : '🔊'; }
if (audioBtn) audioBtn.addEventListener('click', () => {
  muted = !muted;
  try { localStorage.setItem('iam-muted', muted ? '1' : '0'); } catch (e) {}
  unlockAudio();
  updateAudioBtn();
  if (!muted) beep(660, 0.1, 'square', 990);
});
updateAudioBtn();
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

// iOS Safari mishandles the HDR bloom pipeline (everything turns milky and
// overexposed) -> render directly there; the renderer applies tone mapping
// itself and native canvas MSAA keeps the edges smooth.
const IS_IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const USE_POST = !IS_IOS;
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

const roadTex = canvasTexture(512, (g) => {
  g.fillStyle = '#4a4a54'; g.fillRect(0, 0, 512, 512);
  // fine aggregate
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.13)';
    g.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }
  // tire wear lanes (darker where the karts roll)
  for (const cx of [150, 362]) {
    const wear = g.createLinearGradient(cx - 42, 0, cx + 42, 0);
    wear.addColorStop(0, 'rgba(0,0,0,0)');
    wear.addColorStop(0.5, 'rgba(0,0,0,0.16)');
    wear.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = wear;
    g.fillRect(cx - 42, 0, 84, 512);
  }
  // faint cracks
  g.strokeStyle = 'rgba(0,0,0,0.14)'; g.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) {
    g.beginPath();
    let x = Math.random() * 512, y = Math.random() * 512;
    g.moveTo(x, y);
    for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += 18 + Math.random() * 26; g.lineTo(x, y); }
    g.stroke();
  }
  g.fillStyle = '#e8e8ea';
  g.fillRect(12, 0, 12, 512);
  g.fillRect(488, 0, 12, 512);
  g.fillStyle = '#ffd24a';
  g.fillRect(249, 20, 14, 200);
  g.fillRect(249, 292, 14, 200);
}, true);

const curbTex = canvasTexture(64, (g) => {
  g.fillStyle = '#e03030'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 32, 64, 32);
}, true);

// procedural normal map from smoothed value noise — micro-relief that makes
// asphalt and grass react to light instead of looking like flat paint
function noiseNormalMap(size, cells, strength) {
  let seed = 1234;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grid = [];
  for (let i = 0; i < cells * cells; i++) grid.push(rnd());
  const hAt = (x, y) => {
    const gx = (x / size) * cells, gy = (y / size) * cells;
    const x0 = Math.floor(gx) % cells, y0 = Math.floor(gy) % cells;
    const x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells;
    const fx = gx - Math.floor(gx), fy = gy - Math.floor(gy);
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const a = grid[y0 * cells + x0], b = grid[y0 * cells + x1];
    const c = grid[y1 * cells + x0], d = grid[y1 * cells + x1];
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  };
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const g = cv.getContext('2d');
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = (hAt(x + 1, y) - hAt(x - 1 + size, y)) * strength;
      const dy = (hAt(x, y + 1) - hAt(x, y - 1 + size)) * strength;
      const inv = 1 / Math.hypot(dx, dy, 1);
      const p = (y * size + x) * 4;
      img.data[p] = (-dx * inv * 0.5 + 0.5) * 255;
      img.data[p + 1] = (-dy * inv * 0.5 + 0.5) * 255;
      img.data[p + 2] = inv * 255;
      img.data[p + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const roadNormal = noiseNormalMap(128, 24, 2.2);
const groundNormal = noiseNormalMap(128, 16, 3.0);

/* ---------------- Kart models ---------------- */
// cartoon faces — the first three drivers are personalised portraits of
// Inès, Alice and Marlon (hair, glasses, expressions inspired by the family
// photo; drawn in code, no personal data shipped)
function makeFaceTexture(charIdx = -1) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const g = c.getContext('2d');
  g.scale(2, 2); // same 256x128 logical layout as before, twice the detail
  const kid = charIdx >= 0 && charIdx <= 2;
  const cx = 128, cy = 62;
  let seed = 7 + charIdx * 131;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // ---- skin: warm base + painted volume (light from above-left) ----
  const SKIN = kid ? ['#f2cba6', '#f4cda6', '#eec49e'][charIdx] : '#f6c9a0';
  g.fillStyle = SKIN; g.fillRect(0, 0, 256, 128);
  const vsh = g.createLinearGradient(0, 0, 0, 128);
  vsh.addColorStop(0, 'rgba(255,240,220,0.18)');
  vsh.addColorStop(0.55, 'rgba(255,255,255,0)');
  vsh.addColorStop(1, 'rgba(122,70,42,0.22)');
  g.fillStyle = vsh; g.fillRect(0, 0, 256, 128);
  const key = g.createRadialGradient(cx - 22, 36, 8, cx - 22, 36, 115);
  key.addColorStop(0, 'rgba(255,238,215,0.32)');
  key.addColorStop(1, 'rgba(255,238,215,0)');
  g.fillStyle = key; g.fillRect(0, 0, 256, 128);
  for (const sx of [-1, 1]) { // cheekbone shading
    const gg = g.createRadialGradient(cx + sx * 54, cy + 20, 6, cx + sx * 54, cy + 20, 48);
    gg.addColorStop(0, 'rgba(150,90,55,0.13)');
    gg.addColorStop(1, 'rgba(150,90,55,0)');
    g.fillStyle = gg; g.fillRect(0, 0, 256, 128);
  }
  const chin = g.createRadialGradient(cx, 126, 4, cx, 126, 42);
  chin.addColorStop(0, 'rgba(140,80,48,0.16)');
  chin.addColorStop(1, 'rgba(140,80,48,0)');
  g.fillStyle = chin; g.fillRect(0, 0, 256, 128);

  // ---- hair: base masses + individual strands in 3 tones ----
  const HAIR = kid ? ['#5d4326', '#4e3a22', '#54381e'][charIdx] : null;
  const strand = (x1, y1, x2, y2, tone, w, bow = 6) => {
    g.strokeStyle = tone; g.lineWidth = w; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2 + bow, (y1 + y2) / 2, x2, y2);
    g.stroke();
  };
  if (HAIR) {
    const dark = ['#3e2c15', '#332512', '#38240f'][charIdx];
    const lite = ['#8a6a3c', '#7a5f36', '#7d5a30'][charIdx];
    g.fillStyle = HAIR;
    if (charIdx === 0) { // Inès: wavy, shoulder-length, middle part
      g.fillRect(0, 0, 78, 128); g.fillRect(178, 0, 78, 128); g.fillRect(0, 0, 256, 30);
      g.beginPath(); g.moveTo(78, 30); g.quadraticCurveTo(90, 62, 78, 128); g.lineTo(56, 128); g.lineTo(56, 30); g.fill();
      g.beginPath(); g.moveTo(178, 30); g.quadraticCurveTo(166, 62, 178, 128); g.lineTo(200, 128); g.lineTo(200, 30); g.fill();
      for (let i = 0; i < 14; i++) { // waves: S-curved strands falling on both sides
        const sx = i < 7 ? 1 : -1, o = (i % 7) * 9 + rnd() * 5;
        const x0 = cx + sx * (58 + o * 0.55), amp = 5 + rnd() * 5;
        g.strokeStyle = i % 3 === 0 ? lite : dark; g.lineWidth = 1.6 + rnd() * 1.4; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x0, 8 + rnd() * 8);
        g.bezierCurveTo(x0 + sx * amp, 40, x0 - sx * amp, 78, x0 + sx * amp * 0.7, 124);
        g.stroke();
      }
      g.strokeStyle = dark; g.lineWidth = 2.4;
      g.beginPath(); g.moveTo(128, 0); g.lineTo(128, 27); g.stroke(); // middle part
      for (const sx of [-1, 1]) { // crown swept from the part
        for (let i = 1; i <= 5; i++)
          strand(128 + sx * 2, 3 + i * 2, 128 + sx * (30 + i * 9), 26 + i * 1.5, i % 2 ? dark : lite, 1.5, sx * 8);
      }
    } else if (charIdx === 1) { // Alice: long, straight, glossy
      g.fillRect(0, 0, 70, 128); g.fillRect(186, 0, 70, 128); g.fillRect(0, 0, 256, 36);
      for (let i = 0; i < 16; i++) { // straight falls
        const sx = i < 8 ? -1 : 1, o = (i % 8) * 8 + rnd() * 4;
        const x0 = cx + sx * (62 + o * 0.5);
        strand(x0, 6 + rnd() * 6, x0 + sx * 2, 126, i % 4 === 0 ? lite : dark, 1.4 + rnd(), sx * 2);
      }
      g.strokeStyle = 'rgba(255,225,170,0.30)'; g.lineWidth = 5; // shine band
      g.beginPath(); g.arc(cx, 66, 92, Math.PI * 1.22, Math.PI * 1.78); g.stroke();
      for (const sx of [-1, 1])
        for (let i = 1; i <= 6; i++)
          strand(cx + sx * 6, 4 + i, cx + sx * (34 + i * 10), 30 + i, i % 2 ? dark : HAIR, 1.5, sx * 6);
    } else { // Marlon: short, tousled, spiky
      g.fillRect(0, 0, 62, 74); g.fillRect(194, 0, 62, 74);
      g.beginPath();
      g.moveTo(60, 34);
      for (let x = 60; x <= 196; x += 17)
        g.quadraticCurveTo(x + 8, 20 + (x % 34 ? 8 : 0), x + 17, 34);
      g.lineTo(196, 0); g.lineTo(60, 0);
      g.closePath(); g.fill();
      for (let i = 0; i < 18; i++) { // tousled flicks, alternating tones
        const x0 = 62 + i * 7.4 + rnd() * 3, tip = 16 + rnd() * 10;
        strand(x0, 33, x0 + (rnd() - 0.5) * 14, tip, i % 3 === 0 ? lite : dark, 1.8, (rnd() - 0.5) * 10);
      }
      g.fillStyle = 'rgba(255,235,200,0.10)'; // sun catch on the crown
      g.beginPath(); g.ellipse(cx - 16, 16, 46, 12, -0.1, 0, TAU); g.fill();
    }
  }

  // ---- eyebrows: base arc + hair flicks ----
  const BROW = HAIR || '#5a3a20';
  for (const sx of [-1, 1]) {
    const ex = cx + sx * 17;
    g.strokeStyle = BROW; g.lineWidth = 3.4; g.lineCap = 'round';
    g.beginPath(); g.arc(ex, cy - 21, 11, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.lineWidth = 1.2;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (1.18 + i * 0.105);
      const bx = ex + Math.cos(a) * 11, by = cy - 21 + Math.sin(a) * 11;
      g.beginPath(); g.moveTo(bx, by + 1.5); g.lineTo(bx + sx * 1.5, by - 2.5); g.stroke();
    }
  }

  // ---- eyes (Marlon's stay behind his sunglasses) ----
  for (const sx of [-1, 1]) {
    if (charIdx === 2) continue;
    const ex = cx + sx * 17, ey = cy - 6;
    g.fillStyle = 'rgba(135,85,55,0.18)'; // socket depth
    g.beginPath(); g.ellipse(ex, ey - 2, 13.5, 15, 0, 0, TAU); g.fill();
    g.fillStyle = '#fdf7ef';
    g.beginPath(); g.ellipse(ex, ey, 11, 13, 0, 0, TAU); g.fill();
    const lid = g.createLinearGradient(0, ey - 13, 0, ey - 2); // lid casts on the white
    lid.addColorStop(0, 'rgba(120,85,60,0.35)');
    lid.addColorStop(1, 'rgba(120,85,60,0)');
    g.fillStyle = lid;
    g.beginPath(); g.ellipse(ex, ey, 11, 13, 0, 0, TAU); g.fill();
    const ix = ex + sx * 2, iy = ey + 2;
    const iris = g.createRadialGradient(ix, iy, 1, ix, iy, 7.5);
    if (kid) { // hazel
      iris.addColorStop(0, '#9a7c42');
      iris.addColorStop(0.55, '#75592b');
      iris.addColorStop(1, '#463314');
    } else {
      iris.addColorStop(0, '#3a5688');
      iris.addColorStop(1, '#16233f');
    }
    g.fillStyle = iris;
    g.beginPath(); g.ellipse(ix, iy, 6, 7.5, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(40,28,10,0.55)'; g.lineWidth = 0.8; // iris flecks
    for (let i = 0; i < 9; i++) {
      const a = rnd() * TAU;
      g.beginPath(); g.moveTo(ix + Math.cos(a) * 2.2, iy + Math.sin(a) * 2.8);
      g.lineTo(ix + Math.cos(a) * 5, iy + Math.sin(a) * 6.2); g.stroke();
    }
    g.fillStyle = '#17100a';
    g.beginPath(); g.ellipse(ix, iy, 2.8, 3.6, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.ellipse(ix + 2.2, iy - 3.4, 2, 2.4, 0, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.beginPath(); g.ellipse(ix - 2, iy + 2.6, 1.1, 1.3, 0, 0, TAU); g.fill();
    g.strokeStyle = '#2a1a10'; g.lineWidth = 2.6; g.lineCap = 'round'; // lash line
    g.beginPath(); g.arc(ex, ey + 2, 11.5, Math.PI * 1.08, Math.PI * 1.92); g.stroke();
    g.lineWidth = 1.3;
    for (let i = 0; i < 3; i++) { // outer lashes
      const a = Math.PI * (sx > 0 ? 1.82 - i * 0.07 : 1.18 + i * 0.07);
      const lx = ex + Math.cos(a) * 11.5, ly = ey + 2 + Math.sin(a) * 11.5;
      g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + sx * 3, ly - 3); g.stroke();
    }
    g.strokeStyle = 'rgba(120,75,50,0.4)'; g.lineWidth = 1.2; // lower lid
    g.beginPath(); g.arc(ex, ey - 3, 11.5, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
    g.strokeStyle = 'rgba(130,85,58,0.35)'; g.lineWidth = 1.4; // crease
    g.beginPath(); g.arc(ex, ey + 4, 13.5, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
  }

  // ---- nose: soft bridge shadow, tip light, nostrils ----
  g.strokeStyle = 'rgba(150,95,60,0.14)'; g.lineWidth = 5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx - 3, cy - 2); g.quadraticCurveTo(cx - 5, cy + 3, cx - 4, cy + 5); g.stroke();
  g.fillStyle = 'rgba(255,240,220,0.35)';
  g.beginPath(); g.ellipse(cx, cy + 4, 3.4, 2.4, 0, 0, TAU); g.fill();
  g.fillStyle = 'rgba(105,58,35,0.38)';
  g.beginPath(); g.ellipse(cx - 4.5, cy + 6.5, 1.5, 1.1, 0.4, 0, TAU); g.fill();
  g.beginPath(); g.ellipse(cx + 4.5, cy + 6.5, 1.5, 1.1, -0.4, 0, TAU); g.fill();

  // ---- glasses ----
  if (charIdx === 1) { // Alice: gold hexagonal frames
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 17;
      const hex = (r) => {
        g.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = i / 6 * TAU + Math.PI / 6;
          const px = ex + Math.cos(a) * r, py = cy - 6 + Math.sin(a) * r;
          i ? g.lineTo(px, py) : g.moveTo(px, py);
        }
      };
      const lens = g.createLinearGradient(ex - 15, cy - 21, ex + 12, cy + 9); // glass
      lens.addColorStop(0, 'rgba(225,238,255,0.22)');
      lens.addColorStop(1, 'rgba(255,255,255,0.04)');
      hex(15); g.fillStyle = lens; g.fill();
      hex(15); g.strokeStyle = '#a9822f'; g.lineWidth = 3; g.lineJoin = 'round'; g.stroke();
      hex(15); g.strokeStyle = '#eccf72'; g.lineWidth = 1.2; g.stroke(); // gold glint
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 2; // glare streak
      g.beginPath(); g.moveTo(ex - 8, cy - 13); g.lineTo(ex - 1, cy - 4); g.stroke();
    }
    g.strokeStyle = '#a9822f'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(cx - 3, cy - 8); g.lineTo(cx + 3, cy - 8); g.stroke();
    g.beginPath(); g.moveTo(cx - 32, cy - 9); g.lineTo(cx - 44, cy - 12); g.stroke(); // temples
    g.beginPath(); g.moveTo(cx + 32, cy - 9); g.lineTo(cx + 44, cy - 12); g.stroke();
  }
  if (charIdx === 2) { // Marlon: blue mirrored sunglasses
    for (const sx of [-1, 1]) {
      const ex = cx + sx * 17;
      const lg = g.createLinearGradient(ex - 14, cy - 18, ex + 14, cy + 6);
      lg.addColorStop(0, '#66f0d0');
      lg.addColorStop(0.45, '#2e9fe6');
      lg.addColorStop(1, '#173f8f');
      g.fillStyle = lg;
      g.beginPath(); g.ellipse(ex, cy - 6, 15, 13, 0, 0, TAU); g.fill();
      const sky = g.createLinearGradient(0, cy - 18, 0, cy - 2); // mirrored horizon
      sky.addColorStop(0, 'rgba(255,255,255,0.55)');
      sky.addColorStop(0.55, 'rgba(255,255,255,0.10)');
      sky.addColorStop(0.56, 'rgba(20,40,80,0.25)');
      sky.addColorStop(1, 'rgba(20,40,80,0)');
      g.fillStyle = sky;
      g.beginPath(); g.ellipse(ex, cy - 6, 15, 13, 0, 0, TAU); g.fill();
      g.strokeStyle = '#20242c'; g.lineWidth = 3.4;
      g.beginPath(); g.ellipse(ex, cy - 6, 15, 13, 0, 0, TAU); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(ex, cy - 6, 13.4, 11.4, 0, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2.4; // diagonal glare
      g.beginPath(); g.moveTo(ex - 9, cy - 14); g.lineTo(ex - 2, cy - 5); g.stroke();
    }
    g.strokeStyle = '#20242c'; g.lineWidth = 3.4;
    g.beginPath(); g.moveTo(cx - 2, cy - 8); g.lineTo(cx + 2, cy - 8); g.stroke();
    g.beginPath(); g.moveTo(cx - 32, cy - 9); g.lineTo(cx - 46, cy - 13); g.stroke();
    g.beginPath(); g.moveTo(cx + 32, cy - 9); g.lineTo(cx + 46, cy - 13); g.stroke();
  }

  // ---- freckles (Alice a constellation, Marlon a dusting) ----
  if (charIdx === 1 || charIdx === 2) {
    const n = charIdx === 1 ? 16 : 8;
    for (let i = 0; i < n; i++) {
      const fx = (rnd() - 0.5) * 76, fy = 12 + rnd() * 13;
      if (Math.abs(fx) < 10 && fy < 16) continue; // keep the nose tip clear
      g.fillStyle = 'rgba(146,96,56,' + (0.22 + rnd() * 0.25).toFixed(2) + ')';
      g.beginPath(); g.ellipse(cx + fx, cy + fy, 1 + rnd(), 0.8 + rnd() * 0.8, 0, 0, TAU); g.fill();
    }
  }

  // ---- blush ----
  for (const sx of [-1, 1]) {
    const bl = g.createRadialGradient(cx + sx * 34, cy + 13, 2, cx + sx * 34, cy + 13, 13);
    bl.addColorStop(0, 'rgba(242,120,108,0.28)');
    bl.addColorStop(1, 'rgba(242,120,108,0)');
    g.fillStyle = bl; g.fillRect(0, 0, 256, 128);
  }

  // ---- mouth: real lips instead of a plain stroke ----
  const my = cy + 15;
  if (charIdx === 2) { // Marlon: wide open grin
    g.fillStyle = '#66261a';
    g.beginPath(); g.arc(cx, my - 5, 15, Math.PI * 0.08, Math.PI * 0.92); g.closePath(); g.fill();
    g.fillStyle = '#fff'; // teeth
    g.beginPath(); g.arc(cx, my - 5.5, 13, Math.PI * 0.14, Math.PI * 0.86); g.lineTo(cx - 12, my - 1);
    g.quadraticCurveTo(cx, my + 3, cx + 12, my - 1); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(160,140,120,0.5)'; g.lineWidth = 0.8;
    for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 5, my - 1); g.lineTo(cx + i * 5, my + 2.5); g.stroke(); }
    g.fillStyle = '#c95f52'; // tongue hint
    g.beginPath(); g.ellipse(cx, my + 6, 8, 3.5, 0, Math.PI, TAU); g.fill();
    g.strokeStyle = '#7a3a24'; g.lineWidth = 2.4; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, my - 5, 15, Math.PI * 0.08, Math.PI * 0.92); g.stroke();
  } else { // warm closed smile with real lips
    g.strokeStyle = '#8a4534'; g.lineWidth = 2.6; g.lineCap = 'round';
    g.beginPath(); g.arc(cx, my - 3, 13, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    g.fillStyle = '#d47b6a'; // lower lip
    g.beginPath();
    g.moveTo(cx - 11.5, my + 1.5);
    g.quadraticCurveTo(cx, my + 9.5, cx + 11.5, my + 1.5);
    g.quadraticCurveTo(cx, my + 4.5, cx - 11.5, my + 1.5);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)'; // lip gloss
    g.beginPath(); g.ellipse(cx, my + 4.6, 5, 1.4, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(122,58,36,0.5)'; g.lineWidth = 1.4; // smile corners
    for (const sx of [-1, 1]) {
      g.beginPath(); g.moveTo(cx + sx * 12, my); g.lineTo(cx + sx * 14.5, my - 2); g.stroke();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------- Vehicle garage: 6 truly different shapes ----------------
const VEHICLES = ['KART', 'FORMULE', 'POD RACER', 'SPEEDER', 'BRIQUE', 'FUSÉE', 'MODEL Y'];
const DEFAULT_VEH = [0, 1, 4, 6, 5, 2, 3, 1]; // what each AI character drives
let vehSel = 0;
try { vehSel = clamp(parseInt(localStorage.getItem('iam-veh') || '0', 10) || 0, 0, VEHICLES.length - 1); } catch (e) {}

const VEH_GEO_CACHE = [];
function getVehGeo(type) {
  if (VEH_GEO_CACHE[type]) return VEH_GEO_CACHE[type];
  const body = [], dark = [], chrome = [];
  const add = (arr, geo, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
    geo.scale(sx, sy, sz);
    if (rx) geo.rotateX(rx);
    if (ry) geo.rotateY(ry);
    if (rz) geo.rotateZ(rz);
    geo.translate(x, y, z);
    arr.push(geo);
  };
  let wheels = [], hover = false, seat = { x: -3, y: 14 }, thrusters = [], wheelScale = 1;
  let plate = null;
  const glow = [], glowRed = [], glass = [];

  if (type === 0) { // KART classique
    add(body, new THREE.SphereGeometry(10, 24, 16), 2, 7.8, 0, 1.75, 0.66, 1.06);
    add(body, new THREE.SphereGeometry(7, 20, 14), 17, 6.6, 0, 1.3, 0.6, 0.9);
    add(body, new THREE.SphereGeometry(8, 18, 12), -11, 8, 0, 0.95, 0.68, 1.02);
    add(body, new THREE.SphereGeometry(5.2, 14, 10), 12.5, 10.3, -11, 1.15, 0.62, 0.95);
    add(body, new THREE.SphereGeometry(5.2, 14, 10), 12.5, 10.3, 11, 1.15, 0.62, 0.95);
    add(body, new THREE.SphereGeometry(5.6, 14, 10), -11.5, 10.8, -12, 1.1, 0.6, 0.95);
    add(body, new THREE.SphereGeometry(5.6, 14, 10), -11.5, 10.8, 12, 1.1, 0.6, 0.95);
    add(body, new THREE.CapsuleGeometry(2.3, 15, 4, 10), 2, 4.8, -10.8, 1, 1, 1, 0, 0, Math.PI / 2);
    add(body, new THREE.CapsuleGeometry(2.3, 15, 4, 10), 2, 4.8, 10.8, 1, 1, 1, 0, 0, Math.PI / 2);
    add(body, new THREE.CapsuleGeometry(1.4, 17, 4, 8), -16.5, 15, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(body, new THREE.CapsuleGeometry(1.5, 18, 4, 8), 23.5, 4.4, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(body, new THREE.CapsuleGeometry(4.4, 5, 4, 12), -3, 14, 0, 1, 1, 0.9);
    add(body, new THREE.CapsuleGeometry(1.7, 8, 4, 8), 1.6, 14.2, -4.4, 1, 1, 1, 0, 0, -1.05);
    add(body, new THREE.CapsuleGeometry(1.7, 8, 4, 8), 1.6, 14.2, 4.4, 1, 1, 1, 0, 0, -1.05);
    add(dark, new THREE.TorusGeometry(6.6, 1.5, 10, 20), -1, 11.4, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(dark, new THREE.SphereGeometry(5.4, 14, 10), -8.6, 13.4, 0, 0.55, 1.15, 1.05);
    add(dark, new THREE.CylinderGeometry(0.8, 0.8, 7.5, 8), 3.6, 11.4, 0, 1, 1, 1, 0, 0, 1.05);
    add(dark, new THREE.TorusGeometry(3.4, 0.9, 8, 16), 6.4, 13.2, 0, 1, 1, 1, 0, Math.PI / 2, 0.5);
    add(dark, new THREE.BoxGeometry(24, 1.4, 15), 2, 3.5, 0);
    add(chrome, new THREE.CylinderGeometry(1.5, 2.0, 9, 10), -16.5, 10.6, -5, 1, 1, 1, 0, 0, 1.2);
    add(chrome, new THREE.CylinderGeometry(1.5, 2.0, 9, 10), -16.5, 10.6, 5, 1, 1, 1, 0, 0, 1.2);
    add(chrome, new THREE.CapsuleGeometry(1.0, 16, 4, 8), 25.5, 5.6, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(chrome, new THREE.SphereGeometry(1.5, 10, 8), 24.5, 7.2, -5.5);
    add(chrome, new THREE.SphereGeometry(1.5, 10, 8), 24.5, 7.2, 5.5);
    add(chrome, new THREE.SphereGeometry(1.1, 8, 8), 2, 13.2, -8.2); // mirrors
    add(chrome, new THREE.SphereGeometry(1.1, 8, 8), 2, 13.2, 8.2);
    wheels = [[12.5, -11.5, true], [12.5, 11.5, true], [-11.5, -12.5, false], [-11.5, 12.5, false]];
    plate = [26.5, 6.4];
  } else if (type === 1) { // FORMULE (F1)
    add(body, new THREE.CapsuleGeometry(3.6, 30, 6, 14), 4, 6.8, 0, 1, 1, 1, 0, 0, Math.PI / 2); // long fuselage
    add(body, new THREE.SphereGeometry(4.6, 16, 12), 24, 6.2, 0, 1.4, 0.55, 0.7);               // nose tip
    add(body, new THREE.SphereGeometry(6.2, 18, 12), -6, 9.5, 0, 1.2, 0.9, 0.95);               // cockpit hump
    add(body, new THREE.BoxGeometry(3.4, 1.4, 26), 26.5, 4.2, 0);                                // front wing
    add(body, new THREE.BoxGeometry(1.6, 4.2, 3), 26.5, 6, -13);
    add(body, new THREE.BoxGeometry(1.6, 4.2, 3), 26.5, 6, 13);
    add(body, new THREE.BoxGeometry(7, 1.8, 22), -18, 16.5, 0);                                  // rear wing
    add(body, new THREE.BoxGeometry(1.6, 6, 2.4), -18, 12.5, -9);
    add(body, new THREE.BoxGeometry(1.6, 6, 2.4), -18, 12.5, 9);
    add(body, new THREE.SphereGeometry(3.4, 12, 10), -10, 14.5, 0, 1, 1.3, 1);                   // airbox
    add(body, new THREE.CapsuleGeometry(1.7, 8, 4, 8), 0.6, 13.4, -3.8, 1, 1, 1, 0, 0, -1.15);
    add(body, new THREE.CapsuleGeometry(1.7, 8, 4, 8), 0.6, 13.4, 3.8, 1, 1, 1, 0, 0, -1.15);
    add(dark, new THREE.TorusGeometry(5.2, 1.2, 10, 18), -3, 11.6, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(dark, new THREE.TorusGeometry(3.1, 0.8, 8, 16), 5.4, 12.6, 0, 1, 1, 1, 0, Math.PI / 2, 0.5);
    add(dark, new THREE.BoxGeometry(16, 1.6, 10), -6, 3.6, 0);
    add(chrome, new THREE.CylinderGeometry(1.2, 1.6, 6, 10), -17, 8.4, -3.4, 1, 1, 1, 0, 0, Math.PI / 2);
    add(chrome, new THREE.CylinderGeometry(1.2, 1.6, 6, 10), -17, 8.4, 3.4, 1, 1, 1, 0, 0, Math.PI / 2);
    add(dark, new THREE.TorusGeometry(4.6, 0.7, 8, 14, Math.PI), -3, 15.5, 0, 1, 1, 1, 0, Math.PI / 2, 0); // halo
    add(chrome, new THREE.SphereGeometry(1.0, 8, 8), 3, 12.4, -6.4); // mirrors
    add(chrome, new THREE.SphereGeometry(1.0, 8, 8), 3, 12.4, 6.4);
    wheels = [[16, -12.5, true], [16, 12.5, true], [-12, -13, false], [-12, 13, false]];
    wheelScale = 1.15;
    seat = { x: -4, y: 13 };
    plate = [28.8, 5.6];
  } else if (type === 2) { // POD RACER (Star Wars)
    for (const sz of [-11, 11]) {
      add(body, new THREE.CapsuleGeometry(4.6, 16, 6, 14), 16, 8.5, sz, 1, 1, 1, 0, 0, Math.PI / 2); // engine pods
      add(chrome, new THREE.ConeGeometry(4.2, 8, 12), 28, 8.5, sz, 1, 1, 1, 0, 0, -Math.PI / 2);      // intakes
      add(dark, new THREE.BoxGeometry(10, 1.4, 3.2), 14, 12.6, sz > 0 ? sz - 2 : sz + 2);             // vanes
      thrusters.push([6, 8.5, sz]);
    }
    add(dark, new THREE.CylinderGeometry(0.7, 0.7, 21, 8), 8, 9, 0, 1, 1, 1, Math.PI / 2, 0, 0);      // energy link
    add(body, new THREE.SphereGeometry(6.8, 20, 14), -10, 9, 0, 1.5, 0.85, 1.0);                       // cockpit pod
    add(dark, new THREE.TorusGeometry(5.2, 1.1, 8, 18), -7.5, 12.2, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    add(chrome, new THREE.CylinderGeometry(0.8, 0.8, 14, 8), 2, 9.5, -6, 1, 1, 1, 0, 0, 1.25);        // cables
    add(chrome, new THREE.CylinderGeometry(0.8, 0.8, 14, 8), 2, 9.5, 6, 1, 1, 1, 0, 0, 1.25);
    for (const sz of [-11, 11]) {
      const strip = new THREE.BoxGeometry(14, 0.8, 0.8);
      strip.translate(14, 11.2, sz);
      glow.push(strip);
    }
    hover = true;
    seat = { x: -10, y: 13 };
    thrusters.push([-18, 7, 0]);
  } else if (type === 3) { // SPEEDER (moto volante)
    add(body, new THREE.CapsuleGeometry(4.8, 22, 6, 14), 0, 9.5, 0, 1, 0.85, 1, 0, 0, Math.PI / 2);   // bike body
    add(body, new THREE.SphereGeometry(4.4, 14, 10), 13, 10, 0, 1.3, 0.7, 0.9);                        // front cowl
    add(chrome, new THREE.CylinderGeometry(0.9, 0.9, 14, 8), 21, 8.6, -3, 1, 1, 1, 0, 0, Math.PI / 2); // prongs
    add(chrome, new THREE.CylinderGeometry(0.9, 0.9, 14, 8), 21, 8.6, 3, 1, 1, 1, 0, 0, Math.PI / 2);
    add(dark, new THREE.BoxGeometry(6, 1.4, 14), -4, 8, 0);                                            // foot board
    add(dark, new THREE.SphereGeometry(3.6, 12, 8), -9, 12.4, 0, 0.7, 1, 1);                           // saddle back
    add(body, new THREE.BoxGeometry(8, 1.2, 5), -13, 11, -5, 1, 1, 1, 0, 0, 0.3);                      // rear vanes
    add(body, new THREE.BoxGeometry(8, 1.2, 5), -13, 11, 5, 1, 1, 1, 0, 0, 0.3);
    add(dark, new THREE.CylinderGeometry(0.6, 0.6, 9, 8), 10, 12.8, 0, 1, 1, 1, Math.PI / 2, 0, -0.5); // handlebar
    {
      const strip = new THREE.BoxGeometry(20, 0.7, 3);
      strip.translate(0, 6.6, 0);
      glow.push(strip);
    }
    hover = true;
    seat = { x: -4, y: 15 };
    thrusters.push([-14, 7.5, 0]);
  } else if (type === 4) { // BRIQUE (Lego)
    add(body, new THREE.BoxGeometry(34, 8, 18), 2, 7, 0);                                              // slab body
    add(body, new THREE.BoxGeometry(16, 7, 15), -5, 13.5, 0);                                          // cabin block
    add(body, new THREE.BoxGeometry(8, 4, 18), 20, 6, 0);                                              // bumper block
    for (const [px, pz] of [[13, -4.5], [13, 4.5], [8, -4.5], [8, 4.5], [-14, -4.5], [-14, 4.5]])
      add(chrome, new THREE.CylinderGeometry(2.4, 2.4, 1.8, 12), px, 11.8 + (px < 0 ? 0 : 0), pz);      // studs
    add(dark, new THREE.BoxGeometry(4, 5, 20), -16, 14, 0);                                            // blocky spoiler
    add(dark, new THREE.BoxGeometry(6, 1.5, 16), 2, 3.4, 0);
    add(dark, new THREE.TorusGeometry(3.2, 0.9, 6, 4), 4, 13.4, 0, 1, 1, 1, 0, Math.PI / 2, 0.5);       // square wheel!
    wheels = [[12, -11.5, true], [12, 11.5, true], [-11, -11.5, false], [-11, 11.5, false]];
    wheelScale = 0.95;
    seat = { x: -5, y: 15.5 };
    plate = [24.3, 6.5];
  } else if (type === 6) { // MODEL Y (SUV électrique) — real side profile, beveled extrusion
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-19.5, 3.6);
    bodyShape.quadraticCurveTo(-21.8, 4.0, -21.9, 6.4);    // rear bumper
    bodyShape.quadraticCurveTo(-21.9, 9.6, -20.6, 11.2);   // liftgate
    bodyShape.quadraticCurveTo(-19.0, 13.2, -15.5, 13.6);  // rear shoulder
    bodyShape.lineTo(8.5, 13.4);                           // beltline
    bodyShape.quadraticCurveTo(14.5, 12.6, 18.5, 11.2);    // hood
    bodyShape.quadraticCurveTo(21.9, 9.8, 21.9, 7.2);      // nose
    bodyShape.quadraticCurveTo(21.9, 4.4, 19.5, 3.6);      // front bumper
    bodyShape.lineTo(-19.5, 3.6);
    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: 15.4, bevelEnabled: true, bevelThickness: 2.0, bevelSize: 1.7, bevelSegments: 4, curveSegments: 10,
    });
    bodyGeo.translate(0, 0, -7.7);
    body.push(bodyGeo);
    const glassShape = new THREE.Shape();                  // windshield -> pano roof -> rear glass, one piece
    glassShape.moveTo(11.2, 13.1);
    glassShape.quadraticCurveTo(6.5, 19.0, 0.5, 20.0);
    glassShape.quadraticCurveTo(-6.5, 20.4, -11.5, 18.6);
    glassShape.quadraticCurveTo(-16.0, 16.8, -18.2, 13.1);
    glassShape.lineTo(11.2, 13.1);
    const glassGeo = new THREE.ExtrudeGeometry(glassShape, {
      depth: 12.6, bevelEnabled: true, bevelThickness: 1.6, bevelSize: 1.4, bevelSegments: 3, curveSegments: 10,
    });
    glassGeo.translate(0, 0, -6.3);
    glass.push(glassGeo);
    add(dark, new THREE.BoxGeometry(37, 2.0, 19.0), 0, 3.2, 0);       // lower cladding
    add(dark, new THREE.BoxGeometry(3.5, 2.6, 16), -20.3, 4.6, 0);    // diffuser
    add(dark, new THREE.BoxGeometry(3.5, 2.2, 16), 20.3, 4.4, 0);     // front splitter
    for (const [ax, az] of [[13.5, -9.9], [13.5, 9.9], [-13.5, -9.9], [-13.5, 9.9]])
      add(dark, new THREE.TorusGeometry(7.6, 1.0, 8, 16, Math.PI), ax, 6.6, az); // arch flares
    // extrusions are non-indexed — mirrors must match to merge into the body
    add(body, new THREE.BoxGeometry(2.2, 1.6, 3.2).toNonIndexed(), 8.6, 14.2, -10.2);
    add(body, new THREE.BoxGeometry(2.2, 1.6, 3.2).toNonIndexed(), 8.6, 14.2, 10.2);
    for (const hx of [3.5, -7.5]) for (const hz of [-9.8, 9.8])
      add(chrome, new THREE.BoxGeometry(3.0, 0.7, 0.4), hx, 11.6, hz); // flush handles
    for (const sz of [-1, 1]) {                                        // slim LED headlights
      const led = new THREE.BoxGeometry(1.3, 0.9, 5.6);
      led.translate(22.5, 10.4, sz * 5.6);
      glow.push(led);
    }
    {                                                                  // full-width light bar
      const bar = new THREE.BoxGeometry(0.9, 0.9, 16.5);
      bar.translate(-22.5, 11.2, 0);
      glowRed.push(bar);
    }
    wheels = [[13.5, -9.6, true], [13.5, 9.6, true], [-13.5, -9.6, false], [-13.5, 9.6, false]];
    wheelScale = 1.05;
    seat = { x: -1, y: 6.5 };
    plate = [23.8, 7.4];
  } else { // FUSÉE (rocket kart)
    add(body, new THREE.CylinderGeometry(6.5, 7.5, 26, 16), 0, 9.5, 0, 1, 1, 1, 0, 0, Math.PI / 2);    // rocket body
    add(body, new THREE.ConeGeometry(6.5, 14, 16), 20, 9.5, 0, 1, 1, 1, 0, 0, -Math.PI / 2);           // nose cone
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * TAU + Math.PI / 2;
      add(body, new THREE.BoxGeometry(10, 1.6, 9), -12, 9.5 + Math.cos(a) * 8, Math.sin(a) * 8, 1, 1, 1, a, 0, 0.5);
    }
    add(chrome, new THREE.SphereGeometry(1.8, 10, 8), 8, 13.5, -5.2);                                  // portholes
    add(chrome, new THREE.SphereGeometry(1.8, 10, 8), 8, 13.5, 5.2);
    add(chrome, new THREE.ConeGeometry(4.5, 7, 12), -15.5, 9.5, 0, 1, 1, 1, 0, 0, Math.PI / 2);        // nozzle
    add(dark, new THREE.TorusGeometry(5.4, 1.2, 8, 18), -1, 14.4, 0, 1, 1, 1, Math.PI / 2, 0, 0);      // cockpit rim
    add(chrome, new THREE.TorusGeometry(6.6, 0.9, 8, 18), 13.5, 9.5, 0, 1, 1, 1, 0, Math.PI / 2, 0); // nose ring
    wheels = [[11, -10.5, true], [11, 10.5, true], [-10, -10.5, false], [-10, 10.5, false]];
    wheelScale = 0.9;
    seat = { x: -2, y: 16 };
    plate = [27.8, 9.5];
  }

  const geo = {
    body: mergeGeometries(body),
    dark: dark.length ? mergeGeometries(dark) : null,
    chrome: chrome.length ? mergeGeometries(chrome) : null,
    glow: glow.length ? mergeGeometries(glow) : null,
    glowRed: glowRed.length ? mergeGeometries(glowRed) : null,
    glass: glass.length ? mergeGeometries(glass) : null,
    wheels, hover, seat, thrusters, wheelScale, plate,
  };
  VEH_GEO_CACHE[type] = geo;
  return geo;
}

const TIRE_GEO = new THREE.TorusGeometry(4.4, 2.8, 12, 20);
const tireTex = canvasTexture(64, (g) => {
  g.fillStyle = '#17171d'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#26262e';
  for (let x = 0; x < 64; x += 8) g.fillRect(x, 0, 4, 64); // tread blocks
  g.fillStyle = '#0e0e12';
  g.fillRect(0, 28, 64, 8); // center groove
}, true);
tireTex.repeat.set(18, 1);
const TIRE_MAT = new THREE.MeshStandardMaterial({ map: tireTex, roughness: 0.92 });
const DISC_GEO = new THREE.CylinderGeometry(2.5, 2.5, 0.8, 14).rotateX(Math.PI / 2);
const DISC_MAT = new THREE.MeshStandardMaterial({ color: 0xb8b8c2, roughness: 0.25, metalness: 0.9 });
const CALIPER_GEO = new THREE.BoxGeometry(1.4, 2.6, 1.2);
const CALIPER_MAT = new THREE.MeshStandardMaterial({ color: 0xd02020, roughness: 0.4 });

// license-style number plate per character
function makePlateTexture(charIdx) {
  const c = document.createElement('canvas');
  c.width = 96; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f4f8';
  g.beginPath(); g.roundRect(2, 2, 92, 60, 12); g.fill();
  g.strokeStyle = '#16161e'; g.lineWidth = 4;
  g.beginPath(); g.roundRect(2, 2, 92, 60, 12); g.stroke();
  g.fillStyle = '#16161e';
  g.font = "900 40px 'Arial Rounded MT Bold', system-ui, sans-serif";
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(charIdx + 1), 48, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const HUB_GEO = (() => {
  const parts = [new THREE.CylinderGeometry(2.9, 2.9, 3.2, 12).rotateX(Math.PI / 2)];
  for (let i = 0; i < 5; i++) {
    const spoke = new THREE.BoxGeometry(1.2, 3.6, 3.0);
    spoke.translate(0, 2.4, 0);
    spoke.rotateZ(i / 5 * TAU);
    parts.push(spoke);
  }
  return mergeGeometries(parts);
})();
const CAP_DOME = new THREE.SphereGeometry(5.1, 18, 10, 0, TAU, 0, Math.PI * 0.52);
const CAP_BRIM = new THREE.CylinderGeometry(5.0, 5.4, 1.0, 12, 1, false, -0.7, 1.4);

function buildKartMesh(charIdx, veh = 0, colorOverride = null) {
  const ch = CHARACTERS[charIdx];
  const color = new THREE.Color(colorOverride || ch.color);
  const vg = getVehGeo(veh);
  const g = new THREE.Group();
  const chassis = new THREE.Group();
  g.add(chassis);

  const bodyMat = new THREE.MeshPhysicalMaterial({
    color, roughness: veh === 4 ? 0.4 : 0.26, metalness: veh === 4 ? 0.1 : 0.45,
    clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.15,
  });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x16161e, roughness: 0.65, metalness: 0.35 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd8d8e0, roughness: 0.12, metalness: 1.0, envMapIntensity: 1.35 });

  const bodyMesh = new THREE.Mesh(vg.body, bodyMat);
  bodyMesh.castShadow = true;
  chassis.add(bodyMesh);
  if (vg.dark) { const m = new THREE.Mesh(vg.dark, darkMat); m.castShadow = true; chassis.add(m); }
  if (vg.chrome) chassis.add(new THREE.Mesh(vg.chrome, chromeMat));

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(4.9, 22, 16),
    new THREE.MeshStandardMaterial({ map: makeFaceTexture(charIdx), roughness: 0.65 })
  );
  head.rotation.y = Math.PI / 2;
  head.position.set(vg.seat.x, vg.seat.y + 7, 0);
  head.castShadow = true;
  chassis.add(head);
  if (charIdx <= 2) {
    // Inès / Alice / Marlon: real hair instead of a cap
    const hairMat = new THREE.MeshStandardMaterial({ color: [0x5d4326, 0x4e3a22, 0x54381e][charIdx], roughness: 0.85 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(5.2, 18, 12, 0, TAU, 0, Math.PI * 0.55), hairMat);
    dome.position.set(vg.seat.x - 0.4, vg.seat.y + 7.1, 0);
    chassis.add(dome);
    if (charIdx === 0 || charIdx === 1) {
      const back = new THREE.Mesh(new THREE.SphereGeometry(4.4, 14, 10), hairMat);
      back.scale.set(0.85, charIdx === 1 ? 1.9 : 1.4, 1.05); // Alice's hair is longest
      back.position.set(vg.seat.x - 2.8, vg.seat.y + 3.4, 0);
      chassis.add(back);
    }
  } else {
    const capMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(ch.helmet), roughness: 0.5 });
    const cap = new THREE.Mesh(CAP_DOME, capMat);
    cap.position.set(vg.seat.x - 0.2, vg.seat.y + 7.8, 0);
    chassis.add(cap);
    const brim = new THREE.Mesh(CAP_BRIM, capMat);
    brim.rotation.y = Math.PI / 2;
    brim.position.set(vg.seat.x + 2.8, vg.seat.y + 9.2, 0);
    chassis.add(brim);
  }

  if (vg.glow) {
    chassis.add(new THREE.Mesh(vg.glow, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.9, 2.3) })));
  }
  if (vg.glowRed) {
    chassis.add(new THREE.Mesh(vg.glowRed, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.25, 0.2) })));
  }
  if (vg.glass) {
    const glassMesh = new THREE.Mesh(vg.glass, new THREE.MeshPhysicalMaterial({
      color: 0x121a26, roughness: 0.06, metalness: 0.25,
      transparent: true, opacity: 0.55, depthWrite: false,
      clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.8,
    }));
    glassMesh.castShadow = true;
    chassis.add(glassMesh);
  }
  if (vg.plate) {
    const plateMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.4, 3.6),
      new THREE.MeshStandardMaterial({ map: makePlateTexture(charIdx), roughness: 0.5 })
    );
    plateMesh.rotation.y = Math.PI / 2;
    plateMesh.position.set(vg.plate[0], vg.plate[1], 0);
    chassis.add(plateMesh);
  }
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xe0c25a, roughness: 0.28, metalness: 0.9, envMapIntensity: 1.2 });
  const wheels = [];
  for (const [wx, wz, front] of vg.wheels) {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, 6.6 * vg.wheelScale, wz);
    steerPivot.scale.setScalar(vg.wheelScale);
    const spin = new THREE.Group();
    const tyre = new THREE.Mesh(TIRE_GEO, TIRE_MAT);
    tyre.castShadow = true;
    const hub = new THREE.Mesh(HUB_GEO, hubMat);
    const disc = new THREE.Mesh(DISC_GEO, DISC_MAT);
    disc.position.z = wz > 0 ? -1.2 : 1.2;
    spin.add(tyre); spin.add(hub); spin.add(disc);
    const caliper = new THREE.Mesh(CALIPER_GEO, CALIPER_MAT);
    caliper.position.set(1.8, 1.4, wz > 0 ? -1.2 : 1.2);
    steerPivot.add(spin);
    steerPivot.add(caliper);
    chassis.add(steerPivot);
    wheels.push({ steerPivot, spin, front });
  }
  // hover thrusters
  const thrusterSprites = [];
  for (const [tx, ty, tz] of vg.thrusters) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowCyan, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    sp.position.set(tx, ty - 3, tz);
    sp.scale.set(16, 16, 1);
    g.add(sp);
    thrusterSprites.push(sp);
  }

  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowOrange, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
  }));
  flame.position.set(-20, 8, 0);
  flame.scale.set(26, 26, 1);
  flame.visible = false;
  g.add(flame);

  const sparks = [];
  for (const sz of [-11, 11]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowCyan, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.9,
    }));
    sp.position.set(-13, 3, sz);
    sp.scale.set(14, 14, 1);
    sp.visible = false;
    g.add(sp);
    sparks.push(sp);
  }
  const starHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowWhite, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8,
  }));
  starHalo.position.set(0, 10, 0);
  starHalo.scale.set(70, 70, 1);
  starHalo.visible = false;
  g.add(starHalo);
  scene.add(g);
  return { group: g, chassis, wheels, flame, sparks, starHalo, bodyMat, baseColor: color.clone(), veh, colorOv: colorOverride, hover: vg.hover, thrusterSprites };
}

let kartMeshes = CHARACTERS.map((_, i) => buildKartMesh(i, i === 0 ? vehSel : DEFAULT_VEH[i]));

// rebuild any kart whose vehicle should change (player picks vehSel, AI keep theirs)
function ensureKartMeshes() {
  for (let i = 0; i < CHARACTERS.length; i++) {
    const want = i === menuChar ? vehSel : DEFAULT_VEH[i];
    const wantCol = i === menuChar ? COLOR_PALETTE[colorSel] : null;
    if (kartMeshes[i].veh !== want || kartMeshes[i].colorOv !== wantCol) {
      scene.remove(kartMeshes[i].group);
      kartMeshes[i] = buildKartMesh(i, want, wantCol);
    }
  }
}

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

function sampleCenterline(ctrl, hills = 0) {
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
    // elevation: harmonic mix over the lap (periodic -> seamless loop),
    // flattened near the start line so the grid sits level
    const u = i / N;
    let h = hills * (0.5 * Math.sin(TAU * 2 * u + 1.3) + 0.32 * Math.sin(TAU * 3 * u + 4.1) + 0.18 * Math.sin(TAU * 5 * u + 2.2));
    const startDist = Math.min(i, N - i) / 26;
    if (startDist < 1) h *= startDist * startDist * (3 - 2 * startDist);
    out.push({ x: a[0], y: a[1], dirx: dx, diry: dy, nx: -dy, ny: dx, curv: 0, seglen: l, h, bank: 0, slope: 0 });
  }
  for (let i = 0; i < N; i++) {
    const a = out[i], b = out[(i + 7) % N];
    const sc = angDiff(Math.atan2(a.diry, a.dirx), Math.atan2(b.diry, b.dirx));
    out[i].curv = Math.abs(sc);
    out[i].bank = clamp(sc * 1.1, -0.30, 0.30); // MK-style banked corners
  }
  // smooth banking + slope
  const rawBank = out.map(o => o.bank);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let o = -5; o <= 5; o++) s += rawBank[(i + o + N) % N];
    out[i].bank = s / 11;
    out[i].slope = (out[(i + 3) % N].h - out[i].h) / (out[i].seglen * 3);
  }
  return out;
}

// y of the road surface at sample c with lateral offset `lat`
function roadY(c, lat) { return c.h - lat * Math.sin(c.bank); }

function idxDist(a, b) { let d = Math.abs(a - b); return Math.min(d, N - d); }

function makeSkyTexture(theme) {
  const K = 2; // 2K panorama
  const c = document.createElement('canvas');
  c.width = 1024 * K; c.height = 512 * K;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512 * K);
  const stops = [0, 0.42, 0.55, 0.62, 0.68, 1];
  theme.sky.forEach((col, i) => grad.addColorStop(stops[i], col));
  g.fillStyle = grad; g.fillRect(0, 0, 1024 * K, 512 * K);
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < theme.stars; i++) {
    const y = rnd() * 230 * K;
    g.globalAlpha = 0.25 + rnd() * 0.6 * (1 - y / (240 * K));
    g.fillStyle = '#fff';
    const sz = (rnd() < 0.2 ? 2 : 1) * K;
    g.fillRect(rnd() * 1024 * K, y, sz, sz);
  }
  g.globalAlpha = 1;
  if (theme.sun) {
    const s = theme.sun;
    const sg = g.createRadialGradient(s.x * K, s.y * K, 4, s.x * K, s.y * K, s.r * K);
    sg.addColorStop(0, 'rgba(255,248,220,1)');
    sg.addColorStop(0.2, `rgba(${s.color},0.85)`);
    sg.addColorStop(1, `rgba(${s.color},0)`);
    g.fillStyle = sg; g.beginPath(); g.arc(s.x * K, s.y * K, s.r * K, 0, TAU); g.fill();
  }
  if (theme.moon) {
    const m = theme.moon;
    g.fillStyle = 'rgba(240,244,255,0.95)';
    g.beginPath(); g.arc(m.x * K, m.y * K, m.r * K, 0, TAU); g.fill();
    g.fillStyle = 'rgba(180,190,220,0.5)';
    g.beginPath(); g.arc((m.x - 8) * K, (m.y - 6) * K, m.r * 0.25 * K, 0, TAU); g.fill();
    g.beginPath(); g.arc((m.x + 10) * K, (m.y + 8) * K, m.r * 0.18 * K, 0, TAU); g.fill();
  }
  if (theme.stars === 0) {
    for (let i = 0; i < 22; i++) {
      const x = rnd() * 1024 * K, y = (55 + rnd() * 185) * K, r = (13 + rnd() * 24) * K;
      // soft shaded cumulus
      const cg = g.createRadialGradient(x, y - r * 0.4, r * 0.2, x, y, r * 2.2);
      cg.addColorStop(0, 'rgba(255,255,255,0.95)');
      cg.addColorStop(0.55, 'rgba(245,248,255,0.75)');
      cg.addColorStop(1, 'rgba(235,240,250,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.arc(x, y, r, 0, TAU);
      g.arc(x + r * 1.1, y + 4 * K, r * 0.75, 0, TAU);
      g.arc(x - r * 1.05, y + 5 * K, r * 0.68, 0, TAU);
      g.arc(x + r * 0.3, y - r * 0.55, r * 0.8, 0, TAU);
      g.fill();
    }
  }
  // distant ridges: irregular multi-frequency profiles fading into haze
  const ridge = (baseY, amp, f1, f2, f3, p1, p2, color, alpha) => {
    const grad2 = g.createLinearGradient(0, (baseY - amp - 10) * K, 0, (baseY + 26) * K);
    grad2.addColorStop(0, color);
    grad2.addColorStop(1, theme.sky[4]);
    g.globalAlpha = alpha;
    g.fillStyle = grad2;
    g.beginPath();
    g.moveTo(0, 512 * K);
    for (let x = 0; x <= 1024 * K; x += 6) {
      const u = x / K;
      const h = amp * (0.55 * Math.sin(u * f1 + p1) + 0.3 * Math.sin(u * f2 + p2) + 0.15 * Math.sin(u * f3 + p1 * 2.7));
      g.lineTo(x, (baseY - Math.abs(h)) * K);
    }
    g.lineTo(1024 * K, 512 * K);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
  };
  ridge(344, 30, 0.011, 0.027, 0.061, 1.7, 4.2, theme.mountains[0], 0.85);
  ridge(352, 18, 0.017, 0.041, 0.083, 3.9, 0.8, theme.mountains[1], 0.9);
  // horizon haze veil to melt everything together
  const haze = g.createLinearGradient(0, 300 * K, 0, 372 * K);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(0.75, theme.stars > 100 ? 'rgba(140,150,190,0.20)' : 'rgba(255,255,255,0.14)');
  haze.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = haze;
  g.fillRect(0, 300 * K, 1024 * K, 72 * K);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ribbon(cl, halfInner, halfOuter, y, vScale) {
  const pos = [], uv = [], idx = [];
  let v = 0, vertBase = 0;
  const sides = halfInner > 0 ? [-1, 1] : [0];
  for (const side of sides) {
    v = 0;
    for (let i = 0; i <= N; i++) {
      const c = cl[i % N];
      if (i > 0) v += cl[(i - 1) % N].seglen / vScale;
      const o1 = side === 0 ? -halfOuter : side * halfInner;
      const o2 = side === 0 ? halfOuter : side * halfOuter;
      pos.push(c.x + c.nx * o1, roadY(c, o1) + y, c.y + c.ny * o1);
      pos.push(c.x + c.nx * o2, roadY(c, o2) + y, c.y + c.ny * o2);
      uv.push(0, v, 1, v);
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
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// short strip of road surface (boost pads, start line) that follows
// elevation and banking
function ribbonSlice(cl, i0, len, half, lift, vTiles) {
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= len; j++) {
    const c = cl[(i0 + j) % N];
    pos.push(c.x + c.nx * -half, roadY(c, -half) + lift, c.y + c.ny * -half);
    pos.push(c.x + c.nx * half, roadY(c, half) + lift, c.y + c.ny * half);
    const v = (j / len) * vTiles;
    uv.push(0, v, 1, v);
  }
  for (let j = 0; j < len; j++) {
    const a = j * 2, b = a + 1, c2 = a + 2, d = a + 3;
    idx.push(a, c2, b, b, c2, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
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
  const cl = sampleCenterline(map.ctrl, theme.hills || 0);
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

  // rolling terrain, flattened to the road under and near the track
  let nSeed = 1000 + mapIdx * 777;
  const nRnd = () => (nSeed = (nSeed * 16807) % 2147483647) / 2147483647;
  const NG = 48;
  const nGrid = [];
  for (let i = 0; i < NG * NG; i++) nGrid.push(nRnd());
  const noise2 = (x, z) => {
    const gx = ((x / 560) % NG + NG) % NG, gz = ((z / 560) % NG + NG) % NG;
    const x0 = Math.floor(gx) % NG, z0 = Math.floor(gz) % NG;
    const x1 = (x0 + 1) % NG, z1 = (z0 + 1) % NG;
    const fx = gx - Math.floor(gx), fz = gz - Math.floor(gz);
    const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = nGrid[z0 * NG + x0], b = nGrid[z0 * NG + x1];
    const c = nGrid[z1 * NG + x0], d = nGrid[z1 * NG + x1];
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sz) - 0.5;
  };
  const tAmp = (theme.hills || 30) * 1.5;
  const terrainH = (x, z) => {
    const dc = Math.hypot(x - WORLDC, z - WORLDC);
    const fade = clamp(1 - (dc - 1250) / 400, 0, 1); // flat again near the city ring
    return (noise2(x, z) * 0.65 + noise2(x * 2.3 + 991, z * 2.3) * 0.25 + noise2(x * 5.1, z * 5.1 + 313) * 0.1) * tAmp * 2 * fade;
  };
  track.terrainH = terrainH;
  // exact ground surface height (same blend as the ground mesh) so karts
  // never sink under embankments when they leave the road
  track.groundYAt = (x, z, hint = 0) => {
    let best = null, bestD = Infinity;
    for (let o = -12; o <= 12; o++) {
      const c = cl[(((hint + o * 3) % N) + N) % N];
      const d = (c.x - x) ** 2 + (c.y - z) ** 2;
      if (d < bestD) { bestD = d; best = c; }
    }
    const dist = Math.sqrt(bestD);
    const lat = (x - best.x) * best.nx + (z - best.y) * best.ny;
    const edgeY = roadY(best, clamp(lat, -HALFW, HALFW)) - 2.2;
    const t = clamp((dist - (HALFW + 40)) / 300, 0, 1);
    const w = t * t * (3 - 2 * t);
    return lerp(edgeY, terrainH(x, z), w) - 0.15;
  };

  const grassTex = canvasTexture(512, (g) => {
    g.fillStyle = theme.ground; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 3600; i++) {
      g.fillStyle = theme.groundDots[i % 4];
      g.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }
    // grass blades
    g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 1400; i++) {
      const x = Math.random() * 512, y = Math.random() * 512;
      g.strokeStyle = theme.groundDots[i % 4];
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + (Math.random() - 0.5) * 3, y - 4 - Math.random() * 5);
      g.stroke();
    }
    for (let i = 0; i < 30; i++) {
      g.fillStyle = 'rgba(20,60,20,0.28)';
      g.beginPath(); g.arc(Math.random() * 512, Math.random() * 512, 10 + Math.random() * 30, 0, TAU); g.fill();
    }
  }, true);
  grassTex.repeat.set(60, 60);
  disposables.push(grassTex);
  {
    const SEG = 110, SIZE = 4200;
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    geo.rotateX(-Math.PI / 2);
    const posA = geo.attributes.position;
    // coarse road samples for the flattening pass
    const coarse = [];
    for (let i = 0; i < N; i += 3) coarse.push(cl[i]);
    for (let vi = 0; vi < posA.count; vi++) {
      const wx = posA.getX(vi) + WORLDC;
      const wz = posA.getZ(vi) + WORLDC;
      let best = coarse[0], bestD = Infinity;
      for (const c of coarse) {
        const d = (c.x - wx) ** 2 + (c.y - wz) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      }
      const dist = Math.sqrt(bestD);
      // follow the banked road edge, and keep the dirt strictly below the
      // asphalt so grass never pokes through the track
      const lat = (wx - best.x) * best.nx + (wz - best.y) * best.ny;
      const edgeY = roadY(best, clamp(lat, -HALFW, HALFW)) - 2.2;
      const t = clamp((dist - (HALFW + 40)) / 300, 0, 1);
      const w = t * t * (3 - 2 * t);
      posA.setY(vi, lerp(edgeY, terrainH(wx, wz), w) - 0.15);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
      map: grassTex, roughness: 1,
      normalMap: groundNormal, normalScale: new THREE.Vector2(0.55, 0.55),
    }));
    ground.material.normalMap.repeat.set(60, 60);
    ground.position.set(WORLDC, 0, WORLDC);
    ground.receiveShadow = true;
    group.add(ground);
  }

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
    new THREE.MeshStandardMaterial({
      map: roadTex, roughness: 0.9, side: THREE.DoubleSide,
      normalMap: roadNormal, normalScale: new THREE.Vector2(0.4, 0.4),
    })
  );
  road.receiveShadow = true;
  group.add(road);
  const curbs = new THREE.Mesh(
    ribbon(cl, HALFW, HALFW + 10, 0.12, 18),
    new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.85, side: THREE.DoubleSide })
  );
  curbs.receiveShadow = true;
  group.add(curbs);
  // grass shoulder glued to the curb -> crisp, well-defined track border
  const shoulder = new THREE.Mesh(
    ribbon(cl, HALFW + 10, HALFW + 46, 0.06, 60),
    new THREE.MeshStandardMaterial({
      map: grassTex, roughness: 1, side: THREE.DoubleSide,
      color: 0xdddddd,
      normalMap: groundNormal, normalScale: new THREE.Vector2(0.5, 0.5),
    })
  );
  shoulder.receiveShadow = true;
  group.add(shoulder);
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
    const m = new THREE.Mesh(
      ribbonSlice(cl, N - 2, 4, HALFW, 0.12, 1),
      new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.8, side: THREE.DoubleSide })
    );
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
    gate.position.set(c.x, c.h, c.y);
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
    const tex = padTex0.clone();
    tex.needsUpdate = true;
    disposables.push(tex);
    const m = new THREE.Mesh(
      ribbonSlice(cl, (bi - 3 + N) % N, 7, HALFW * 0.7, 0.15, 1),
      new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(1.7, 1.7, 1.7), side: THREE.DoubleSide })
    );
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
      mesh.position.set(c.x + c.nx * off, roadY(c, off) + 18, c.y + c.ny * off);
      mesh.castShadow = true;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowWhite, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.26,
      }));
      halo.scale.set(38, 38, 1);
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
        coinData.push({ x: c.x + c.nx * off, y: c.y + c.ny * off, h: roadY(c, off), taken: false });
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

  // trees (layered canopies), palms, rocks — all sitting on the terrain
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
      if (ok) spots.push({ x, z, s: 0.7 + rnd() * 0.9, baseY: terrainH(x, z) });
    }
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4520, roughness: 1 });
    const col = new THREE.Color();
    const mk = (geo, mat, list, yOff, tilt, greens) => {
      if (!list.length) return null;
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      const m4 = new THREE.Matrix4();
      const q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
      list.forEach((sp, i) => {
        e.set(tilt ? (Math.sin(i) * 0.18) : 0, i * 1.3, tilt ? (Math.cos(i) * 0.18) : 0);
        q.setFromEuler(e);
        sc.set(sp.s, sp.s, sp.s);
        v.set(sp.x, (sp.baseY || 0) + yOff * sp.s, sp.z);
        m4.compose(v, q, sc);
        im.setMatrixAt(i, m4);
        if (greens) im.setColorAt(i, col.setHSL(0.29 + (i % 7) * 0.012, 0.55, 0.3 + (i % 5) * 0.03));
      });
      im.castShadow = true;
      group.add(im);
      return im;
    };
    // layered canopy: three offset blobs merged into one organic crown
    const crown = mergeGeometries([
      new THREE.IcosahedronGeometry(22, 1),
      new THREE.IcosahedronGeometry(15, 1).translate(-10, 12, 5),
      new THREE.IcosahedronGeometry(13, 1).translate(9, 14, -6),
    ]);
    const crownMat = new THREE.MeshStandardMaterial({ roughness: 1, flatShading: true });
    const kind = theme.trees;
    const half = Math.ceil(spots.length / 2);
    if (kind === 'palm' || kind === 'palmpine') {
      const palms = kind === 'palm' ? spots : spots.slice(0, half);
      mk(new THREE.CylinderGeometry(2.5, 4, 55, 6), trunkMat, palms, 27, true);
      mk(new THREE.IcosahedronGeometry(20, 1), crownMat, palms.map(sp => ({ ...sp, s: sp.s * 1.05 })), 56, false, true);
      if (kind === 'palmpine') {
        const pines = spots.slice(half);
        mk(new THREE.CylinderGeometry(3, 4.5, 30, 6), trunkMat, pines, 15, false);
        mk(new THREE.ConeGeometry(22, 60, 8), new THREE.MeshStandardMaterial({ color: 0x1e5f30, roughness: 1 }), pines, 55, false);
      }
    } else if (kind === 'round') {
      mk(new THREE.CylinderGeometry(3, 4.5, 34, 6), trunkMat, spots, 17, false);
      mk(crown, crownMat, spots, 42, false, true);
    } else {
      const pines = spots.slice(0, half), rounds = spots.slice(half);
      mk(new THREE.CylinderGeometry(3, 4.5, 34, 6), trunkMat, spots, 17, false);
      mk(new THREE.ConeGeometry(22, 60, 8), new THREE.MeshStandardMaterial({ color: 0x1e5f30, roughness: 1 }), pines, 55, false);
      mk(crown, crownMat, rounds, 42, false, true);
    }
    // scattered rocks
    const rocks = [];
    for (let i = 0; i < 46; i++) {
      const c = cl[(i * 11) % N];
      const side = i % 2 ? -1 : 1;
      const off = HALFW + 60 + rnd() * 380;
      const x = c.x + c.nx * side * off, z = c.y + c.ny * side * off;
      let ok = true;
      for (let j = 0; j < N; j += 8) {
        const cc = cl[j];
        if ((cc.x - x) ** 2 + (cc.y - z) ** 2 < (HALFW + 40) ** 2) { ok = false; break; }
      }
      if (ok) rocks.push({ x, z, s: 0.5 + rnd() * 1.3, baseY: terrainH(x, z) });
    }
    const rockIm = mk(new THREE.DodecahedronGeometry(9, 0),
      new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, 3, true, false);
    if (rockIm) {
      for (let i = 0; i < rocks.length; i++)
        rockIm.setColorAt(i, col.setHSL(0.08, 0.08, 0.42 + (i % 4) * 0.05));
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
        const yb = roadY(c, side * (HALFW + 22));
        m4.identity(); m4.setPosition(x, yb + 4.5, z);
        posts.setMatrixAt(n, m4);
        m4.identity(); m4.setPosition(x, yb + 10.5, z);
        tips.setMatrixAt(n, m4);
        tips.setColorAt(n, side < 0 ? cA : cB);
        n++;
      }
    }
    group.add(posts); group.add(tips);
  }

  // ---- city: composite buildings with real-size windows ----
  if (theme.city && theme.city.count > 0) {
    let cseed = 42 + mapIdx * 13;
    const crnd = () => (cseed = (cseed * 16807) % 2147483647) / 2147483647;
    const cc = theme.city;
    const CELL = 26;          // one window bay ~= one floor, in world units
    const TILE = CELL * 4;    // facade texture holds a 4x4 grid of varied cells

    // facade texture per style (4x4 cells so lit/dark windows vary)
    const facadeTex = canvasTexture(512, (g) => {
      g.scale(2, 2);
      if (cc.style === 'paris') {
        g.fillStyle = '#d8cab2'; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 500; i++) {
          g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(120,100,70,0.07)';
          g.fillRect(crnd() * 256, crnd() * 256, 3, 3);
        }
        for (let cy = 0; cy < 4; cy++) {
          g.fillStyle = 'rgba(120,100,70,0.5)';
          g.fillRect(0, cy * 64 + 60, 256, 3); // cornice
          for (let cx = 0; cx < 4; cx++) {
            const x = cx * 64 + 18, y = cy * 64 + 8;
            g.fillStyle = crnd() < 0.25 ? '#f2dfa8' : '#2c2c34'; // few lit
            g.fillRect(x, y, 28, 42);
            g.strokeStyle = '#f4ede0'; g.lineWidth = 3;
            g.strokeRect(x, y, 28, 42);
            g.strokeStyle = '#5a5a62'; g.lineWidth = 2;
            g.beginPath(); g.moveTo(x, y + 34); g.lineTo(x + 28, y + 34); g.stroke(); // balcony rail
          }
        }
      } else if (cc.style === 'riviera') {
        g.fillStyle = '#f4e6cc'; g.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 400; i++) {
          g.fillStyle = 'rgba(200,160,110,0.08)';
          g.fillRect(crnd() * 256, crnd() * 256, 3, 3);
        }
        for (let cy = 0; cy < 4; cy++)
          for (let cx = 0; cx < 4; cx++) {
            const x = cx * 64 + 20, y = cy * 64 + 12;
            g.fillStyle = crnd() < 0.3 ? '#ffe9b0' : '#243040';
            g.fillRect(x, y, 24, 36);
            g.fillStyle = '#5f8a6a'; // shutters
            g.fillRect(x - 9, y, 8, 36);
            g.fillRect(x + 25, y, 8, 36);
            g.fillStyle = '#e8d5b5';
            g.fillRect(x - 10, y - 5, 44, 4); // lintel
          }
      } else { // modern glass
        g.fillStyle = '#1a2030'; g.fillRect(0, 0, 256, 256);
        for (let cy = 0; cy < 4; cy++) {
          g.fillStyle = '#10141f';
          g.fillRect(0, cy * 64 + 56, 256, 8); // floor slab
          for (let cx = 0; cx < 4; cx++) {
            const x = cx * 64 + 6, y = cy * 64 + 6;
            const r = crnd();
            if (r < 0.34) g.fillStyle = '#ffd27a';
            else if (r < 0.5) g.fillStyle = '#9adcff';
            else if (r < 0.58) g.fillStyle = '#fff0c0';
            else {
              const gl = g.createLinearGradient(x, y, x + 52, y + 46);
              gl.addColorStop(0, '#2a3a55');
              gl.addColorStop(1, '#141c2c');
              g.fillStyle = gl;
            }
            g.fillRect(x, y, 52, 46);
            g.strokeStyle = '#0c0f18'; g.lineWidth = 3;
            g.strokeRect(x, y, 52, 46);
            g.fillStyle = 'rgba(255,255,255,0.10)'; // glass reflection streak
            g.beginPath();
            g.moveTo(x + 6, y + 46); g.lineTo(x + 20, y); g.lineTo(x + 30, y); g.lineTo(x + 16, y + 46);
            g.closePath(); g.fill();
          }
        }
      }
    }, true);
    disposables.push(facadeTex);
    // lit ground-floor storefronts shared by every style
    const storeTex = canvasTexture(256, (g) => {
      g.fillStyle = '#20242e'; g.fillRect(0, 0, 256, 256);
      for (let sx = 0; sx < 2; sx++)
        for (let sy = 0; sy < 2; sy++) {
          const ox = sx * 128, oy = sy * 128;
          // awning
          g.fillStyle = ['#c04848', '#3a7a5a', '#3a5a9a', '#b08030'][(sx + sy * 2) % 4];
          for (let a = 0; a < 8; a++) {
            g.fillStyle = a % 2 ? '#f2ede0' : ['#c04848', '#3a7a5a', '#3a5a9a', '#b08030'][(sx + sy * 2) % 4];
            g.fillRect(ox + a * 16, oy + 10, 16, 22);
          }
          // shop window
          const wg = g.createLinearGradient(ox, oy + 40, ox, oy + 116);
          wg.addColorStop(0, '#ffe9b8');
          wg.addColorStop(1, '#c89a50');
          g.fillStyle = wg;
          g.fillRect(ox + 10, oy + 40, 74, 76);
          g.fillStyle = '#141820';
          g.fillRect(ox + 94, oy + 40, 26, 76); // door
          g.strokeStyle = '#0e1016'; g.lineWidth = 4;
          g.strokeRect(ox + 10, oy + 40, 74, 76);
        }
    }, true);
    disposables.push(storeTex);
    const storeGeos = [];

    const facadeGeos = [], roofGeos = [], tileGeos = [], detailGeos = [], signGeos = [];
    const colOf = (hex) => new THREE.Color(hex);
    const wallTints = cc.style === 'paris'
      ? [colOf(0xfff6e8), colOf(0xf2e6d2), colOf(0xe8dcc4)]
      : cc.style === 'riviera'
        ? [colOf(0xfff2dc), colOf(0xf6d8c0), colOf(0xf2e6b8), colOf(0xdce8f0), colOf(0xf6c9c0)]
        : [colOf(0xffffff), colOf(0xcdd8e8), colOf(0xb8c4d8), colOf(0xe8e2d4)];

    const pushTint = (geo, tint) => {
      const n = geo.attributes.position.count;
      const colArr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { colArr[i * 3] = tint.r; colArr[i * 3 + 1] = tint.g; colArr[i * 3 + 2] = tint.b; }
      geo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
      facadeGeos.push(geo);
    };
    // box with window UVs matched to real dimensions (windows never stretch)
    const winBox = (w, h, d, x, y, z, ry = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      const uv = g.attributes.uv;
      const scale = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) {
        const [su, sv] = scale[f];
        for (let v = 0; v < 4; v++) {
          const i = f * 4 + v;
          uv.setXY(i, uv.getX(i) * su / TILE, uv.getY(i) * sv / TILE);
        }
      }
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return g;
    };
    const winCyl = (r, h, x, y, z) => {
      const g = new THREE.CylinderGeometry(r, r, h, 14, 1, true);
      const uv = g.attributes.uv;
      const su = (TAU * r) / TILE, sv = h / TILE;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
      g.translate(x, y, z);
      return g;
    };
    const slab = (w, h, d, x, y, z, ry = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return g;
    };
    const hipRoof = (w, h, d, x, y, z, ry = 0) => {
      const g = new THREE.ConeGeometry(1, 1, 4);
      g.rotateY(Math.PI / 4);
      g.scale(w * 0.74, h, d * 0.74);
      if (ry) g.rotateY(ry);
      g.translate(x, y, z);
      return g;
    };

    for (let i = 0; i < cc.count; i++) {
      const a = (i / cc.count) * TAU + crnd() * 0.1;
      const r = cc.rMin + crnd() * cc.rVar;
      const bx = WORLDC + Math.cos(a) * r;
      const bz = WORLDC + Math.sin(a) * r;
      const ry = crnd() * TAU;
      const tint = wallTints[i % wallTints.length];
      const h = cc.hMin + crnd() * cc.hVar;

      if (cc.style === 'paris') {
        const w = 120 + crnd() * 90, d = 70 + crnd() * 30;
        pushTint(winBox(w, h, d, bx, h / 2, bz, ry), tint);
        storeGeos.push(winBox(w + 5, 22, d + 5, bx, 11, bz, ry));
        roofGeos.push(hipRoof(w + 8, 34, d + 8, bx, h + 17, bz, ry)); // mansard
        for (let ch = 0; ch < 3; ch++)
          detailGeos.push(slab(6, 16, 6, bx + (crnd() - 0.5) * w * 0.6, h + 30, bz + (crnd() - 0.5) * d * 0.5, ry));
      } else if (cc.style === 'riviera') {
        const w = 70 + crnd() * 70, d = 55 + crnd() * 35;
        pushTint(winBox(w, h, d, bx, h / 2, bz, ry), tint);
        tileGeos.push(hipRoof(w + 10, 26, d + 10, bx, h + 13, bz, ry)); // terracotta
        if (crnd() < 0.5) detailGeos.push(slab(6, 12, 6, bx + w * 0.2, h + 22, bz, ry));
      } else {
        // modern: stepped tower / slab / cylinder
        const kind = crnd();
        if (kind < 0.2) {
          const cr = 34 + crnd() * 22;
          pushTint(winCyl(cr, h, bx, h / 2, bz), tint);
          detailGeos.push(slab(cr * 2 + 4, 3, cr * 2 + 4, bx, h + 1.5, bz));
        } else if (kind < 0.6) {
          const w = 70 + crnd() * 60, d = 60 + crnd() * 50;
          const h1 = h * (0.55 + crnd() * 0.15), h2 = h - h1;
          pushTint(winBox(w, h1, d, bx, h1 / 2, bz, ry), tint);
          pushTint(winBox(w * 0.68, h2, d * 0.68, bx, h1 + h2 / 2, bz, ry), tint);
          detailGeos.push(slab(w + 4, 3, d + 4, bx, h1 + 1.5, bz, ry));       // setback parapet
          detailGeos.push(slab(w * 0.68 + 4, 3, d * 0.68 + 4, bx, h + 1.5, bz, ry));
          if (crnd() < 0.6) detailGeos.push(slab(2.4, 40 + crnd() * 40, 2.4, bx, h + 22, bz)); // antenna
        } else {
          const w = 110 + crnd() * 80, d = 55 + crnd() * 30;
          pushTint(winBox(w, h, d, bx, h / 2, bz, ry), tint);
          storeGeos.push(winBox(w + 5, 22, d + 5, bx, 11, bz, ry));
          detailGeos.push(slab(w + 4, 3, d + 4, bx, h + 1.5, bz, ry));
          if (crnd() < 0.5) { // water tank
            detailGeos.push(slab(12, 14, 12, bx + w * 0.2, h + 8, bz, ry));
          }
          for (let ac = 0; ac < 3; ac++) // AC units
            detailGeos.push(slab(8, 5, 8, bx + (crnd() - 0.5) * w * 0.6, h + 4, bz + (crnd() - 0.5) * d * 0.5, ry));
        }
        // glowing rooftop sign
        if (crnd() < (cc.signs || 0)) {
          const sw = 60 + crnd() * 30;
          const sg = new THREE.PlaneGeometry(sw, sw * 0.3);
          const pick = Math.floor(crnd() * 4);
          const uv = sg.attributes.uv;
          for (let vi = 0; vi < uv.count; vi++)
            uv.setXY(vi, (uv.getX(vi) + (pick % 2)) * 0.5, (uv.getY(vi) + (pick >> 1)) * 0.5);
          sg.rotateY(ry + Math.PI * (crnd() < 0.5 ? 0 : 1));
          sg.translate(bx, h + 26, bz);
          signGeos.push(sg);
          detailGeos.push(slab(2, 24, 2, bx, h + 10, bz));
        }
      }
    }

    const facadeMat = new THREE.MeshStandardMaterial({
      map: facadeTex, roughness: 0.75, metalness: cc.style === 'modern' ? 0.35 : 0.05,
      vertexColors: true,
      emissive: 0xffffff, emissiveMap: facadeTex, emissiveIntensity: cc.glow * 0.35,
    });
    const cityF = new THREE.Mesh(mergeGeometries(facadeGeos), facadeMat);
    group.add(cityF);
    if (roofGeos.length)
      group.add(new THREE.Mesh(mergeGeometries(roofGeos), new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.8 })));
    if (tileGeos.length)
      group.add(new THREE.Mesh(mergeGeometries(tileGeos), new THREE.MeshStandardMaterial({ color: 0xb85a38, roughness: 0.85 })));
    if (detailGeos.length)
      group.add(new THREE.Mesh(mergeGeometries(detailGeos), new THREE.MeshStandardMaterial({ color: 0x22242e, roughness: 0.7, metalness: 0.3 })));
    if (storeGeos.length) {
      // remap store UVs from the facade TILE to the store texture (2x2 shops)
      const merged = mergeGeometries(storeGeos);
      const uv = merged.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * TILE / 84, uv.getY(i) * TILE / 22);
      group.add(new THREE.Mesh(merged, new THREE.MeshStandardMaterial({
        map: storeTex, roughness: 0.6,
        emissive: 0xffffff, emissiveMap: storeTex, emissiveIntensity: Math.max(0.25, cc.glow * 0.5),
      })));
    }
    if (signGeos.length) {
      const signTex = canvasTexture(256, (g) => {
        g.fillStyle = '#0a0a14'; g.fillRect(0, 0, 256, 256);
        const draw = (txt, x, y, col) => {
          g.font = "900 40px 'Arial Rounded MT Bold', system-ui, sans-serif";
          g.textAlign = 'center'; g.textBaseline = 'middle';
          g.fillStyle = col;
          g.fillText(txt, x, y);
          g.strokeStyle = col; g.lineWidth = 3;
          g.strokeRect(x - 58, y - 28, 116, 56);
        };
        draw('IAM', 64, 192, '#40e0ff');
        draw('KART', 192, 192, '#ff50dc');
        draw('GP ★', 64, 64, '#ffd24a');
        draw('TURBO', 192, 64, '#96ff50');
      });
      disposables.push(signTex);
      group.add(new THREE.Mesh(mergeGeometries(signGeos), new THREE.MeshBasicMaterial({
        map: signTex, color: new THREE.Color(1.8, 1.8, 1.8), side: THREE.DoubleSide, transparent: true,
      })));
    }
  }

  // ring of real low-poly mountains: parallax + fog kill the flat backdrop
  {
    let mseed = 500 + mapIdx * 31;
    const mrnd = () => (mseed = (mseed * 16807) % 2147483647) / 2147483647;
    const [peakColor, snowy] = theme.peaks || [0x5a7a5a, false];
    const seaAng = theme.sea ? Math.atan2(theme.sea.z - WORLDC, theme.sea.x - WORLDC) : null;
    const rockGeos = [], snowGeos = [];
    const COUNT = 42;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * TAU + mrnd() * 0.12;
      if (seaAng !== null && Math.abs(angDiff(a, seaAng)) < 0.55) continue;
      const r = 2450 + mrnd() * 850;
      const mx = WORLDC + Math.cos(a) * r;
      const mz = WORLDC + Math.sin(a) * r;
      const w = 320 + mrnd() * 420;
      const h = 170 + mrnd() * 300;
      const rock = new THREE.ConeGeometry(1, 1, 5 + Math.floor(mrnd() * 3));
      rock.scale(w, h, w * (0.7 + mrnd() * 0.5));
      rock.rotateY(mrnd() * TAU);
      rock.translate(mx, h / 2 - 12, mz);
      rockGeos.push(rock);
      if (snowy && h > 320) {
        const cap = new THREE.ConeGeometry(1, 1, 5);
        cap.scale(w * 0.34, h * 0.34, w * 0.30);
        cap.translate(mx, h - h * 0.17 - 12, mz);
        snowGeos.push(cap);
      }
    }
    if (rockGeos.length)
      group.add(new THREE.Mesh(mergeGeometries(rockGeos), new THREE.MeshStandardMaterial({
        color: peakColor, roughness: 1, flatShading: true,
      })));
    if (snowGeos.length)
      group.add(new THREE.Mesh(mergeGeometries(snowGeos), new THREE.MeshStandardMaterial({
        color: 0xe8eef4, roughness: 0.9, flatShading: true,
      })));
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
    stand.position.set(bx, c.h, bz);
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
      tower.position.set(tx, ci.h, tz);
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
function saveRecord(mapId, ccIdx2, time, name, extra = {}) {
  const all = loadRecords();
  const key = `${mapId}-${ccIdx2}`;
  const list = all[key] || [];
  list.push({ t: time, name, d: new Date().toISOString().slice(0, 10), ...extra });
  list.sort((a, b) => a.t - b.t);
  all[key] = list.slice(0, 5);
  try { localStorage.setItem('iam-records', JSON.stringify(all)); } catch (e) {}
  return all[key].findIndex(r => r.t === time && r.name === name);
}

/* ---- post-race name entry (manual typing + one-tap past players) ---- */
function loadPlayers() {
  try { return JSON.parse(localStorage.getItem('iam-players')) || []; } catch (e) { return []; }
}
function rememberPlayer(name) {
  const list = loadPlayers().filter(n => n !== name);
  list.unshift(name);
  try { localStorage.setItem('iam-players', JSON.stringify(list.slice(0, 8))); } catch (e) {}
}
let pendingRecord = null, nameAsked = false;
const nameOverlay = document.getElementById('name-overlay');
const nameInput = document.getElementById('name-input');
const nameChips = document.getElementById('name-chips');

// every name we've ever seen (recent players + names in saved records)
const normName = (n) => n.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function allKnownNames() {
  const seen = new Map();
  for (const n of loadPlayers()) seen.set(normName(n), n);
  const all = loadRecords();
  for (const key of Object.keys(all))
    for (const r of all[key])
      if (r.name && !seen.has(normName(r.name))) seen.set(normName(r.name), r.name);
  return [...seen.values()];
}

// live suggestions while typing -> tap = save under that exact name
function renderChips(filter = '') {
  nameChips.innerHTML = '';
  const f = normName(filter);
  const names = allKnownNames().filter(n => !f || normName(n).startsWith(f)).slice(0, 8);
  for (const n of names) {
    const b = document.createElement('button');
    b.textContent = n;
    b.addEventListener('click', () => commitRecord(n));
    nameChips.appendChild(b);
  }
}

function commitRecord(name) {
  if (!pendingRecord) return;
  let clean = (name || '').trim().slice(0, 12) || CHARACTERS[player.charIdx].name;
  // merge with an existing name that only differs by case/accents — no duplicates
  const existing = allKnownNames().find(n => normName(n) === normName(clean));
  if (existing) clean = existing;
  newRecordRank = saveRecord(MAPS[mapSel].id, ccSel, pendingRecord.time, clean, {
    laps: pendingRecord.laps.map(t => Math.round(t * 100) / 100),
    veh: VEHICLES[vehSel],
    ch: CHARACTERS[player.charIdx].name,
  });
  if (name && name.trim()) rememberPlayer(clean);
  pendingRecord = null;
  if (nameOverlay) nameOverlay.hidden = true;
  beep(880, 0.12, 'square', 1320);
}
function showNameOverlay() {
  if (!nameOverlay) return;
  try { nameInput.value = localStorage.getItem('iam-lastname') || ''; } catch (e) { nameInput.value = ''; }
  renderChips(nameInput.value);
  nameOverlay.hidden = false;
}
if (nameOverlay) {
  document.getElementById('name-save').addEventListener('click', () => {
    try { localStorage.setItem('iam-lastname', nameInput.value.trim()); } catch (e) {}
    commitRecord(nameInput.value);
  });
  document.getElementById('name-skip').addEventListener('click', () => commitRecord(null));
  nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitRecord(nameInput.value); });
  nameInput.addEventListener('input', () => renderChips(nameInput.value)); // autocomplete
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
    lapTimes: [], lapStart: 0,
    aiSkill: 0.87 + (gridPos % 7) * 0.017,
    laneSeed: gridPos * 1.7,
    steerVis: 0, wheelSpin: 0,
  };
}

let karts = [], player = null, bananas = [], shells = [];
// title -> cc (étape 1) -> char (étape 2) -> map (étape 3) -> countdown -> race -> finish
let state = 'title';
let menuChar = 0, mapSel = 0, ccSel = 1;
const COLOR_PALETTE = ['#ff4fa3', '#e03434', '#38c8ff', '#6ede3a', '#f0c020', '#9040e0', '#f07818', '#f2f2f2'];
let colorSel = 0;
try { colorSel = clamp(parseInt(localStorage.getItem('iam-color') || '0', 10) || 0, 0, COLOR_PALETTE.length - 1); } catch (e) {}
let ccMul = CC_CLASSES[1].mul;
let countdownT = 0, raceTime = 0, finishDelay = 0;
let camAngle = 0;
let lastBeep = -1;
let newRecordRank = -1;
let prevStart = false, prevLeft = false, prevRight = false, prevItem = false, prevGas = false;

function clearProjectiles() {
  for (const b of bananas) scene.remove(b.mesh);
  for (const s of shells) scene.remove(s.mesh);
  bananas = []; shells = [];
}

function resetRace(playerChar) {
  clearProjectiles();
  ensureKartMeshes();
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
    const bc = center[k.trackIdx];
    mesh.position.set(k.x - fwdX * 55, roadY(bc, lateralOffset(k, bc)), k.y - fwdY * 55);
    scene.add(mesh);
    bananas.push({ x: mesh.position.x, y: mesh.position.z, mesh });
    if (k.isPlayer) beep(500, 0.08, 'square');
  } else if (k.item === 'shell') {
    const mesh = shellProto.clone();
    mesh.position.set(k.x + fwdX * 40, center[k.trackIdx].h, k.y + fwdY * 40);
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
      throttle = (input.gas || autoGas) ? 1 : 0;
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
  if (k.trackIdx > N - 30 && ni < 30) {
    k.lap++;
    if (k.isPlayer && k.lap > 1 && state === 'race') { // completed a lap
      k.lapTimes.push(raceTime - k.lapStart);
      k.lapStart = raceTime;
      if (k.lap <= LAPS) beep(660, 0.15, 'square', 990);
    }
  }
  else if (k.trackIdx < 30 && ni > N - 30) k.lap--;
  k.trackIdx = ni;
  k.key = k.lap * N + ni;
  if (k.lap > LAPS && !k.finishTime) k.finishTime = raceTime;

  const cc = center[ni];
  const dc = Math.hypot(cc.x - k.x, cc.y - k.y);
  // Lakitu-style rescue: 3s off the road (1.4s when really lost) puts the
  // kart back on the centerline. A star pardons the grass shortcut.
  if (offroad && k.starT <= 0) {
    k.offroadT += dt;
    if (k.offroadT > 3 || (dc > 300 && k.offroadT > 1.4)) {
      k.x = cc.x; k.y = cc.y;
      k.angle = Math.atan2(cc.diry, cc.dirx);
      k.speed = 0; k.offroadT = 0;
      k.visY = undefined; // snap straight onto the road surface
      if (k.isPlayer) beep(520, 0.2, 'triangle', 260);
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
      s.mesh.position.set(s.x, center[s.trackIdx].h, s.y);
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
    const c = center[k.trackIdx];
    const lat = lateralOffset(k, c);
    const onRoad = Math.abs(lat) < HALFW + 30;
    const targetY = onRoad ? roadY(c, lat) : track.groundYAt(k.x, k.y, k.trackIdx) + 0.6;
    if (k.visY === undefined) k.visY = targetY;
    k.visY = lerp(k.visY, targetY, Math.min(1, dt * 10));
    m.group.visible = true;
    m.group.position.set(k.x, k.visY, k.y);
    m.group.rotation.y = -(k.angle + k.spinAng);
    // lean into turns + follow the road camber and slope
    m.chassis.rotation.x = k.steerVis * 0.10 - (onRoad ? c.bank : 0);
    m.chassis.rotation.z = clamp(k.speed * 0.0004, 0, 0.1) - (k.boostT > 0 ? 0.06 : 0) + (onRoad ? Math.atan(c.slope) * 0.8 : 0);
    m.chassis.position.y = m.hover
      ? 2.2 + Math.sin(perfNow * 0.004 + k.laneSeed * 7) * 1.1
      : Math.sin(perfNow * 0.02 + k.laneSeed * 7) * clamp(k.speed * 0.004, 0, 0.5); // hover or suspension
    if (m.thrusterSprites) for (const tsp of m.thrusterSprites) {
      const ts = 13 + Math.sin(perfNow * 0.03 + k.laneSeed) * 3 + clamp(k.speed * 0.02, 0, 6);
      tsp.scale.set(ts, ts, 1);
    }
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
      coinV.set(cn.x, cn.h + 14, cn.y);
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
    const hy = player.visY || 0;
    headlight.intensity = 900;
    headlight.position.set(player.x + fx * 26, hy + 10, player.y + fz * 26);
    headlight.target.position.set(player.x + fx * 240, hy, player.y + fz * 240);
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
    posArr[i * 3 + 1] = (player.visY || 0) + 90 + Math.random() * 120;
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
  if (state === 'title' || state === 'cc') {
    // wide orbit over the start grid
    const t = perfNow * 0.0003;
    const c = center[(N - 20) % N];
    camera.position.set(c.x + Math.cos(t) * 130, c.h + 55 + Math.sin(t * 0.7) * 12, c.y + Math.sin(t) * 130);
    camera.lookAt(c.x, c.h + 18, c.y);
    sun.position.set(c.x + 300, 500, c.y + 120);
    sun.target.position.set(c.x, 0, c.y);
  } else if (state === 'char' || state === 'color') {
    // MK-style close-up: slow orbit around the selected kart
    const t = perfNow * 0.0006;
    const py = player.visY || 0;
    camera.position.set(player.x + Math.cos(t) * 85, py + 34, player.y + Math.sin(t) * 85);
    camera.lookAt(player.x, py + 14, player.y);
    sun.position.set(player.x + 300, 500, player.y + 120);
    sun.target.position.set(player.x, 0, player.y);
  } else if (state === 'map') {
    // circuit preview: fly along the track like the MK course intro
    const f = perfNow * 0.008;
    const i0 = Math.floor(f) % N, frac = f - Math.floor(f);
    const c = center[i0], c2 = center[(i0 + 1) % N];
    const px = lerp(c.x, c2.x, frac), pz = lerp(c.y, c2.y, frac), ph = lerp(c.h, c2.h, frac);
    const a1 = center[(i0 + 26) % N], a2 = center[(i0 + 27) % N];
    camera.position.set(px - c.dirx * 40, ph + 95, pz - c.diry * 40);
    camera.lookAt(lerp(a1.x, a2.x, frac), lerp(a1.h, a2.h, frac) + 12, lerp(a1.y, a2.y, frac));
    sun.position.set(c.x + 300, 500, c.y + 120);
    sun.target.position.set(c.x, 0, c.y);
  } else {
    camAngle += angDiff(camAngle, player.angle) * Math.min(1, dt * 7);
    const fx = Math.cos(camAngle), fz = Math.sin(camAngle);
    const py = player.visY || 0;
    camera.position.set(player.x - fx * CAMBACK, py + CAMH, player.y - fz * CAMBACK);
    camera.lookAt(player.x + fx * 70, py + 22, player.y + fz * 70);
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
  hctx.font = `900 ${size}px 'Arial Rounded MT Bold', 'Nunito', 'Trebuchet MS', system-ui, sans-serif`;
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
  if (player.offroadT > 1.2 && state === 'race') {
    // rescue incoming — pulse a warning so the teleport isn't a surprise
    const blink = Math.sin(perfNow * 0.012) > -0.3;
    if (blink) text('⤺ RETOUR SUR LA PISTE…', HW / 2, OY + HH - 96, 15, 'center', '#ffd23e');
  }
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
  // restart race button
  hctx.fillStyle = 'rgba(0,0,20,0.45)';
  hctx.strokeStyle = 'rgba(255,255,255,0.6)';
  hctx.lineWidth = 2;
  hctx.beginPath(); hctx.arc(HW - 24, 66, 14, 0, TAU); hctx.fill(); hctx.stroke();
  text('↻', HW - 24, 57, 17, 'center', '#fff');
  hitR(HW - 46, 44, 44, 44, { t: 'restart' });
  hctx.globalAlpha = 0.9;
  const mmY = HB > HW ? 100 : HB - 94; // portrait: clear of the A button
  hctx.drawImage(track.miniCanvas, HW - 94, mmY);
  for (const k of karts) {
    hctx.fillStyle = k.isPlayer ? '#fff' : CHARACTERS[k.charIdx].color;
    const mx = HW - 94 + k.x / 2048 * 84, my = mmY + k.y / 2048 * 84;
    hctx.beginPath(); hctx.arc(mx, my, k.isPlayer ? 3 : 2.2, 0, TAU); hctx.fill();
  }
  hctx.globalAlpha = 1;
}

// mini-thumbnails of every circuit, pre-rendered once for the map carousel
const mapThumbs = MAPS.map((m) => {
  const cl = sampleCenterline(m.ctrl);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10,10,30,0.75)';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = '#e8e8e8'; g.lineWidth = 3.5; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(cl[0].x / 2048 * 64, cl[0].y / 2048 * 64);
  for (let i = 1; i < N; i += 6) g.lineTo(cl[i].x / 2048 * 64, cl[i].y / 2048 * 64);
  g.closePath(); g.stroke();
  return c;
});

function drawGoButton(label) {
  const w = 250, h = 36;
  const x = HW / 2 - w / 2, y = HB - 50;
  const grad = hctx.createLinearGradient(0, y, 0, y + h);
  grad.addColorStop(0, '#4fc3ff');
  grad.addColorStop(1, '#2a7ae0');
  hctx.fillStyle = grad;
  hctx.strokeStyle = 'rgba(255,255,255,0.85)';
  hctx.lineWidth = 2.5;
  hctx.beginPath(); hctx.roundRect(x, y, w, h, 18); hctx.fill(); hctx.stroke();
  const pulse = 1 + Math.sin(perfNow * 0.006) * 0.02;
  text(label, HW / 2, y + 8, 17 * pulse, 'center', '#fff');
  hitR(x - 10, y - 8, w + 20, h + 16, { t: 'go' });
}

function stepHeader(step, label) {
  text(`ÉTAPE ${step}/4`, HW / 2, OY + 14, 11, 'center', '#ff50dc');
  text(label, HW / 2, OY + 28, 22, 'center', '#40e0ff');
  text('‹ retour', 14, OY + 46, 13, 'left', '#cde');
  hitR(0, OY + 36, 96, 36, { t: 'back' });
}

function drawTitle() {
  hctx.fillStyle = 'rgba(8,5,25,0.35)';
  hctx.fillRect(0, 0, HW, HB);
  text('IAM KART', HW / 2, OY + 50, 58, 'center', '#40e0ff');
  text('Inès · Alice · Marlon', HW / 2, OY + 112, 16, 'center', '#ff50dc');
  drawGoButton('JOUER ▶');
  if (!matchMedia('(pointer: coarse)').matches)
    text('← → choisir · Entrée valider · B retour · R recommencer', HW / 2, OY + 238, 10, 'center', '#9ab');
}

function drawCcSelect() {
  hctx.fillStyle = 'rgba(8,5,25,0.45)';
  hctx.fillRect(0, 0, HW, HB);
  stepHeader(1, 'CHOISIS TA CYLINDRÉE');
  CC_CLASSES.forEach((cc, i) => {
    const sel = i === ccSel;
    const y = OY + 84 + i * 52;
    hitR(HW / 2 - 150, y - 10, 300, 48, { t: 'cc', i });
    if (sel) {
      hctx.fillStyle = 'rgba(64,224,255,0.18)';
      hctx.strokeStyle = '#40e0ff';
      hctx.lineWidth = 2;
      hctx.beginPath(); hctx.roundRect(HW / 2 - 140, y - 8, 280, 44, 10); hctx.fill(); hctx.stroke();
    }
    text(cc.label, HW / 2 - 70, y, 24, 'left', sel ? '#ffd24a' : '#eee');
    text(cc.desc, HW / 2 + 70, y + 7, 14, 'right', sel ? '#fff' : '#9ab');
  });
  drawGoButton('CONTINUER ▶');
}

function drawCharSelect() {
  // no dark overlay: the 3D vehicle close-up IS the star of this screen
  stepHeader(2, 'CHOISIS TON VÉHICULE');
  text('◀', HW / 2 - 130, OY + 130, 34, 'center', '#fff');
  text('▶', HW / 2 + 130, OY + 130, 34, 'center', '#fff');
  hitR(HW / 2 - 180, OY + 90, 100, 110, { t: 'nav', d: -1 });
  hitR(HW / 2 + 80, OY + 90, 100, 110, { t: 'nav', d: 1 });
  text(VEHICLES[vehSel], HW / 2, OY + 62, 28, 'center', '#ffd24a');
  text(`${vehSel + 1} / ${VEHICLES.length}`, HW / 2, OY + 96, 11, 'center', '#9ab');
  text('← glisse pour changer →', HW / 2, OY + 232, 11, 'center', '#8ac');
  drawGoButton('CONTINUER ▶');
}

function drawColorSelect() {
  stepHeader(3, 'CHOISIS TA COULEUR');
  const sw = 34, gap = 10;
  const total = COLOR_PALETTE.length * sw + (COLOR_PALETTE.length - 1) * gap;
  const x0 = HW / 2 - total / 2;
  COLOR_PALETTE.forEach((col, i) => {
    const x = x0 + i * (sw + gap);
    const y = OY + 210;
    hitR(x - 5, y - 5, sw + 10, sw + 10, { t: 'col', i });
    hctx.fillStyle = col;
    hctx.globalAlpha = i === colorSel ? 1 : 0.6;
    hctx.beginPath(); hctx.roundRect(x, y, sw, sw, 10); hctx.fill();
    hctx.globalAlpha = 1;
    if (i === colorSel) {
      hctx.strokeStyle = '#fff';
      hctx.lineWidth = 3.5;
      hctx.beginPath(); hctx.roundRect(x - 3, y - 3, sw + 6, sw + 6, 12); hctx.stroke();
    }
  });
  text('◀', HW / 2 - 130, OY + 120, 34, 'center', '#fff');
  text('▶', HW / 2 + 130, OY + 120, 34, 'center', '#fff');
  hitR(HW / 2 - 180, OY + 90, 100, 100, { t: 'nav', d: -1 });
  hitR(HW / 2 + 80, OY + 90, 100, 100, { t: 'nav', d: 1 });
  drawGoButton('CONTINUER ▶');
}

function drawMapSelect() {
  // the 3D flythrough behind is the live preview — keep the veil light
  hctx.fillStyle = 'rgba(8,5,25,0.25)';
  hctx.fillRect(0, 0, HW, HB);
  stepHeader(4, 'CHOISIS TON CIRCUIT');
  const map = MAPS[mapSel];
  text('◀', HW / 2 - 150, OY + 110, 30, 'center', '#fff');
  text('▶', HW / 2 + 150, OY + 110, 30, 'center', '#fff');
  hitR(HW / 2 - 195, OY + 80, 90, 100, { t: 'nav', d: -1 });
  hitR(HW / 2 + 105, OY + 80, 90, 100, { t: 'nav', d: 1 });
  text(map.name.toUpperCase(), HW / 2, OY + 58, 28, 'center', '#ffd24a');
  text(map.desc, HW / 2, OY + 92, 12, 'center', '#cfe');
  hctx.globalAlpha = 0.95;
  hctx.drawImage(track.miniCanvas, HW / 2 - 44, OY + 112, 88, 88);
  hctx.globalAlpha = 1;
  // best local record for the chosen cc
  const recs = recordsFor(map.id, ccSel);
  if (recs.length)
    text(`Record ${CC_CLASSES[ccSel].label} : ${fmtTime(recs[0].t)} (${recs[0].name})`, HW / 2, OY + 204, 11, 'center', '#ff50dc');
  else
    text(`Aucun record en ${CC_CLASSES[ccSel].label} — à toi de jouer !`, HW / 2, OY + 204, 11, 'center', '#9ab');
  // carousel of every circuit
  const th = 40, gap = 10;
  const total = MAPS.length * th + (MAPS.length - 1) * gap;
  const x0 = HW / 2 - total / 2;
  MAPS.forEach((m, i) => {
    const x = x0 + i * (th + gap);
    const y = OY + 226;
    hitR(x - 4, y - 4, th + 8, th + 8, { t: 'map', i });
    hctx.globalAlpha = i === mapSel ? 1 : 0.55;
    hctx.drawImage(mapThumbs[i], x, y, th, th);
    hctx.globalAlpha = 1;
    if (i === mapSel) {
      hctx.strokeStyle = '#40e0ff';
      hctx.lineWidth = 2.5;
      hctx.strokeRect(x - 2, y - 2, th + 4, th + 4);
    }
  });
  drawGoButton('C’EST PARTI ! 🏁');
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
  if (recs.length) text(`Record local : ${fmtTime(recs[0].t)} (${recs[0].name})`, HW / 2, HB - 58, 11, 'center', '#ff50dc');
  if (player.lapTimes.length) {
    const best = Math.min(...player.lapTimes);
    text(`Meilleur tour : ${fmtTime(best)}`, HW / 2, HB - 44, 11, 'center', '#9fe');
  }
  if (!pendingRecord) {
    const blink = (perfNow / 500 | 0) % 2 === 0;
    if (blink) text('TOUCHE / ENTRÉE POUR REJOUER', HW / 2, HB - 24, 13, 'center', '#fff');
  }
}

/* ---------------- Resize ---------------- */
let lastCW = 0, lastCH = 0;
function resize() {
  const w = glCanvas.clientWidth, h = glCanvas.clientHeight;
  if (!w || !h) return;
  lastCW = w; lastCH = h;
  renderer.setSize(w, h, false);
  composer.setSize(w, h);
  composer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  hud.width = Math.round(w * dpr);
  hud.height = Math.round(h * dpr);
}
addEventListener('resize', resize);
addEventListener('orientationchange', () => { resize(); setTimeout(resize, 300); setTimeout(resize, 900); });
if (window.visualViewport) visualViewport.addEventListener('resize', resize);
resize();

/* ---------------- Main loop ---------------- */
let perfNow = 0, lastT = 0;
const controlsEl = document.getElementById('controls');
let controlsShown = null;

function frame(t) {
  requestAnimationFrame(frame);
  perfNow = t;
  if (glCanvas.clientWidth !== lastCW || glCanvas.clientHeight !== lastCH) resize();
  // touch controls only exist while driving — menus stay clean
  const wantControls = state === 'race' || state === 'countdown' || state === 'finish';
  if (wantControls !== controlsShown && controlsEl) {
    controlsShown = wantControls;
    controlsEl.classList.toggle('ingame', wantControls);
  }
  const dt = clamp((t - lastT) / 1000, 0, 0.033);
  lastT = t;
  const tSec = t * 0.001;

  // taps on HUD widgets (arrows, tiles, rows, thumbnails, back)
  let uiAct;
  while ((uiAct = uiQueue.shift())) {
    const a = uiAct;
    if (a.t === 'back') {
      if (state === 'cc') state = 'title';
      else if (state === 'char') state = 'cc';
      else if (state === 'color') state = 'char';
      else if (state === 'map') state = 'color';
      beep(360, 0.08, 'square');
    } else if (a.t === 'nav') {
      const dir = a.d;
      if (state === 'char') { uiQueue.push({ t: 'veh', d: dir }); continue; }
      if (state === 'color') { uiQueue.push({ t: 'col', d: dir }); continue; }
      else if (state === 'cc') ccSel = (ccSel + CC_CLASSES.length + dir) % CC_CLASSES.length;
      else if (state === 'map') {
        mapSel = (mapSel + MAPS.length + dir) % MAPS.length;
        buildTrack(mapSel);
        resetRace(menuChar);
      }
      beep(480, 0.06, 'square');
    } else if (a.t === 'go') {
      tapStart = true;
    } else if (a.t === 'col') {
      colorSel = a.i !== undefined ? a.i : (colorSel + COLOR_PALETTE.length + a.d) % COLOR_PALETTE.length;
      try { localStorage.setItem('iam-color', String(colorSel)); } catch (e) {}
      ensureKartMeshes();
      beep(480, 0.06, 'square');
    } else if (a.t === 'veh') {
      vehSel = (vehSel + VEHICLES.length + a.d) % VEHICLES.length;
      try { localStorage.setItem('iam-veh', String(vehSel)); } catch (e) {}
      ensureKartMeshes();
      beep(480, 0.06, 'square');
    } else if (a.t === 'restart') {
      if (state === 'race' || state === 'countdown' || state === 'finish') {
        resetRace(menuChar);
        state = 'countdown';
        countdownT = 0; lastBeep = -1;
        beep(560, 0.08, 'square');
      }
    } else if (a.t === 'cc') { ccSel = a.i; beep(480, 0.06, 'square'); }
    else if (a.t === 'char') { menuChar = a.i; beep(480, 0.06, 'square'); }
    else if (a.t === 'map') {
      if (a.i !== mapSel) { mapSel = a.i; buildTrack(mapSel); resetRace(menuChar); beep(480, 0.06, 'square'); }
    }
  }

  const startPressed = (input.start && !prevStart) || tapStart;
  tapStart = false;
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

  if (state === 'title') {
    if (karts.length === 0) resetRace(menuChar);
    if (startPressed) { state = 'cc'; beep(560, 0.08, 'square'); }
  } else if (state === 'cc') {
    // étape 1/3 : cylindrée
    if (leftPressed || rightPressed) {
      ccSel = (ccSel + (rightPressed ? 1 : CC_CLASSES.length - 1)) % CC_CLASSES.length;
      beep(480, 0.06, 'square');
    }
    if (itemPressed) { state = 'title'; beep(360, 0.08, 'square'); }
    else if (startPressed) { ccMul = CC_CLASSES[ccSel].mul; state = 'char'; beep(560, 0.08, 'square'); }
  } else if (state === 'char') {
    // étape 2/4 : choix du véhicule (gros plan MK) — un seul paramètre
    if (leftPressed) uiQueue.push({ t: 'veh', d: -1 });
    if (rightPressed) uiQueue.push({ t: 'veh', d: 1 });
    if (karts.length === 0) resetRace(menuChar);
    if (itemPressed) { state = 'cc'; beep(360, 0.08, 'square'); }
    else if (startPressed) { state = 'color'; beep(560, 0.08, 'square'); }
  } else if (state === 'color') {
    // étape 3/4 : couleur du véhicule
    if (leftPressed) uiQueue.push({ t: 'col', d: -1 });
    if (rightPressed) uiQueue.push({ t: 'col', d: 1 });
    if (karts.length === 0) resetRace(menuChar);
    if (itemPressed) { state = 'char'; beep(360, 0.08, 'square'); }
    else if (startPressed) { state = 'map'; beep(560, 0.08, 'square'); }
  } else if (state === 'map') {
    // étape 3/3 : circuit (survol 3D en direct + vignettes)
    let changed = false;
    if (leftPressed) { mapSel = (mapSel + MAPS.length - 1) % MAPS.length; changed = true; }
    if (rightPressed) { mapSel = (mapSel + 1) % MAPS.length; changed = true; }
    if (changed) {
      buildTrack(mapSel);
      resetRace(menuChar);
      beep(480, 0.06, 'square');
    }
    if (itemPressed) { state = 'color'; beep(360, 0.08, 'square'); }
    else if (startPressed) {
      resetRace(menuChar);
      state = 'countdown';
      countdownT = 0; lastBeep = -1;
      tryFullscreen();
      const ib = document.getElementById('install-banner');
      if (ib) ib.hidden = true; // ne jamais gêner la course
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
      pendingRecord = { time: player.finishTime, laps: [...player.lapTimes] };
      nameAsked = false;
      newRecordRank = -1;
      spawnConfetti();
      beep(523, 0.15, 'square'); beep(659, 0.15, 'square');
      setTimeout(() => beep(784, 0.3, 'square', 1046), 180);
    }
  }
  if (state === 'finish') {
    if (finishDelay > 0) finishDelay -= dt;
    else {
      if (pendingRecord && !nameAsked) { nameAsked = true; showNameOverlay(); }
      if (startPressed && !pendingRecord) { state = 'cc'; resetRace(menuChar); }
    }
  }
  if (itemPressed && state === 'race') useItem(player);

  syncKartMeshes(dt);
  updateWorldFX(dt, tSec);
  updateCamera(dt);
  if (USE_POST) composer.render(); else renderer.render(scene, camera);

  const S = Math.min(hud.width / 480, hud.height / HH);
  HW = Math.round(hud.width / S);
  HB = Math.round(hud.height / S);
  OY = Math.max(0, Math.round((HB - HH) / 2));
  hctx.setTransform(S, 0, 0, S, 0, 0);
  hctx.clearRect(0, 0, HW, HB);
  hudRegions = [];
  if (state === 'title') drawTitle();
  else if (state === 'cc') drawCcSelect();
  else if (state === 'char') drawCharSelect();
  else if (state === 'color') drawColorSelect();
  else if (state === 'map') drawMapSelect();
  else {
    drawHUD();
    if (state === 'countdown' || (state === 'race' && countdownT < 3.7)) drawCountdown();
    if (state === 'finish' && finishDelay <= 0) drawFinish();
  }
  if (window.__iamUpdateReady)
    text('✨ Mise à jour prête — appliquée après la course', HW / 2, HB - 14, 9, 'center', '#9fe');

  // cinematic vignette
  const vg = hctx.createRadialGradient(HW / 2, HB / 2, Math.min(HW, HB) * 0.55, HW / 2, HB / 2, Math.max(HW, HB) * 0.82);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(4,4,16,0.38)');
  hctx.fillStyle = vg;
  hctx.fillRect(0, 0, HW, HB);

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
  get hud() { return { HW, HB, OY, S: hud.width / HW }; },
  get vehSel() { return vehSel; },
  get colorSel() { return colorSel; },
  get track() { return track; },
  get center() { return center; },
  get kartMeshes() { return kartMeshes; },
  setVeh(v) { uiQueue.push({ t: 'veh', d: v - vehSel }); },
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
