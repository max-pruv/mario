/* ============================================================
   IAM KART — Inès · Alice · Marlon
   3D WebGL kart racer (Three.js) with glowing sci-fi ships.
   Vanilla JS + Three.js only, all assets generated in code.
   ============================================================ */
import * as THREE from './vendor/three.module.js';

/* ---------------- Constants ---------------- */
const HALFW = 100;              // road half-width (world units)
const N = 512;                  // centerline samples
const LAPS = 3;
const NUM_KARTS = 8;
const WORLDC = 1024;            // track centre (x and z)

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
bindBtn('btnL', 'left'); bindBtn('btnR', 'right'); bindBtn('btnA', 'gas'); bindBtn('btnB', 'item');

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

/* ---------------- Track centerline ---------------- */
const CTRL = [
  [360, 120], [600, 110], [830, 170], [900, 360], [830, 540],
  [660, 600], [560, 720], [660, 850], [520, 930], [330, 880],
  [210, 760], [280, 620], [210, 500], [120, 380], [160, 220],
];
const center = []; // {x, y(=z), dirx, diry, nx, ny, curv}
(function buildCenterline() {
  const M = CTRL.length, per = N / M, pts = [];
  for (let i = 0; i < M; i++) {
    const p0 = CTRL[(i - 1 + M) % M], p1 = CTRL[i], p2 = CTRL[(i + 1) % M], p3 = CTRL[(i + 2) % M];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      pts.push([x * 2, y * 2]);
    }
  }
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    center.push({ x: a[0], y: a[1], dirx: dx, diry: dy, nx: -dy, ny: dx, curv: 0, seglen: l });
  }
  for (let i = 0; i < N; i++) {
    const a = center[i], b = center[(i + 7) % N];
    center[i].curv = Math.abs(angDiff(Math.atan2(a.diry, a.dirx), Math.atan2(b.diry, b.dirx)));
  }
})();
const BOOST_IDX = [Math.floor(N * 0.30), Math.floor(N * 0.63), Math.floor(N * 0.86)];
const BOX_IDX = [Math.floor(N * 0.12), Math.floor(N * 0.48), Math.floor(N * 0.76)];

function idxDist(a, b) { let d = Math.abs(a - b); return Math.min(d, N - d); }

/* ---------------- Three.js setup ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.35;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8a5a78, 900, 3300);

const camera = new THREE.PerspectiveCamera(66, 3 / 2, 1, 5000);

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

/* ---------------- Procedural textures ---------------- */
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

// dusk sky (equirect-ish painted on inside of a sphere)
const skyTex = (() => {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0.0, '#1a2050');
  grad.addColorStop(0.42, '#54308c');
  grad.addColorStop(0.55, '#b04a80');
  grad.addColorStop(0.62, '#ff9a5a');
  grad.addColorStop(0.68, '#c98a7a');
  grad.addColorStop(1.0, '#6a4a5a');
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 512);
  // stars in the upper sky
  let seed = 5;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 220; i++) {
    const y = rnd() * 200;
    g.globalAlpha = 0.25 + rnd() * 0.6 * (1 - y / 210);
    g.fillStyle = '#fff';
    g.fillRect(rnd() * 1024, y, rnd() < 0.2 ? 2 : 1, 1);
  }
  g.globalAlpha = 1;
  // sun glow
  const sg = g.createRadialGradient(260, 322, 4, 260, 322, 90);
  sg.addColorStop(0, 'rgba(255,240,200,1)');
  sg.addColorStop(0.2, 'rgba(255,190,120,0.8)');
  sg.addColorStop(1, 'rgba(255,150,90,0)');
  g.fillStyle = sg; g.beginPath(); g.arc(260, 322, 90, 0, TAU); g.fill();
  // distant mountains
  g.fillStyle = '#3a2a55';
  for (let x = 0; x < 1024; x += 4) {
    const h = 26 + Math.sin(x * 0.014) * 14 + Math.sin(x * 0.041 + 2) * 8;
    g.fillRect(x, 340 - h, 4, h + 20);
  }
  g.fillStyle = '#2a1e40';
  for (let x = 0; x < 1024; x += 4) {
    const h = 14 + Math.sin(x * 0.021 + 5) * 9 + Math.sin(x * 0.057) * 5;
    g.fillRect(x, 348 - h, 4, h + 30);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
})();
{
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false, depthWrite: false });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(3800, 32, 24, 0, TAU, 0, Math.PI * 0.62), skyMat);
  sky.position.set(WORLDC, -80, WORLDC);
  scene.add(sky);
}

const grassTex = canvasTexture(256, (g) => {
  g.fillStyle = '#3f7a3f'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = ['#356a35', '#48884a', '#4c8e4c', '#316231'][i % 4];
    g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(30,80,30,0.35)';
    g.beginPath(); g.arc(Math.random() * 256, Math.random() * 256, 5 + Math.random() * 16, 0, TAU); g.fill();
  }
}, true);
grassTex.repeat.set(60, 60);

const roadTex = canvasTexture(256, (g) => {
  g.fillStyle = '#4a4a54'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1400; i++) {
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.12)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // edge lines
  g.fillStyle = '#e8e8ea';
  g.fillRect(6, 0, 7, 256);
  g.fillRect(243, 0, 7, 256);
  // dashed center line
  g.fillStyle = '#ffd24a';
  g.fillRect(124, 10, 8, 100);
  g.fillRect(124, 146, 8, 100);
}, true);

const curbTex = canvasTexture(64, (g) => {
  g.fillStyle = '#e03030'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#f2f2f2'; g.fillRect(0, 32, 64, 32);
}, true);

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
const GLOWS = [glowCyan, glowMagenta, glowOrange, glowLime];

/* ---------------- Ground ---------------- */
{
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(3800, 48),
    new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLDC, -0.1, WORLDC);
  ground.receiveShadow = true;
  scene.add(ground);
}

/* ---------------- Road, curbs, neon ---------------- */
function ribbon(halfInner, halfOuter, y, vScale) {
  // two ribbons (left & right) if halfInner > 0, else single centered ribbon
  const pos = [], uv = [], idx = [], normal = [];
  let v = 0, vertBase = 0;
  const sides = halfInner > 0 ? [-1, 1] : [0];
  for (const side of sides) {
    for (let i = 0; i <= N; i++) {
      const c = center[i % N];
      if (i > 0) v += center[(i - 1) % N].seglen / vScale;
      else v = 0;
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

const road = new THREE.Mesh(
  ribbon(0, HALFW, 0.05, 220),
  new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.92, side: THREE.DoubleSide })
);
road.receiveShadow = true;
scene.add(road);

const curbs = new THREE.Mesh(
  ribbon(HALFW, HALFW + 10, 0.12, 18),
  new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.85, side: THREE.DoubleSide })
);
curbs.receiveShadow = true;
scene.add(curbs);

const neonMat = new THREE.MeshBasicMaterial({
  color: 0x40e0ff, transparent: true, opacity: 0.85,
  blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false,
});
const neon = new THREE.Mesh(ribbon(HALFW + 11, HALFW + 15, 0.18, 100), neonMat);
scene.add(neon);

// start line
{
  const checkTex = canvasTexture(64, (g) => {
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++)
        { g.fillStyle = (x + y) % 2 ? '#101010' : '#f5f5f5'; g.fillRect(x * 8, y * 8, 8, 8); }
  }, true);
  checkTex.repeat.set(6, 1);
  const c = center[0];
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(HALFW * 2, 34),
    new THREE.MeshStandardMaterial({ map: checkTex, roughness: 0.8 })
  );
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = -Math.atan2(c.diry, c.dirx) + Math.PI / 2;
  m.position.set(c.x, 0.1, c.y);
  m.receiveShadow = true;
  scene.add(m);
}

/* ---------------- Start gate ---------------- */
const gateLights = [];
{
  const c = center[0];
  const gate = new THREE.Group();
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x30304a, roughness: 0.5, metalness: 0.6 });
  for (const side of [-1, 1]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 110, 10), pillarMat);
    p.position.set(side * (HALFW + 22), 55, 0);
    p.castShadow = true;
    gate.add(p);
  }
  const bannerTex = canvasTexture(512, (g) => {
    g.fillStyle = '#181830'; g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#40e0ff'; g.fillRect(0, 165, 512, 6);
    g.fillStyle = '#ff50dc'; g.fillRect(0, 341, 512, 6);
    g.font = 'bold 82px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#ffffff';
    g.fillText('IAM KART', 256, 256);
  });
  bannerTex.repeat.set(1, 0.28); bannerTex.offset.set(0, 0.36);
  bannerTex.wrapS = bannerTex.wrapT = THREE.ClampToEdgeWrapping;
  const banner = new THREE.Mesh(
    new THREE.BoxGeometry(HALFW * 2 + 60, 26, 8),
    new THREE.MeshStandardMaterial({ map: bannerTex, roughness: 0.4, emissive: 0x222244 })
  );
  banner.position.set(0, 108, 0);
  gate.add(banner);
  for (let i = 0; i < 3; i++) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(5, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x110000 })
    );
    lamp.position.set((i - 1) * 26, 88, 3);
    gate.add(lamp);
    gateLights.push(lamp);
  }
  gate.position.set(c.x, 0, c.y);
  gate.rotation.y = -Math.atan2(c.diry, c.dirx) + Math.PI / 2;
  scene.add(gate);
}

/* ---------------- Boost pads ---------------- */
const boostPads = [];
{
  const padTex = canvasTexture(128, (g) => {
    g.fillStyle = '#7a3c00'; g.fillRect(0, 0, 128, 128);
    g.fillStyle = '#ffb020';
    for (const oy of [8, 72]) {
      g.beginPath();
      g.moveTo(14, oy); g.lineTo(114, oy + 24); g.lineTo(14, oy + 48);
      g.lineTo(14, oy + 34); g.lineTo(84, oy + 24); g.lineTo(14, oy + 14);
      g.closePath(); g.fill();
    }
  }, true);
  for (const bi of BOOST_IDX) {
    const c = center[bi];
    const tex = padTex.clone();
    tex.needsUpdate = true;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(64, HALFW * 1.4),
      new THREE.MeshBasicMaterial({ map: tex, transparent: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = -Math.atan2(c.diry, c.dirx);
    m.position.set(c.x, 0.15, c.y);
    scene.add(m);
    boostPads.push({ tex });
  }
}

/* ---------------- Item boxes ---------------- */
const itemBoxes = [];
{
  for (const bi of BOX_IDX) {
    const c = center[bi];
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
      scene.add(mesh);
      itemBoxes.push({ x: mesh.position.x, y: mesh.position.z, respawn: 0, mesh });
    }
  }
}

/* ---------------- Trees (instanced) ---------------- */
(function plantTrees() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const spots = [];
  for (let i = 0; i < N; i += 6) {
    const c = center[i];
    const side = rnd() < 0.5 ? -1 : 1;
    const off = HALFW + 90 + rnd() * 420;
    const x = c.x + c.nx * side * off;
    const z = c.y + c.ny * side * off;
    let ok = true;
    for (let j = 0; j < N; j += 4) {
      const cc = center[j];
      if ((cc.x - x) ** 2 + (cc.y - z) ** 2 < (HALFW + 55) ** 2) { ok = false; break; }
    }
    if (ok) spots.push({ x, z, s: 0.7 + rnd() * 0.9, pine: spots.length % 2 === 0 });
  }
  const trunkGeo = new THREE.CylinderGeometry(3, 4.5, 30, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6a4520, roughness: 1 });
  const pineGeo = new THREE.ConeGeometry(22, 60, 8);
  const pineMat = new THREE.MeshStandardMaterial({ color: 0x1e5f30, roughness: 1 });
  const roundGeo = new THREE.IcosahedronGeometry(24, 1);
  const roundMat = new THREE.MeshStandardMaterial({ color: 0x2e7a38, roughness: 1, flatShading: true });

  const pines = spots.filter(s => s.pine), rounds = spots.filter(s => !s.pine);
  const mk = (geo, mat, list, yOff) => {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m4 = new THREE.Matrix4();
    list.forEach((s, i) => {
      m4.makeScale(s.s, s.s, s.s);
      m4.setPosition(s.x, yOff * s.s, s.z);
      im.setMatrixAt(i, m4);
    });
    im.castShadow = true;
    scene.add(im);
  };
  mk(trunkGeo, trunkMat, spots, 15);
  mk(pineGeo, pineMat, pines, 55);
  mk(roundGeo, roundMat, rounds, 46);
})();

/* ---------------- Karts (3D models) ---------------- */
function buildKartMesh(charIdx) {
  const ch = CHARACTERS[charIdx];
  const color = new THREE.Color(ch.color);
  const g = new THREE.Group();          // yaw applied here
  const chassis = new THREE.Group();    // tilt applied here
  g.add(chassis);

  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.25 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x181820, roughness: 0.6, metalness: 0.4 });

  // main body (nose toward +X)
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
  // cockpit rim
  const rim = new THREE.Mesh(new THREE.TorusGeometry(6.5, 1.6, 8, 16), darkMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-2, 10.5, 0);
  chassis.add(rim);
  // spoiler
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 18), bodyMat);
  spoiler.position.set(-16, 13, 0);
  chassis.add(spoiler);
  for (const sz of [-6, 6]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(2.5, 6, 2), darkMat);
    strut.position.set(-15, 9.5, sz);
    chassis.add(strut);
  }
  // driver
  const skin = new THREE.MeshStandardMaterial({ color: 0xf2c9a0, roughness: 0.8 });
  const helmetMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(ch.helmet), roughness: 0.25, metalness: 0.15 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(4.5, 5, 4, 8), bodyMat);
  torso.position.set(-3, 13, 0);
  torso.castShadow = true;
  chassis.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(4.6, 14, 12), helmetMat);
  head.position.set(-3, 20, 0);
  head.castShadow = true;
  chassis.add(head);
  const visor = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 8, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.1, metalness: 0.6 }));
  visor.rotation.y = Math.PI / 2;
  visor.position.set(0.4, 19.6, 0);
  visor.scale.set(1.15, 0.8, 1.1);
  chassis.add(visor);

  // wheels
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

  // boost flame (hidden unless boosting)
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowOrange, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
  }));
  flame.position.set(-20, 7, 0);
  flame.scale.set(26, 26, 1);
  flame.visible = false;
  g.add(flame);

  // drift sparks
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
  scene.add(g);
  return { group: g, chassis, wheels, flame, sparks };
}
const kartMeshes = CHARACTERS.map((_, i) => buildKartMesh(i));

/* ---------------- Bananas ---------------- */
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

/* ---------------- Glowing ships & planes ---------------- */
const ships = [];
function buildShip(type, colorHex, glowTex) {
  const g = new THREE.Group();
  const color = new THREE.Color(colorHex);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x202030, roughness: 0.35, metalness: 0.8, emissive: color, emissiveIntensity: 0.25 });
  const neonMat2 = new THREE.MeshBasicMaterial({ color });

  if (type === 0) { // starfighter with X wings
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
  } else if (type === 1) { // saucer
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(24, 30, 7, 20), bodyMat);
    g.add(disc);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(12, 14, 10, 0, TAU, 0, Math.PI / 2), neonMat2);
    dome.position.y = 3;
    g.add(dome);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(27, 2, 8, 24), neonMat2);
    ring.rotation.x = Math.PI / 2;
    g.add(ring);
  } else if (type === 2) { // neon donut
    const donut = new THREE.Mesh(new THREE.TorusGeometry(20, 7, 10, 22), bodyMat);
    g.add(donut);
    const core = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), neonMat2);
    g.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(20, 1.6, 6, 22), neonMat2);
    g.add(ring);
  } else { // retro rocket
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
  // engine glow + halo
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
  // trail ghosts
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

// cartoon planes with contrails
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

/* ---------------- Game state ---------------- */
function makeKart(charIdx, isPlayer, gridPos) {
  return {
    charIdx, isPlayer,
    x: 0, y: 0, angle: 0, speed: 0,
    trackIdx: 0, lap: 0, key: 0,
    boostT: 0, spinT: 0, spinAng: 0,
    item: null, itemDelay: 0,
    driftCharge: 0, driftDir: 0,
    offroadT: 0, finishTime: 0, place: gridPos + 1,
    aiSkill: 0.87 + (gridPos % 7) * 0.017,
    laneSeed: gridPos * 1.7,
    steerVis: 0, wheelSpin: 0,
  };
}

let karts = [], player = null, bananas = [];
let state = 'menu';
let menuChar = 0;
let countdownT = 0, raceTime = 0, finishDelay = 0;
let camAngle = 0;
let lastBeep = -1;
let prevStart = false, prevLeft = false, prevRight = false, prevItem = false;

function resetRace(playerChar) {
  for (const b of bananas) scene.remove(b.mesh);
  bananas = [];
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
  for (const b of itemBoxes) { b.respawn = 0; b.mesh.visible = true; }
  camAngle = player.angle;
  raceTime = 0;
}

/* ---------------- Physics & AI (2D logic on xz plane) ---------------- */
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

function giveItem(k) {
  const r = Math.random();
  k.item = r < 0.45 ? 'mushroom' : r < 0.8 ? 'banana' : 'bolt';
  if (k.isPlayer) beep(880, 0.12, 'square', 1320);
  else k.itemDelay = 1 + Math.random() * 3.5;
}

function useItem(k) {
  if (!k.item) return;
  if (k.item === 'mushroom') {
    k.boostT = Math.max(k.boostT, 1.4);
    if (k.isPlayer) beep(300, 0.35, 'sawtooth', 900, 0.15);
  } else if (k.item === 'banana') {
    const mesh = bananaProto.clone();
    mesh.position.set(k.x - Math.cos(k.angle) * 55, 0, k.y - Math.sin(k.angle) * 55);
    scene.add(mesh);
    bananas.push({ x: mesh.position.x, y: mesh.position.z, mesh });
    if (k.isPlayer) beep(500, 0.08, 'square');
  } else if (k.item === 'bolt') {
    for (const o of karts)
      if (o !== k && o.key > k.key && o.spinT <= 0) { o.spinT = 1.1; o.speed *= 0.35; }
    beep(1200, 0.5, 'sawtooth', 200, 0.18);
  }
  k.item = null;
}

function spinKart(k) {
  if (k.spinT > 0 || k.boostT > 0.8) return;
  k.spinT = 1.0;
  k.speed *= 0.3;
  if (k.isPlayer) beep(700, 0.4, 'square', 120, 0.15);
}

function lateralOffset(k, c) {
  return (k.x - c.x) * c.nx + (k.y - c.y) * c.ny;
}

function updateKart(k, dt) {
  const ci = center[k.trackIdx];
  const lat = Math.abs(lateralOffset(k, ci));
  const offroad = lat > HALFW + 12;

  let throttle = 0, steer = 0;

  if (state === 'race' || (state === 'finish' && !k.isPlayer) || (k.lap > LAPS)) {
    if (k.isPlayer && k.lap <= LAPS && state === 'race') {
      throttle = input.gas ? 1 : 0;
      if (input.brake) throttle = -1;
      steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    } else {
      const look = (k.trackIdx + 14 + ((k.speed / MAXSPEED) * 14) | 0) % N;
      const c = center[look];
      const lane = Math.sin(raceTime * 0.35 + k.laneSeed) * 28;
      const tx = c.x + c.nx * lane, ty = c.y + c.ny * lane;
      const want = Math.atan2(ty - k.y, tx - k.x);
      const diff = angDiff(k.angle, want);
      steer = clamp(diff * 3.2, -1, 1);
      const curvAhead = center[(k.trackIdx + 26) % N].curv;
      let target = MAXSPEED * k.aiSkill * clamp(1.18 - curvAhead * 1.9, 0.5, 1);
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

  if (k.spinT > 0) {
    k.spinT -= dt;
    k.spinAng += dt * 12;
    throttle = 0; steer = 0;
  } else k.spinAng = 0;

  const grip = clamp(k.speed / 70, 0, 1);
  k.angle += steer * TURNRATE * grip * dt;
  k.steerVis = lerp(k.steerVis, steer, Math.min(1, dt * 10));

  if (k.isPlayer) {
    if (steer !== 0 && k.speed > MAXSPEED * 0.72 && (k.driftDir === 0 || k.driftDir === steer)) {
      k.driftDir = steer;
      k.driftCharge += dt;
    } else {
      if (k.driftCharge > 1.05) { k.boostT = Math.max(k.boostT, 0.55); beep(200, 0.25, 'sawtooth', 700, 0.12); }
      k.driftCharge = 0; k.driftDir = 0;
    }
  }

  if (throttle > 0) k.speed += ACCEL * dt;
  else if (throttle < 0) k.speed -= 260 * dt;
  const drag = DRAG + (offroad ? OFFDRAG : 0);
  k.speed -= k.speed * drag * dt;
  if (k.boostT > 0) {
    k.boostT -= dt;
    k.speed = Math.max(k.speed, lerp(k.speed, BOOSTSPEED, 0.25));
  }
  // boost pads
  if (k.boostT <= 0 && lat < HALFW * 0.7) {
    for (const bi of BOOST_IDX)
      if (idxDist(k.trackIdx, bi) <= 3) {
        k.boostT = 0.9;
        if (k.isPlayer) beep(240, 0.3, 'sawtooth', 800, 0.13);
        break;
      }
  }
  k.speed = clamp(k.speed, 0, BOOSTSPEED);
  k.wheelSpin += k.speed * dt / 5.5;

  k.x += Math.cos(k.angle) * k.speed * dt;
  k.y += Math.sin(k.angle) * k.speed * dt;

  const ni = nearestIdx(k);
  if (k.trackIdx > N - 30 && ni < 30) { k.lap++; if (k.isPlayer && k.lap <= LAPS && k.lap > 1) beep(660, 0.15, 'square', 990); }
  else if (k.trackIdx < 30 && ni > N - 30) k.lap--;
  k.trackIdx = ni;
  k.key = k.lap * N + ni;
  if (k.lap > LAPS && !k.finishTime) k.finishTime = raceTime;

  // rescue
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

  // bananas
  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i];
    if ((b.x - k.x) ** 2 + (b.y - k.y) ** 2 < 28 * 28) {
      scene.remove(b.mesh);
      bananas.splice(i, 1);
      spinKart(k);
    }
  }
  // item boxes
  for (const box of itemBoxes) {
    if (box.respawn > 0) continue;
    if ((box.x - k.x) ** 2 + (box.y - k.y) ** 2 < 32 * 32) {
      box.respawn = 3;
      if (!k.item) giveItem(k);
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
      }
    }
}

function updatePlaces() {
  const sorted = [...karts].sort((a, b) => b.key - a.key);
  sorted.forEach((k, i) => k.place = i + 1);
}

/* ---------------- Sync 3D meshes ---------------- */
function syncKartMeshes(dt) {
  for (const k of karts) {
    const m = kartMeshes[k.charIdx];
    m.group.visible = true;
    m.group.position.set(k.x, 0, k.y);
    m.group.rotation.y = -(k.angle + k.spinAng);
    m.chassis.rotation.x = k.steerVis * 0.10;               // roll into turns (about forward axis = x)
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
    const drifting = k.isPlayer && k.driftCharge > 1.05;
    for (const sp of m.sparks) sp.visible = drifting;
  }
  // hide meshes of characters not racing
  const active = new Set(karts.map(k => k.charIdx));
  kartMeshes.forEach((m, i) => { if (!active.has(i)) m.group.visible = false; });
}

function updateWorldFX(dt, t) {
  // neon pulse
  neonMat.opacity = 0.6 + Math.sin(t * 2.2) * 0.25;
  // boost pad scroll
  for (const p of boostPads) p.tex.offset.y = (p.tex.offset.y - dt * 1.6) % 1;
  // item boxes
  for (const b of itemBoxes) {
    if (b.respawn > 0) { b.respawn -= dt; b.mesh.visible = false; }
    else b.mesh.visible = true;
    b.mesh.rotation.y += dt * 1.5;
    b.mesh.rotation.x += dt * 0.9;
    const hue = (t * 0.15 + b.x * 0.001) % 1;
    b.mesh.material.color.setHSL(hue, 0.8, 0.6);
    b.mesh.material.emissive.setHSL(hue, 0.9, 0.35);
  }
  // ships
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
    // trail ghosts
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
  // planes
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
  // gate lights
  if (state === 'countdown') {
    const n = Math.ceil(3 - countdownT);
    gateLights.forEach((l, i) => {
      const on = 3 - n >= i + 1 || n <= 0;
      l.material.emissive.setHex(n <= 0 ? 0x00cc30 : on ? 0xcc2000 : 0x110000);
      l.material.color.setHex(n <= 0 ? 0x00ff40 : on ? 0xff3020 : 0x330000);
    });
  } else if (state === 'race') {
    gateLights.forEach(l => { l.material.emissive.setHex(0x00cc30); l.material.color.setHex(0x00ff40); });
  } else {
    gateLights.forEach(l => { l.material.emissive.setHex(0x110000); l.material.color.setHex(0x330000); });
  }
}

/* ---------------- Camera ---------------- */
function updateCamera(dt) {
  if (state === 'menu') {
    const t = perfNow * 0.0003;
    const c = center[(N - 20) % N];
    const cx = c.x, cz = c.y;
    camera.position.set(cx + Math.cos(t) * 130, 55 + Math.sin(t * 0.7) * 12, cz + Math.sin(t) * 130);
    camera.lookAt(cx, 18, cz);
  } else {
    camAngle += angDiff(camAngle, player.angle) * Math.min(1, dt * 7);
    const fx = Math.cos(camAngle), fz = Math.sin(camAngle);
    camera.position.set(player.x - fx * CAMBACK, CAMH, player.y - fz * CAMBACK);
    camera.lookAt(player.x + fx * 70, 22, player.y + fz * 70);
    camera.fov = lerp(camera.fov, player.boostT > 0 ? 74 : 66, Math.min(1, dt * 5));
    camera.updateProjectionMatrix();
  }
  // shadow frustum follows player (or menu focus)
  const fx2 = state === 'menu' ? center[(N - 20) % N].x : player.x;
  const fz2 = state === 'menu' ? center[(N - 20) % N].y : player.y;
  sun.position.set(fx2 + 300, 500, fz2 + 120);
  sun.target.position.set(fx2, 0, fz2);
}

/* ---------------- HUD (2D overlay) ---------------- */
const hud = document.getElementById('hud');
const hctx = hud.getContext('2d');
const PLACE_TXT = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const PLACE_COL = ['#ffd700', '#c0c0c0', '#cd7f32', '#fff', '#fff', '#fff', '#fff', '#fff'];
const HW = 480, HH = 320; // logical HUD space

const miniCanvas = document.createElement('canvas');
miniCanvas.width = miniCanvas.height = 84;
(function buildMini() {
  const g = miniCanvas.getContext('2d');
  g.fillStyle = 'rgba(10,10,30,0.7)';
  g.fillRect(0, 0, 84, 84);
  g.strokeStyle = '#e8e8e8'; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(center[0].x / 2048 * 84, center[0].y / 2048 * 84);
  for (let i = 1; i < N; i += 4) g.lineTo(center[i].x / 2048 * 84, center[i].y / 2048 * 84);
  g.closePath(); g.stroke();
})();

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
  }
  hctx.restore();
}

function drawHUD() {
  text(PLACE_TXT[player.place - 1], 10, 8, 26, 'left', PLACE_COL[player.place - 1]);
  text(`LAP ${clamp(player.lap, 1, LAPS)}/${LAPS}`, HW - 10, 8, 16, 'right');
  text(fmtTime(raceTime), HW - 10, 28, 12, 'right', '#cfe');
  hctx.fillStyle = 'rgba(0,0,20,0.45)';
  hctx.strokeStyle = 'rgba(255,255,255,0.7)';
  hctx.lineWidth = 2;
  hctx.beginPath(); hctx.roundRect(HW / 2 - 18, 6, 36, 36, 6); hctx.fill(); hctx.stroke();
  if (player.item) drawItemIcon(HW / 2, 24, player.item, 1.4);
  hctx.globalAlpha = 0.9;
  hctx.drawImage(miniCanvas, HW - 94, HH - 94);
  for (const k of karts) {
    hctx.fillStyle = k.isPlayer ? '#fff' : CHARACTERS[k.charIdx].color;
    const mx = HW - 94 + k.x / 2048 * 84, my = HH - 94 + k.y / 2048 * 84;
    hctx.beginPath(); hctx.arc(mx, my, k.isPlayer ? 3 : 2.2, 0, TAU); hctx.fill();
  }
  hctx.globalAlpha = 1;
}

function drawMenu() {
  hctx.fillStyle = 'rgba(8,5,25,0.35)';
  hctx.fillRect(0, 0, HW, HH);
  text('IAM KART', HW / 2, 26, 54, 'center', '#40e0ff');
  text('Inès · Alice · Marlon', HW / 2, 84, 16, 'center', '#ff50dc');
  text('Kart racing 3D — vaisseaux lumineux inclus', HW / 2, 110, 11, 'center', '#cfe');

  const ch = CHARACTERS[menuChar];
  text('◀', HW / 2 - 100, 168, 26, 'center', '#fff');
  text('▶', HW / 2 + 100, 168, 26, 'center', '#fff');
  text(ch.name, HW / 2, 172, 22, 'center', ch.color);

  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR JOUER', HW / 2, 250, 15, 'center', '#fff');
  text('← → diriger · A/↑ gaz · B/Shift objet', HW / 2, 292, 10, 'center', '#9ab');
}

function drawCountdown() {
  const n = Math.ceil(3 - countdownT);
  if (n !== lastBeep && n > 0) { beep(440, 0.15, 'square'); lastBeep = n; }
  if (n > 0) text(String(n), HW / 2, 100, 80, 'center', '#ffd21f');
  else {
    if (lastBeep !== 0) { beep(880, 0.4, 'square'); lastBeep = 0; }
    if (countdownT < 3.7) text('GO!', HW / 2, 100, 80, 'center', '#40e060');
  }
}

function drawFinish() {
  hctx.fillStyle = 'rgba(5,5,25,0.7)';
  hctx.fillRect(0, 0, HW, HH);
  text('COURSE TERMINÉE !', HW / 2, 16, 24, 'center', '#ffd21f');
  const sorted = [...karts].sort((a, b) => {
    if (a.finishTime && b.finishTime) return a.finishTime - b.finishTime;
    if (a.finishTime) return -1;
    if (b.finishTime) return 1;
    return b.key - a.key;
  });
  sorted.forEach((k, i) => {
    const ch = CHARACTERS[k.charIdx];
    const y = 54 + i * 24;
    text(PLACE_TXT[i], HW / 2 - 130, y, 15, 'left', PLACE_COL[i]);
    text(ch.name + (k.isPlayer ? '  ★' : ''), HW / 2 - 70, y, 15, 'left', k.isPlayer ? '#fff' : ch.color);
    if (k.finishTime) text(fmtTime(k.finishTime), HW / 2 + 130, y, 13, 'right', '#cfe');
  });
  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR REJOUER', HW / 2, HH - 24, 13, 'center', '#fff');
}

/* ---------------- Resize ---------------- */
function resize() {
  const r = glCanvas.getBoundingClientRect();
  if (r.width === 0) return;
  renderer.setSize(r.width, r.height, false);
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
  const leftPressed = input.left && !prevLeft;
  const rightPressed = input.right && !prevRight;
  const itemPressed = input.item && !prevItem;
  prevStart = input.start; prevLeft = input.left; prevRight = input.right; prevItem = input.item;

  // apply a pending app update as soon as we're not mid-race
  if (window.__iamUpdateReady && state !== 'race' && state !== 'countdown') {
    window.__iamUpdateReady = false;
    location.reload();
    return;
  }

  if (state === 'menu') {
    if (leftPressed) menuChar = (menuChar + CHARACTERS.length - 1) % CHARACTERS.length;
    if (rightPressed) menuChar = (menuChar + 1) % CHARACTERS.length;
    if (karts.length === 0 || karts[0].charIdx !== menuChar) resetRace(menuChar);
    if (startPressed) {
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
    for (const k of karts) updateKart(k, dt);
    kartCollisions();
    updatePlaces();
    if (state === 'race' && player.lap > LAPS) {
      finishDelay = 1.4;
      state = 'finish';
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
  renderer.render(scene, camera);

  // HUD overlay
  const S = hud.width / HW;
  hctx.setTransform(S, 0, 0, S, 0, 0);
  hctx.clearRect(0, 0, HW, HH);
  if (state === 'menu') drawMenu();
  else {
    drawHUD();
    if (state === 'countdown' || (state === 'race' && countdownT < 3.7)) drawCountdown();
    if (state === 'finish' && finishDelay <= 0) drawFinish();
  }
  if (window.__iamUpdateReady)
    text('✨ Mise à jour prête — appliquée après la course', HW / 2, HH - 14, 9, 'center', '#9fe');

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

resetRace(0);
requestAnimationFrame(frame);

/* ---------------- Debug handle (used by automated tests) ---------------- */
window.IAM = {
  get state() { return state; },
  get raceTime() { return raceTime; },
  get karts() { return karts; },
  get player() { return player; },
  CHARACTERS,
  makePlayerAI() { if (player) player.isPlayer = false; },
};
