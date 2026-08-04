/* ============================================================
   KART DASH — retro Mode-7 kart racer
   Vanilla JS, no dependencies, original artwork drawn in code.
   ============================================================ */
'use strict';

/* ---------------- Constants ---------------- */
const W = 480, H = 320;            // internal resolution
const HORIZON = 108;               // sky/ground split (px)
const FOCAL = 300;                 // projection focal length
const CAMH = 40;                   // camera height (world units)
const CAMBACK = 80;                // camera distance behind player
const TEX = 1024;                  // track texture size (texels)
const WORLD = TEX * 2;             // world size (units) — 1 texel = 2 units
const N = 512;                     // centerline samples
const DRAWDIST = 1700;             // ground draw distance
const LAPS = 3;
const NUM_KARTS = 8;

const MAXSPEED = 260, ACCEL = 190, DRAG = 0.72, OFFDRAG = 2.6;
const BOOSTSPEED = 355, TURNRATE = 2.15;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function angDiff(a, b) { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; }

const CHARACTERS = [
  { name: 'REX',    color: '#e03434', helmet: '#ffffff' },
  { name: 'ZIP',    color: '#3060f0', helmet: '#ffe040' },
  { name: 'COCO',   color: '#20a828', helmet: '#ffffff' },
  { name: 'NOVA',   color: '#f0c020', helmet: '#202020' },
  { name: 'BLAZE',  color: '#f07818', helmet: '#ffffff' },
  { name: 'VIOLET', color: '#9040e0', helmet: '#ffe040' },
  { name: 'MINT',   color: '#18c0b0', helmet: '#ffffff' },
  { name: 'ROSA',   color: '#f060a8', helmet: '#ffffff' },
];

/* ---------------- Canvas ---------------- */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// roundRect polyfill (older mobile browsers)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.arcTo(x + w, y, x + w, y + h, r[1]);
    this.arcTo(x + w, y + h, x, y + h, r[2]);
    this.arcTo(x, y + h, x, y, r[3]);
    this.arcTo(x, y, x + w, y, r[0]);
    this.closePath();
    return this;
  };
}

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
  const k = KEYMAP[e.code];
  if (k) { input[k] = true; e.preventDefault(); unlockAudio(); }
});
addEventListener('keyup', e => {
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
bindBtn('btnL', 'left');
bindBtn('btnR', 'right');
bindBtn('btnA', 'gas');
bindBtn('btnB', 'item');

canvas.addEventListener('pointerdown', () => { input.start = true; unlockAudio(); });
canvas.addEventListener('pointerup', () => { input.start = false; });

/* ---------------- Audio (WebAudio, all synthesized) ---------------- */
let AC = null, engineOsc = null, engineGain = null, engineFilter = null;
let muted = false;

function unlockAudio() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = AC.createOscillator();
    engineOsc.type = 'sawtooth';
    engineFilter = AC.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    engineGain = AC.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(AC.destination);
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
  o.start();
  o.stop(AC.currentTime + dur + 0.02);
}

function updateEngine(speed, racing) {
  if (!AC || !engineGain) return;
  const target = (racing && !muted) ? 0.045 : 0;
  engineGain.gain.setTargetAtTime(target, AC.currentTime, 0.1);
  engineOsc.frequency.setTargetAtTime(55 + speed * 0.55, AC.currentTime, 0.05);
}

/* ---------------- Track building ---------------- */
// Control points in texel space (texture is 1024x1024)
const CTRL = [
  [360, 120], [600, 110], [830, 170], [900, 360], [830, 540],
  [660, 600], [560, 720], [660, 850], [520, 930], [330, 880],
  [210, 760], [280, 620], [210, 500], [120, 380], [160, 220],
];
const HALFW = 50; // road half-width in texels (=100 world units)

// Catmull-Rom sampling of the closed loop -> centerline in WORLD units
const center = [];   // {x, y, dirx, diry, nx, ny, curv}
(function buildCenterline() {
  const M = CTRL.length;
  const pts = [];
  const per = N / M;
  for (let i = 0; i < M; i++) {
    const p0 = CTRL[(i - 1 + M) % M], p1 = CTRL[i], p2 = CTRL[(i + 1) % M], p3 = CTRL[(i + 2) % M];
    for (let j = 0; j < per; j++) {
      const t = j / per, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      pts.push([x * 2, y * 2]); // texel -> world
    }
  }
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N];
    let dx = b[0] - a[0], dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    dx /= l; dy /= l;
    center.push({ x: a[0], y: a[1], dirx: dx, diry: dy, nx: -dy, ny: dx, curv: 0 });
  }
  for (let i = 0; i < N; i++) {
    const a = center[i], b = center[(i + 7) % N];
    center[i].curv = Math.abs(angDiff(Math.atan2(a.diry, a.dirx), Math.atan2(b.diry, b.dirx)));
  }
})();

const BOOST_IDX = [Math.floor(N * 0.30), Math.floor(N * 0.63), Math.floor(N * 0.86)];
const BOX_IDX = [Math.floor(N * 0.12), Math.floor(N * 0.48), Math.floor(N * 0.76)];

// --- texture + surface map ---
const texCanvas = document.createElement('canvas');
texCanvas.width = texCanvas.height = TEX;
const surf = new Uint8Array(TEX * TEX); // 0 grass, 1 road, 2 boost
let tex32 = null;

(function buildTexture() {
  const t = texCanvas.getContext('2d');
  const s = document.createElement('canvas');
  s.width = s.height = TEX;
  const sc = s.getContext('2d');

  // grass: two-tone checker (wraps cleanly, 64px period)
  for (let y = 0; y < TEX; y += 64)
    for (let x = 0; x < TEX; x += 64) {
      t.fillStyle = ((x + y) / 64) % 2 ? '#3d9e3d' : '#37933a';
      t.fillRect(x, y, 64, 64);
    }
  // random darker patches + flowers
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * TEX, y = Math.random() * TEX, r = 4 + Math.random() * 14;
    t.fillStyle = 'rgba(30,110,35,0.5)';
    t.beginPath(); t.arc(x, y, r, 0, TAU); t.fill();
  }
  for (let i = 0; i < 120; i++) {
    t.fillStyle = ['#ffe95e', '#ff8ac2', '#ffffff'][i % 3];
    t.fillRect(Math.random() * TEX, Math.random() * TEX, 3, 3);
  }
  sc.fillStyle = '#000'; sc.fillRect(0, 0, TEX, TEX);

  // road (drawn on both texture and surface canvases)
  const roadPath = () => {
    const p = new Path2D();
    p.moveTo(center[0].x / 2, center[0].y / 2);
    for (let i = 1; i < N; i++) p.lineTo(center[i].x / 2, center[i].y / 2);
    p.closePath();
    return p;
  };
  const rp = roadPath();
  for (const [c, col, w] of [[t, '#6b6b70', HALFW * 2 + 10], [t, '#57575c', HALFW * 2], [sc, '#ff0000', HALFW * 2]]) {
    c.strokeStyle = col; c.lineWidth = w; c.lineJoin = 'round'; c.lineCap = 'round';
    c.stroke(rp);
  }
  // asphalt speckle
  t.save(); t.clip(rp);
  for (let i = 0; i < 500; i++) {
    t.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.10)';
    t.fillRect(Math.random() * TEX, Math.random() * TEX, 2, 2);
  }
  t.restore();

  // curbs (alternating red/white blocks along the edges)
  for (let i = 0; i < N; i += 2) {
    const c = center[i];
    for (const side of [-1, 1]) {
      const ex = c.x / 2 + c.nx * side * (HALFW + 2);
      const ey = c.y / 2 + c.ny * side * (HALFW + 2);
      t.save();
      t.translate(ex, ey);
      t.rotate(Math.atan2(c.diry, c.dirx));
      t.fillStyle = (i / 2) % 2 ? '#e03030' : '#f2f2f2';
      t.fillRect(-6, -3.5, 12, 7);
      t.restore();
    }
  }

  // start / finish line (checkered band at idx 0)
  {
    const c = center[0];
    t.save();
    t.translate(c.x / 2, c.y / 2);
    t.rotate(Math.atan2(c.diry, c.dirx));
    for (let row = 0; row < 3; row++)
      for (let k = -HALFW; k < HALFW; k += 8)
        { t.fillStyle = ((k / 8 + row) % 2 === 0) ? '#fff' : '#111'; t.fillRect(row * 8 - 12, k, 8, 8); }
    t.restore();
  }

  // boost pads (orange chevrons) — also mark surface
  for (const bi of BOOST_IDX) {
    const c = center[bi];
    const ang = Math.atan2(c.diry, c.dirx);
    for (const cc of [t, sc]) {
      cc.save();
      cc.translate(c.x / 2, c.y / 2);
      cc.rotate(ang);
      if (cc === sc) { cc.fillStyle = '#ffff00'; cc.fillRect(-16, -HALFW * 0.7, 32, HALFW * 1.4); }
      else {
        cc.fillStyle = '#ff9010';
        cc.fillRect(-16, -HALFW * 0.7, 32, HALFW * 1.4);
        cc.fillStyle = '#ffd040';
        for (let k = -1; k <= 1; k++) {
          cc.beginPath();
          cc.moveTo(-10 + k * 10, -HALFW * 0.55);
          cc.lineTo(2 + k * 10, 0);
          cc.lineTo(-10 + k * 10, HALFW * 0.55);
          cc.lineTo(-6 + k * 10, HALFW * 0.55);
          cc.lineTo(6 + k * 10, 0);
          cc.lineTo(-6 + k * 10, -HALFW * 0.55);
          cc.closePath(); cc.fill();
        }
      }
      cc.restore();
    }
  }

  tex32 = new Uint32Array(t.getImageData(0, 0, TEX, TEX).data.buffer);
  const sd = sc.getImageData(0, 0, TEX, TEX).data;
  for (let i = 0; i < TEX * TEX; i++) {
    const r = sd[i * 4], g = sd[i * 4 + 1];
    surf[i] = r > 128 ? (g > 128 ? 2 : 1) : 0;
  }
})();

function surfAt(wx, wy) {
  const xi = ((wx * 0.5) | 0) & (TEX - 1);
  const yi = ((wy * 0.5) | 0) & (TEX - 1);
  return surf[yi * TEX + xi];
}

/* ---------------- Decorations (trees) ---------------- */
function makeTreeSprite(kind) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 84;
  const g = c.getContext('2d');
  if (kind === 0) { // round tree
    g.fillStyle = '#7a4a20'; g.fillRect(28, 52, 8, 30);
    g.fillStyle = '#1c7a28'; g.beginPath(); g.arc(32, 34, 26, 0, TAU); g.fill();
    g.fillStyle = '#2f9e38'; g.beginPath(); g.arc(26, 28, 18, 0, TAU); g.fill();
    g.fillStyle = '#45b84e'; g.beginPath(); g.arc(38, 24, 10, 0, TAU); g.fill();
  } else { // pine
    g.fillStyle = '#7a4a20'; g.fillRect(28, 60, 8, 22);
    g.fillStyle = '#155f2a';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(32, 2 + i * 16);
      g.lineTo(10 + i * 3, 30 + i * 16);
      g.lineTo(54 - i * 3, 30 + i * 16);
      g.closePath(); g.fill();
    }
  }
  return c;
}
const treeSprites = [makeTreeSprite(0), makeTreeSprite(1)];
const trees = [];
(function placeTrees() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i += 9) {
    const c = center[i];
    const side = rnd() < 0.5 ? -1 : 1;
    const off = (HALFW * 2 + 60 + rnd() * 240);
    const wx = c.x + c.nx * side * off;
    const wy = c.y + c.ny * side * off;
    if (wx < 40 || wy < 40 || wx > WORLD - 40 || wy > WORLD - 40) continue;
    if (surfAt(wx, wy) !== 0) continue;
    trees.push({ x: wx, y: wy, kind: (i / 9) % 2 | 0, size: 70 + rnd() * 50 });
  }
})();

/* ---------------- Minimap ---------------- */
const miniCanvas = document.createElement('canvas');
miniCanvas.width = miniCanvas.height = 84;
(function buildMini() {
  const g = miniCanvas.getContext('2d');
  g.fillStyle = 'rgba(10,30,10,0.75)';
  g.fillRect(0, 0, 84, 84);
  g.strokeStyle = '#e8e8e8'; g.lineWidth = 5; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(center[0].x / WORLD * 84, center[0].y / WORLD * 84);
  for (let i = 1; i < N; i += 4) g.lineTo(center[i].x / WORLD * 84, center[i].y / WORLD * 84);
  g.closePath(); g.stroke();
})();

/* ---------------- Karts ---------------- */
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
  };
}

let karts = [], player = null, bananas = [], itemBoxes = [];

function resetRace(playerChar) {
  karts = []; bananas = [];
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
    k.trackIdx = idx; k.lap = 0;
    karts.push(k);
  }
  player = karts[0];
  itemBoxes = [];
  for (const bi of BOX_IDX) {
    const c = center[bi];
    for (const off of [-60, 0, 60])
      itemBoxes.push({ x: c.x + c.nx * off, y: c.y + c.ny * off, respawn: 0 });
  }
  camAngle = player.angle;
  raceTime = 0;
}

/* ---------------- Race state ---------------- */
let state = 'menu';           // menu | countdown | race | finish
let menuChar = 0;
let countdownT = 0, raceTime = 0, finishDelay = 0;
let camAngle = 0, camX = 0, camY = 0;
let lastBeep = -1;
let prevStart = false, prevLeft = false, prevRight = false, prevItem = false;

/* ---------------- Kart physics & AI ---------------- */
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
  if (!k.isPlayer) k.itemDelay = 1 + Math.random() * 3.5;
}

function useItem(k) {
  if (!k.item) return;
  if (k.item === 'mushroom') {
    k.boostT = Math.max(k.boostT, 1.4);
    if (k.isPlayer) beep(300, 0.35, 'sawtooth', 900, 0.15);
  } else if (k.item === 'banana') {
    bananas.push({ x: k.x - Math.cos(k.angle) * 55, y: k.y - Math.sin(k.angle) * 55 });
    if (k.isPlayer) beep(500, 0.08, 'square');
  } else if (k.item === 'bolt') {
    for (const o of karts) {
      if (o !== k && o.key > k.key && o.spinT <= 0) { o.spinT = 1.1; o.speed *= 0.35; }
    }
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

function updateKart(k, dt) {
  const onSurf = surfAt(k.x, k.y);
  const offroad = onSurf === 0;

  let throttle = 0, steer = 0;

  if (state === 'race' || (state === 'finish' && !k.isPlayer) || (k.lap > LAPS)) {
    if (k.isPlayer && k.lap <= LAPS && state === 'race') {
      throttle = input.gas ? 1 : 0;
      if (input.brake) throttle = -1;
      steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    } else {
      // AI (also autopilots player after finish)
      const look = (k.trackIdx + 14 + ((k.speed / MAXSPEED) * 14) | 0) % N;
      const c = center[look];
      const lane = Math.sin(raceTime * 0.35 + k.laneSeed) * 28;
      const tx = c.x + c.nx * lane, ty = c.y + c.ny * lane;
      const want = Math.atan2(ty - k.y, tx - k.x);
      const diff = angDiff(k.angle, want);
      steer = clamp(diff * 3.2, -1, 1);
      const curvAhead = center[(k.trackIdx + 26) % N].curv;
      let target = MAXSPEED * k.aiSkill * clamp(1.18 - curvAhead * 1.9, 0.5, 1);
      // rubber-band vs player
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

  // steering (needs speed)
  const grip = clamp(k.speed / 70, 0, 1);
  k.angle += steer * TURNRATE * grip * dt;

  // drift charge (hold a direction at high speed -> mini boost on release)
  if (k.isPlayer) {
    if (steer !== 0 && k.speed > MAXSPEED * 0.72 && (k.driftDir === 0 || k.driftDir === steer)) {
      k.driftDir = steer;
      k.driftCharge += dt;
    } else {
      if (k.driftCharge > 1.05) { k.boostT = Math.max(k.boostT, 0.55); beep(200, 0.25, 'sawtooth', 700, 0.12); }
      k.driftCharge = 0; k.driftDir = 0;
    }
  }

  // speed
  if (throttle > 0) k.speed += ACCEL * dt;
  else if (throttle < 0) k.speed -= 260 * dt;
  const drag = DRAG + (offroad ? OFFDRAG : 0);
  k.speed -= k.speed * drag * dt;
  if (k.boostT > 0) {
    k.boostT -= dt;
    k.speed = Math.max(k.speed, lerp(k.speed, BOOSTSPEED, 0.25));
  }
  if (onSurf === 2 && k.boostT <= 0) { // boost pad
    k.boostT = 0.9;
    if (k.isPlayer) beep(240, 0.3, 'sawtooth', 800, 0.13);
  }
  k.speed = clamp(k.speed, 0, BOOSTSPEED);

  k.x += Math.cos(k.angle) * k.speed * dt;
  k.y += Math.sin(k.angle) * k.speed * dt;

  // progress
  const ni = nearestIdx(k);
  if (k.trackIdx > N - 30 && ni < 30) { k.lap++; if (k.isPlayer && k.lap <= LAPS && k.lap > 1) beep(660, 0.15, 'square', 990); }
  else if (k.trackIdx < 30 && ni > N - 30) k.lap--;
  k.trackIdx = ni;
  k.key = k.lap * N + ni;

  if (k.lap > LAPS && !k.finishTime) k.finishTime = raceTime;

  // rescue if far off track
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

  // banana collisions
  for (let i = bananas.length - 1; i >= 0; i--) {
    const b = bananas[i];
    if ((b.x - k.x) ** 2 + (b.y - k.y) ** 2 < 28 * 28) {
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

/* ---------------- Sky panorama ---------------- */
const SKYW = 2048;
const skyCanvas = document.createElement('canvas');
skyCanvas.width = SKYW; skyCanvas.height = HORIZON;
(function buildSky() {
  const g = skyCanvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, HORIZON);
  grad.addColorStop(0, '#3a7bd5');
  grad.addColorStop(0.7, '#7ec8ef');
  grad.addColorStop(1, '#cfeeff');
  g.fillStyle = grad; g.fillRect(0, 0, SKYW, HORIZON);
  // sun
  g.fillStyle = '#fff6c0'; g.beginPath(); g.arc(300, 30, 16, 0, TAU); g.fill();
  // clouds
  let seed = 12;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 22; i++) {
    const x = rnd() * SKYW, y = 12 + rnd() * 46, r = 8 + rnd() * 12;
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.arc(x + r, y + 3, r * 0.8, 0, TAU);
    g.arc(x - r, y + 3, r * 0.7, 0, TAU);
    g.fill();
  }
  // distant hills (two layers)
  g.fillStyle = '#5aa86a';
  for (let x = 0; x < SKYW; x += 8) {
    const h = 16 + Math.sin(x * 0.011) * 8 + Math.sin(x * 0.031) * 5;
    g.fillRect(x, HORIZON - h, 8, h);
  }
  g.fillStyle = '#3f8f52';
  for (let x = 0; x < SKYW; x += 8) {
    const h = 9 + Math.sin(x * 0.017 + 2) * 6 + Math.sin(x * 0.043) * 3;
    g.fillRect(x, HORIZON - h, 8, h);
  }
})();

/* ---------------- Mode-7 ground ---------------- */
const groundImg = ctx.createImageData(W, H - HORIZON);
const ground32 = new Uint32Array(groundImg.data.buffer);
const yStart = HORIZON + Math.ceil(CAMH * FOCAL / DRAWDIST);

// fog overlay (pre-rendered gradient just below the horizon)
const fogCanvas = document.createElement('canvas');
fogCanvas.width = W; fogCanvas.height = 46;
(function buildFog() {
  const g = fogCanvas.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 46);
  grad.addColorStop(0, 'rgba(207,238,255,1)');
  grad.addColorStop(1, 'rgba(207,238,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, W, 46);
})();

function drawGround() {
  const cosA = Math.cos(camAngle), sinA = Math.sin(camAngle);
  const W2 = W / 2;
  let p = (yStart - HORIZON) * W;
  for (let y = yStart; y < H; y++) {
    const d = CAMH * FOCAL / (y - HORIZON);
    const step = d / FOCAL;
    // start of the row in texel space (world*0.5)
    let tx = (camX + cosA * d + sinA * W2 * step) * 0.5;
    let ty = (camY + sinA * d - cosA * W2 * step) * 0.5;
    const dtx = -sinA * step * 0.5;
    const dty = cosA * step * 0.5;
    for (let x = 0; x < W; x++) {
      ground32[p++] = tex32[((ty | 0) & (TEX - 1)) * TEX + ((tx | 0) & (TEX - 1))];
      tx += dtx; ty += dty;
    }
  }
  ctx.putImageData(groundImg, 0, HORIZON, 0, yStart - HORIZON, W, H - yStart);
  // fill the sliver between horizon and yStart + fog
  ctx.fillStyle = '#cfeeff';
  ctx.fillRect(0, HORIZON, W, yStart - HORIZON);
  ctx.drawImage(fogCanvas, 0, HORIZON);
}

/* ---------------- Sprite drawing ---------------- */
function project(wx, wy) {
  const dx = wx - camX, dy = wy - camY;
  const cosA = Math.cos(camAngle), sinA = Math.sin(camAngle);
  const fz = dx * cosA + dy * sinA;           // forward distance
  const lx = -dx * sinA + dy * cosA;          // lateral offset
  if (fz < 12) return null;
  return { sx: W / 2 + (lx / fz) * FOCAL, sy: HORIZON + (CAMH / fz) * FOCAL, scale: FOCAL / fz, fz };
}

function drawKartSprite(g, k, screenScale) {
  // pseudo-3D top-down squash rendering; yaw relative to camera
  const ch = CHARACTERS[k.charIdx];
  const yaw = angDiff(camAngle, k.angle) + k.spinAng;
  g.save();
  g.scale(screenScale, screenScale);
  // shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(0, 2, 16, 7, 0, 0, TAU); g.fill();
  g.scale(1, 0.6);
  g.rotate(yaw);
  // wheels
  g.fillStyle = '#1a1a1a';
  for (const [wx, wy] of [[-11, -8], [11, -8], [-11, 9], [11, 9]]) {
    g.beginPath(); g.roundRect(wx - 3.5, wy - 5, 7, 10, 2); g.fill();
  }
  // body
  g.fillStyle = ch.color;
  g.beginPath(); g.roundRect(-9, -15, 18, 28, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.25)';
  g.beginPath(); g.roundRect(-6, -13, 12, 8, 3); g.fill();
  // nose
  g.fillStyle = ch.color;
  g.beginPath(); g.moveTo(-6, -15); g.lineTo(0, -21); g.lineTo(6, -15); g.closePath(); g.fill();
  g.restore();
  // driver head (drawn unrotated, above body)
  g.save();
  g.scale(screenScale, screenScale);
  g.fillStyle = ch.helmet;
  g.beginPath(); g.arc(0, -6, 5.5, 0, TAU); g.fill();
  g.fillStyle = ch.color;
  g.beginPath(); g.arc(0, -7.5, 5.5, Math.PI, TAU); g.fill();
  g.restore();
}

function drawSprites() {
  const list = [];
  for (const tr of trees) {
    const pr = project(tr.x, tr.y);
    if (pr && pr.fz < DRAWDIST + 600 && pr.sx > -80 && pr.sx < W + 80)
      list.push({ type: 'tree', pr, obj: tr });
  }
  for (const b of itemBoxes) {
    if (b.respawn > 0) continue;
    const pr = project(b.x, b.y);
    if (pr && pr.fz < DRAWDIST) list.push({ type: 'box', pr, obj: b });
  }
  for (const b of bananas) {
    const pr = project(b.x, b.y);
    if (pr && pr.fz < DRAWDIST) list.push({ type: 'banana', pr, obj: b });
  }
  for (const k of karts) {
    const pr = project(k.x, k.y);
    if (pr && pr.fz < DRAWDIST) list.push({ type: 'kart', pr, obj: k });
  }
  list.sort((a, b) => b.pr.fz - a.pr.fz);

  for (const it of list) {
    const { sx, sy, scale } = it.pr;
    ctx.save();
    ctx.translate(sx, sy);
    if (it.type === 'tree') {
      const s = scale * (it.obj.size / 84);
      ctx.drawImage(treeSprites[it.obj.kind], -32 * s, -80 * s, 64 * s, 84 * s);
    } else if (it.type === 'box') {
      const s = scale * 0.9;
      ctx.rotate(Math.sin(perfNow * 0.004 + it.obj.x) * 0.5);
      ctx.globalAlpha = 0.85;
      const sz = 14 * s;
      const grad = ctx.createLinearGradient(-sz, -sz, sz, sz);
      grad.addColorStop(0, '#ff5050'); grad.addColorStop(0.5, '#50c8ff'); grad.addColorStop(1, '#ffe050');
      ctx.fillStyle = grad;
      ctx.fillRect(-sz, -sz * 1.6, sz * 2, sz * 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(6, 16 * s)}px monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, -sz * 0.6);
    } else if (it.type === 'banana') {
      const s = scale;
      ctx.fillStyle = '#ffd21f';
      ctx.beginPath(); ctx.ellipse(0, -4 * s, 8 * s, 6 * s, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#8a6d00';
      ctx.fillRect(-1.5 * s, -11 * s, 3 * s, 4 * s);
    } else {
      drawKartSprite(ctx, it.obj, it.pr.scale);
      // drift sparks on the player
      if (it.obj.isPlayer && it.obj.driftCharge > 1.05) {
        const s = it.pr.scale;
        ctx.fillStyle = perfNow % 100 < 50 ? '#ffb020' : '#40c8ff';
        for (const off of [-10, 10]) {
          ctx.beginPath(); ctx.arc(off * s, 4 * s, 2.5 * s, 0, TAU); ctx.fill();
        }
      }
    }
    ctx.restore();
  }
}

/* ---------------- HUD ---------------- */
function text(str, x, y, size = 14, align = 'left', color = '#fff') {
  ctx.font = `bold ${size}px "Courier New", monospace`;
  ctx.textAlign = align; ctx.textBaseline = 'top';
  ctx.lineWidth = Math.max(2, size / 5);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#101020';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

const PLACE_TXT = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const PLACE_COL = ['#ffd700', '#c0c0c0', '#cd7f32', '#fff', '#fff', '#fff', '#fff', '#fff'];

function fmtTime(t) {
  const m = (t / 60) | 0, s = (t % 60) | 0, c = ((t * 100) % 100) | 0;
  return `${m}:${String(s).padStart(2, '0')}.${String(c).padStart(2, '0')}`;
}

function drawItemIcon(x, y, item, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (item === 'mushroom') {
    ctx.fillStyle = '#e03030';
    ctx.beginPath(); ctx.arc(0, -2, 9, Math.PI, TAU); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(-4, -6, 2.5, 0, TAU); ctx.arc(4, -6, 2.5, 0, TAU); ctx.fill();
    ctx.fillRect(-4, -2, 8, 6);
  } else if (item === 'banana') {
    ctx.fillStyle = '#ffd21f';
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 6, 0.6, 0, TAU); ctx.fill();
  } else if (item === 'bolt') {
    ctx.fillStyle = '#ffe040';
    ctx.beginPath();
    ctx.moveTo(2, -10); ctx.lineTo(-5, 2); ctx.lineTo(-1, 2);
    ctx.lineTo(-2, 10); ctx.lineTo(5, -2); ctx.lineTo(1, -2);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function drawHUD() {
  // position
  text(PLACE_TXT[player.place - 1], 10, 8, 26, 'left', PLACE_COL[player.place - 1]);
  // lap + time
  text(`LAP ${clamp(player.lap, 1, LAPS)}/${LAPS}`, W - 10, 8, 16, 'right');
  text(fmtTime(raceTime), W - 10, 28, 12, 'right', '#cfe');
  // item slot
  ctx.fillStyle = 'rgba(0,0,20,0.45)';
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(W / 2 - 18, 6, 36, 36, 6); ctx.fill(); ctx.stroke();
  if (player.item) drawItemIcon(W / 2, 24, player.item, 1.4);
  // minimap
  ctx.globalAlpha = 0.9;
  ctx.drawImage(miniCanvas, W - 94, H - 94);
  for (const k of karts) {
    ctx.fillStyle = k.isPlayer ? '#fff' : CHARACTERS[k.charIdx].color;
    const mx = W - 94 + k.x / WORLD * 84, my = H - 94 + k.y / WORLD * 84;
    ctx.beginPath(); ctx.arc(mx, my, k.isPlayer ? 3 : 2.2, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* ---------------- Screens ---------------- */
function drawMenu() {
  drawWorldBackdrop(perfNow * 0.0002);
  ctx.fillStyle = 'rgba(5,5,25,0.45)';
  ctx.fillRect(0, 0, W, H);

  text('KART', W / 2, 34, 52, 'center', '#ffd21f');
  text('DASH', W / 2, 84, 52, 'center', '#ff5050');
  text('Un kart racer rétro façon Mode 7', W / 2, 140, 11, 'center', '#cfe');

  // character select
  const ch = CHARACTERS[menuChar];
  text('◀', W / 2 - 90, 178, 22, 'center', '#fff');
  text('▶', W / 2 + 90, 178, 22, 'center', '#fff');
  ctx.save();
  ctx.translate(W / 2, 196);
  drawKartSprite(ctx, { charIdx: menuChar, angle: camAngle + Math.PI + perfNow * 0.0012, spinAng: 0 }, 2.2);
  ctx.restore();
  text(ch.name, W / 2, 216, 16, 'center', ch.color);

  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR JOUER', W / 2, 262, 14, 'center', '#fff');
  text('← → diriger · A/↑ gaz · B/Shift objet', W / 2, 292, 10, 'center', '#9ab');
}

function drawCountdown() {
  const n = Math.ceil(3 - countdownT);
  if (n !== lastBeep && n > 0) { beep(440, 0.15, 'square'); lastBeep = n; }
  if (n > 0) text(String(n), W / 2, 110, 72, 'center', '#ffd21f');
  else {
    if (lastBeep !== 0) { beep(880, 0.4, 'square'); lastBeep = 0; }
    if (countdownT < 3.7) text('GO!', W / 2, 110, 72, 'center', '#40e060');
  }
}

function drawFinish() {
  ctx.fillStyle = 'rgba(5,5,25,0.65)';
  ctx.fillRect(0, 0, W, H);
  text('COURSE TERMINÉE !', W / 2, 16, 22, 'center', '#ffd21f');
  const sorted = [...karts].sort((a, b) => {
    if (a.finishTime && b.finishTime) return a.finishTime - b.finishTime;
    if (a.finishTime) return -1;
    if (b.finishTime) return 1;
    return b.key - a.key;
  });
  sorted.forEach((k, i) => {
    const ch = CHARACTERS[k.charIdx];
    const y = 52 + i * 24;
    text(PLACE_TXT[i], W / 2 - 130, y, 15, 'left', PLACE_COL[i]);
    text(ch.name + (k.isPlayer ? '  ★' : ''), W / 2 - 70, y, 15, 'left', k.isPlayer ? '#fff' : ch.color);
    if (k.finishTime) text(fmtTime(k.finishTime), W / 2 + 130, y, 13, 'right', '#cfe');
  });
  const blink = (perfNow / 500 | 0) % 2 === 0;
  if (blink) text('TOUCHE / ENTRÉE POUR REJOUER', W / 2, H - 24, 13, 'center', '#fff');
}

// slowly rotating world view used as the menu backdrop
function drawWorldBackdrop(t) {
  camX = WORLD / 2 + Math.cos(t) * 500;
  camY = WORLD / 2 + Math.sin(t) * 500;
  camAngle = t + Math.PI / 2;
  drawSkyAndGround();
  drawSprites();
}

function drawSkyAndGround() {
  const ox = ((camAngle / TAU) * SKYW % SKYW + SKYW) % SKYW;
  ctx.drawImage(skyCanvas, -ox, 0);
  ctx.drawImage(skyCanvas, SKYW - ox, 0);
  drawGround();
}

/* ---------------- Main loop ---------------- */
let perfNow = 0, lastT = 0;

function frame(t) {
  requestAnimationFrame(frame);
  perfNow = t;
  const dt = clamp((t - lastT) / 1000, 0, 0.033);
  lastT = t;

  const startPressed = input.start && !prevStart;
  const leftPressed = input.left && !prevLeft;
  const rightPressed = input.right && !prevRight;
  const itemPressed = input.item && !prevItem;
  prevStart = input.start; prevLeft = input.left; prevRight = input.right; prevItem = input.item;

  if (state === 'menu') {
    if (leftPressed) menuChar = (menuChar + CHARACTERS.length - 1) % CHARACTERS.length;
    if (rightPressed) menuChar = (menuChar + 1) % CHARACTERS.length;
    if (startPressed || (input.gas && !player)) {
      resetRace(menuChar);
      state = 'countdown';
      countdownT = 0; lastBeep = -1;
      tryFullscreen();
    }
    drawMenu();
    updateEngine(0, false);
    return;
  }

  if (state === 'countdown') {
    countdownT += dt;
    if (countdownT >= 3) {
      if (state === 'countdown' && countdownT - dt < 3) raceTime = 0;
      state = 'race';
    }
  }

  if (state === 'race' || state === 'finish') {
    raceTime += dt;
    for (const b of itemBoxes) if (b.respawn > 0) b.respawn -= dt;
    for (const k of karts) updateKart(k, dt);
    kartCollisions();
    updatePlaces();

    if (state === 'race' && player.lap > LAPS) {
      finishDelay = 1.4;
      state = 'finish';
      beep(523, 0.15, 'square'); beep(659, 0.15, 'square');
      setTimeout(() => { beep(784, 0.3, 'square', 1046); }, 180);
    }
  }
  if (state === 'finish') {
    if (finishDelay > 0) finishDelay -= dt;
    else if (startPressed) { state = 'menu'; }
  }

  // camera follows the player
  camAngle += angDiff(camAngle, player.angle) * Math.min(1, dt * 7);
  camX = player.x - Math.cos(camAngle) * CAMBACK;
  camY = player.y - Math.sin(camAngle) * CAMBACK;

  drawSkyAndGround();
  drawSprites();
  drawHUD();
  if (state === 'countdown' || (state === 'race' && countdownT < 3.7 && raceTime < 1)) {
    countdownT += state === 'race' ? dt : 0;
    drawCountdown();
  }
  if (state === 'finish' && finishDelay <= 0) drawFinish();

  if (itemPressed && state === 'race') useItem(player);
  updateEngine(player.speed, state === 'race' || state === 'countdown');
}

function tryFullscreen() {
  try {
    if (!matchMedia('(pointer: coarse)').matches) return;
    const el = document.getElementById('wrap');
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    if (screen.orientation && screen.orientation.lock)
      screen.orientation.lock('landscape').catch(() => {});
  } catch (e) { /* fullscreen refusé : pas bloquant */ }
}

requestAnimationFrame(frame);
