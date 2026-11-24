// Solara Bay — main entry. Boots the renderer, builds the world, runs the
// 60 Hz fixed-step simulation, drives the hero car / player / jetpack, fires
// weapons with tracers and muzzle flash, runs police + traffic AI, and stages
// the four screenshot shots. Headless playtest hook: window.__step(n) advances
// the simulation n fixed steps (Chrome throttles rAF headless after 4 frames).
import * as THREE from 'three';
import { buildWorld } from './world.js';
import { makeHeroCar, makePoliceCar, makeTrafficCar, makeHeli, makeTank, makeScooter, makeJetpack } from './vehicles.js';
import { makePlayer, makeGuard, makeDowned, makeCrowd, updateCrowd } from './people.js';
import { MISSIONS, WEAPONS, Wanted, MissionRunner } from './missions.js';
import { buildHUD, updateHUD, showBanner, showToast, toggleMeta } from './hud.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';
import { flashTexture } from './textures.js';

window.__errors = [];
window.addEventListener('error', (e) => window.__errors.push(String(e.message || e.error)));

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const autopilot = params.get('autopilot') === '1';

// ---- renderer: antialias on, DPR up to 2, ACES filmic, one 4096 shadow sun ----
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(10, 6, 34);

const G = {
  scene, camera, renderer, t: 0,
  cash: 4120, clockTime: '08:00', preset: 'noon',
  wanted: new Wanted(), missionRunner: null,
  speedKmh: 0, health: 100, carDamage: 0,
  weapons: WEAPONS, weaponIndex: 0, ammo: 12, reserve: 48,
  jetpackOn: false, fuel: 100, inCar: true,
  playerPos: new THREE.Vector3(0, 0, 40), heading: Math.PI,
  waypoint: new THREE.Vector3(0, 0, -40),
  policeCars: [], helis: [], traffic: [], guards: [],
  shotMode: null, paused: false, metaOpen: false,
};

G.world = buildWorld(G);
G.missionRunner = new MissionRunner((ev, payload) => {
  if (ev === 'complete') {
    const m = payload;
    G.cash += m.payout;
    showBanner('MISSION COMPLETE', `+$${m.payout.toLocaleString('en-US')} · ${m.name}`, 4000);
    G.audio.stinger(true);
    saveGame(1, `${m.id} · $${G.cash.toLocaleString('en-US')} · ${G.clockTime}`);
    showToast(`Saved to slot 1 · ${m.name} complete`);
  } else if (ev === 'fail') {
    showBanner('MISSION FAILED', String(payload), 4000);
    G.audio.stinger(false);
  } else if (ev === 'stage') {
    showToast('Objective: ' + payload);
    G.audio.blip(990, 0.12, 0.14);
  }
});
G.audio = new AudioEngine();

// ---- vehicles & people ----
G.hero = makeHeroCar();
G.hero.position.set(0, 0, 40); G.hero.rotation.y = Math.PI / 2;
scene.add(G.hero);
for (let i = 0; i < 5; i++) {
  const p = makePoliceCar(i);
  p.position.set(-8 + i * 4, 0, 70 + i * 9);
  p.rotation.y = Math.PI / 2;
  scene.add(p); G.policeCars.push(p);
}
const trafficCols = [0x2aa3c8, 0xffd23e, 0x7ddb4a, 0xf4f6f2, 0x7d5ba6, 0xe76f51];
for (let i = 0; i < 6; i++) {
  const t = makeTrafficCar(trafficCols[i % trafficCols.length]);
  const lane = i % 2 === 0 ? -4.5 : 4.5;
  t.position.set(lane, 0, -120 + i * 44);
  t.rotation.y = i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2;
  t.userData.speed = 22 + (i % 3) * 6; t.userData.lane = lane;
  scene.add(t); G.traffic.push(t);
}
G.helis = [makeHeli(), makeHeli()];
G.helis[0].position.set(24, 30, -20); scene.add(G.helis[0]);
G.helis[1].position.set(-30, 34, 40); G.helis[1].visible = false; scene.add(G.helis[1]);
const tank = makeTank(); tank.position.set(60, 0, -110); tank.rotation.y = -0.6; scene.add(tank);
const scooter = makeScooter(); scooter.position.set(13.5, 0, 60); scooter.rotation.y = Math.PI / 2; scene.add(scooter);

G.player = makePlayer();
G.player.position.set(2, 0, 40); G.player.visible = false;
scene.add(G.player);
G.jetpack = makeJetpack();
G.jetpack.position.set(2, 0.4, 40.4); G.jetpack.visible = false;
scene.add(G.jetpack);
G.guards = [makeGuard(11), makeGuard(23)];
G.guards.forEach((gd, i) => { gd.position.set(30 + i * 3, 0, 30 - i * 6); gd.visible = false; scene.add(gd); });
G.downed = makeDowned();
G.downed.position.set(26, 0, 30.5); G.downed.visible = false; scene.add(G.downed);
const crowd = makeCrowd(scene);
G.crowd = crowd; // staged shots reposition peds; gameplay never touches it

// ---- effects: muzzle flash sprite, tracers, debris, smoke, skid marks ----
const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), transparent: true, opacity: 0, depthWrite: false, fog: false }));
flash.scale.set(2.2, 2.2, 1); scene.add(flash);
let flashLife = 0;
const tracers = [];
function spawnTracer(a, b, color = 0xffee88) {
  // bright bolt: a thin additive cylinder between the two points — a 1px
  // line is nearly invisible at 1280x720, a bolt reads as a tracer
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const geo = new THREE.CylinderGeometry(0.045, 0.045, len, 6, 1, true);
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, fog: false });
  const bolt = new THREE.Mesh(geo, mat);
  bolt.position.copy(a).addScaledVector(dir, 0.5);
  bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  scene.add(bolt);
  tracers.push({ line: bolt, life: 0.14 });
}
G.fireTracer = (x1, y1, z1, x2, y2, z2) => spawnTracer(new THREE.Vector3(x1, y1, z1), new THREE.Vector3(x2, y2, z2));
G.fireFlash = (x, y, z, tx, ty, tz) => {
  flash.position.set(x, y, z); flash.material.opacity = 1; flashLife = 0.07;
  spawnTracer(new THREE.Vector3(x, y, z), new THREE.Vector3(tx, ty, tz));
  spawnDebris(tx, ty, tz);
};
const debris = [];
function spawnDebris(x, y, z) {
  for (let i = 0; i < 10; i++) {
    const d = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffa030 : 0x3a3a3a, roughness: 0.7 }));
    d.position.set(x, y, z);
    d.userData.v = new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5 + 1, (Math.random() - 0.5) * 6);
    d.userData.life = 0.9;
    scene.add(d); debris.push(d);
  }
}
const smokePuffs = [];
const smokeMat = new THREE.SpriteMaterial({ map: flashTexture(), color: 0xbbbbbb, transparent: true, opacity: 0.4, depthWrite: false });
function spawnSmoke(x, y, z) {
  const s = new THREE.Sprite(smokeMat.clone());
  s.position.set(x, y, z); s.scale.set(1.4, 1.4, 1); s.userData.life = 1.1;
  scene.add(s); smokePuffs.push(s);
}
const skids = [];
function spawnSkid(x, z, heading) {
  if (skids.length > 40) { const old = skids.shift(); scene.remove(old); }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.2), new THREE.MeshBasicMaterial({ color: 0x0c0c0e, transparent: true, opacity: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = -heading; m.position.set(x, 0.09, z);
  scene.add(m); skids.push(m);
}

// ---- input ----
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (e.code === 'KeyM') { G.metaOpen = !G.metaOpen; toggleMeta(G.metaOpen); }
  if (e.code === 'KeyP') { G.paused = !G.paused; showToast(G.paused ? 'PAUSED' : 'RESUMED'); }
  if (e.code === 'KeyE') toggleVehicle();
  if (e.code === 'KeyJ') toggleJetpack();
  if (e.code === 'KeyR') reload();
  if (e.code >= 'Digit1' && e.code <= 'Digit6') selectWeapon(Number(e.code.slice(5)) - 1);
  if (e.code === 'KeyF') fireWeapon();
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function toggleVehicle() {
  if (G.shotMode) return;
  G.inCar = !G.inCar;
  G.player.visible = !G.inCar;
  G.jetpack.visible = false; G.jetpackOn = false;
  if (!G.inCar) {
    G.player.position.copy(G.hero.position); G.player.position.x += 2.2;
    G.playerPos.copy(G.player.position); G.heading = G.hero.rotation.y;
    showToast('On foot — F to fire, J for jetpack');
  } else {
    G.hero.position.copy(G.player.position); G.hero.position.x -= 2.2;
    G.playerPos.copy(G.hero.position); G.heading = G.hero.rotation.y;
    showToast('In the Comet GT');
  }
}
function toggleJetpack() {
  if (G.inCar || G.shotMode) return;
  G.jetpackOn = !G.jetpackOn;
  G.jetpack.visible = G.jetpackOn;
  if (G.jetpackOn) { G.fuel = Math.max(G.fuel, 30); showToast('JETPACK ON — SPACE to climb'); }
}
function selectWeapon(i) {
  if (i < 0 || i >= WEAPONS.length) return;
  G.weaponIndex = i; const w = WEAPONS[i];
  G.ammo = w.mag; G.reserve = w.reserve;
  showToast(w.name + ' equipped');
}
function reload() {
  const w = WEAPONS[G.weaponIndex];
  const need = w.mag - G.ammo;
  const take = Math.min(need, G.reserve);
  G.ammo += take; G.reserve -= take;
  G.audio.blip(660, 0.08, 0.1);
}
function nearestGuard() {
  let best = null, bd = 1e9;
  const from = G.playerPos;
  for (const gd of G.guards) {
    if (!gd.visible) continue;
    const d = gd.position.distanceTo(from);
    if (d < bd) { bd = d; best = gd; }
  }
  return bd < 55 ? best : null;
}
function fireWeapon() {
  if (G.inCar || G.ammo <= 0 || G.paused) { if (G.ammo <= 0) reload(); return; }
  const w = WEAPONS[G.weaponIndex];
  G.ammo--; G.audio.gunshot();
  const from = G.player.position.clone(); from.y += 1.45;
  const dir = new THREE.Vector3(Math.sin(G.heading), 0, Math.cos(G.heading));
  const target = nearestGuard();
  const end = target ? target.position.clone().setY(1.3) : from.clone().add(dir.clone().multiplyScalar(40));
  G.fireFlash(from.x + dir.x, from.y, from.z + dir.z, end.x, end.y, end.z);
  if (target) {
    target.visible = false;
    G.downed.position.copy(target.position); G.downed.visible = true;
    G.missionRunner.dropped++;
    G.wanted.add(1);
    showToast(`DROPPED ${G.missionRunner.dropped} / 3 — Regent crew down`);
    if (G.missionRunner.dropped >= 2) G.missionRunner.advance();
  }
  if (G.ammo === 0) reload();
}

// ---- save slots (localStorage, 3 slots) ----
function saveGame(slot, label) {
  try {
    const saves = JSON.parse(localStorage.getItem('solara-saves') || '[]');
    saves[slot - 1] = label;
    localStorage.setItem('solara-saves', JSON.stringify(saves));
  } catch (e) { /* storage unavailable */ }
}

// ---- mission 1 autopilot: drive through both checkpoints, then complete ----
const M1_POINTS = [new THREE.Vector3(0, 0, -40), new THREE.Vector3(-30, 0, 20)];
let m1Point = 0;
function autopilotDrive(dt) {
  if (!G.missionRunner.mission || G.missionRunner.mission.id !== 'M1') return;
  if (G.missionRunner.state !== 'active' || m1Point >= M1_POINTS.length) return;
  const target = M1_POINTS[m1Point];
  const dx = target.x - G.hero.position.x, dz = target.z - G.hero.position.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz); // heading: rotation.y with front +X mapped... use atan2 for -Z-forward
  let dh = want - G.heading;
  while (dh > Math.PI) dh -= Math.PI * 2;
  while (dh < -Math.PI) dh += Math.PI * 2;
  G.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, dh * 2.2));
  G.speedKmh = Math.min(64, G.speedKmh + 42 * dt);
  if (dist < 3.5) {
    m1Point++;
    G.missionRunner.advance();
    if (m1Point >= M1_POINTS.length) { G.missionRunner.complete(); }
  }
}

// ---- per-frame simulation (fixed 1/60 step) ----
function step(dt) {
  G.t += dt;
  if (G.paused) return;
  G.missionRunner.update(dt);
  G.wanted.decay(dt);
  G.world.update(dt, G.t);

  // driving / walking / jetpack — frozen in shot mode so staged values hold
  if (!G.shotMode) {
  if (G.inCar) {
    if (autopilot) autopilotDrive(dt);
    else {
      const accel = (keys.KeyW || keys.ArrowUp ? 46 : 0) - (keys.KeyS || keys.ArrowDown ? 30 : 0);
      G.speedKmh += accel * dt;
      if (keys.Space) G.speedKmh *= Math.max(0, 1 - 3.2 * dt);
      G.speedKmh *= (1 - 0.25 * dt);
      G.speedKmh = Math.max(-24, Math.min(196, G.speedKmh));
      const steer = (keys.KeyA ? 1 : 0) - (keys.KeyD ? 1 : 0);
      G.heading += steer * 1.7 * dt * Math.min(1, Math.abs(G.speedKmh) / 40 + 0.25) * (G.speedKmh < 0 ? -1 : 1);
    }
    const v = G.speedKmh / 3.6;
    G.hero.position.x += Math.sin(G.heading) * v * dt;
    G.hero.position.z += Math.cos(G.heading) * v * dt;
    // keep the car in the bay
    G.hero.position.x = Math.max(-52, Math.min(120, G.hero.position.x));
    G.hero.position.z = Math.max(-155, Math.min(155, G.hero.position.z));
    G.hero.rotation.y = G.heading - Math.PI / 2; // model front +X -> heading dir
    G.playerPos.copy(G.hero.position);
    if (Math.abs(G.speedKmh) > 60 && keys.Space && Math.random() < 0.3) {
      spawnSkid(G.hero.position.x - Math.cos(G.heading) * 1, G.hero.position.z + Math.sin(G.heading) * 1, G.heading);
    }
    if (Math.abs(G.speedKmh) > 120 && Math.random() < 0.12) spawnSmoke(G.hero.position.x - Math.sin(G.heading) * 2.2, 0.5, G.hero.position.z - Math.cos(G.heading) * 2.2);
  } else {
    const mv = new THREE.Vector3(
      (keys.KeyD ? 1 : 0) - (keys.KeyA ? 1 : 0),
      0,
      (keys.KeyS ? 1 : 0) - (keys.KeyW ? 1 : 0),
    );
    if (G.jetpackOn) {
      G.fuel = Math.max(0, G.fuel - dt * 4);
      if (G.fuel <= 0) { G.jetpackOn = false; G.jetpack.visible = false; showToast('Jetpack fuel empty!'); }
      const jy = (keys.Space ? 7 : 0) - 2.2;
      G.player.position.y = Math.max(0, G.player.position.y + jy * dt);
      G.player.position.x += Math.sin(G.heading) * (keys.KeyW ? 9 : 0) * dt;
      G.player.position.z += Math.cos(G.heading) * (keys.KeyW ? 9 : 0) * dt;
      G.speedKmh = keys.KeyW ? 68 : 18;
      G.jetpack.position.copy(G.player.position); G.jetpack.position.z += 0.55; G.jetpack.position.y -= 0.1;
      G.jetpack.rotation.y = G.player.rotation.y;
      G.jetpack.userData.flameL.scale.y = 0.9 + Math.sin(G.t * 31) * 0.25;
      G.jetpack.userData.flameR.scale.y = 0.9 + Math.cos(G.t * 29) * 0.25;
      G.jetpack.userData.flameLight.intensity = 10 + Math.sin(G.t * 25) * 4;
      G.playerPos.copy(G.player.position);
    } else {
      const sp = keys.ShiftLeft ? 9 : 4.5;
      if (mv.lengthSq() > 0) {
        mv.normalize();
        G.heading = Math.atan2(mv.x, mv.z);
        G.player.position.addScaledVector(mv, sp * dt);
        G.player.rotation.y = G.heading;
        G.playerPos.copy(G.player.position);
        G.speedKmh = sp * 3.6;
        const ph = G.t * 9;
        G.player.userData.legs.L.rotation.x = Math.sin(ph) * 0.55;
        G.player.userData.legs.R.rotation.x = -Math.sin(ph) * 0.55;
        G.player.userData.arms.L.rotation.x = -Math.sin(ph) * 0.4;
      } else G.speedKmh = 0;
    }
    if (keys.KeyF && G.t - (G.lastShot || 0) > WEAPONS[G.weaponIndex].rate) { G.lastShot = G.t; fireWeapon(); }
  }
  }

  // police chase AI: steer toward the player, keep a loose ring, flash lights
  const target = G.playerPos;
  if (!G.shotMode) {
  G.policeCars.forEach((p, i) => {
    if (!p.visible) return;
    const d = p.position.distanceTo(target);
    if (d > 90) { // respawn closer when far away
      p.position.set(target.x + (i - 2) * 9, 0, target.z + 34 + i * 7);
    }
    const dx = target.x - p.position.x, dz = target.z - p.position.z;
    const want = Math.atan2(dx, dz);
    let dh = want - (p.rotation.y + Math.PI / 2);
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    const h = (p.rotation.y + Math.PI / 2) + Math.max(-1.9 * dt, Math.min(1.9 * dt, dh * 2));
    p.rotation.y = h - Math.PI / 2;
    const sp = Math.min(34, 14 + d * 0.55);
    p.position.x += Math.sin(h) * sp * dt;
    p.position.z += Math.cos(h) * sp * dt;
    const blink = Math.sin(G.t * 9 + i) > 0;
    p.userData.redLight.material.emissiveIntensity = blink ? 2.4 : 0.25;
    p.userData.blueLight.material.emissiveIntensity = blink ? 0.25 : 2.4;
  });
  }
  G.audio.setSiren(G.wanted.level > 0 && !G.shotMode);
  G.audio.setEngine(G.speedKmh, G.inCar);

  // helicopters hover over the player, rotors spinning, cones down
  G.helis.forEach((h, i) => {
    if (!h.visible) return;
    h.userData.rotor.rotation.y += dt * 22;
    if (G.shotMode) return; // staged heli positions hold in shots
    const hx = target.x + (i === 0 ? 14 : -18) + Math.sin(G.t * 0.4 + i * 2) * 5;
    const hz = target.z - 26 + Math.cos(G.t * 0.33 + i) * 5;
    h.position.x += (hx - h.position.x) * Math.min(1, dt * 0.8);
    h.position.z += (hz - h.position.z) * Math.min(1, dt * 0.8);
    h.position.y = 28 + Math.sin(G.t * 0.8 + i) * 1.2;
    h.rotation.y = Math.atan2(target.x - h.position.x, target.z - h.position.z) + Math.PI / 2;
  });

  // traffic cruises the boulevard and wraps
  if (!G.shotMode) {
  for (const tc of G.traffic) {
    if (!tc.visible) continue;
    const dir = tc.userData.lane < 0 ? 1 : -1;
    tc.position.z += dir * tc.userData.speed * dt;
    if (tc.position.z > 160) tc.position.z = -160;
    if (tc.position.z < -160) tc.position.z = 160;
  }
  }

  updateCrowd(crowd, dt, G.t);
  if (G.downed.visible) {
    const s = 1 + Math.sin(G.t * 4) * 0.12;
    G.downed.userData.ring.scale.set(s, s, 1);
    G.downed.userData.ring.material.opacity = 0.65 + Math.sin(G.t * 4) * 0.25;
  }
  if (flashLife > 0) { flashLife -= dt; if (flashLife <= 0) flash.material.opacity = 0; }
  for (let i = tracers.length - 1; i >= 0; i--) {
    tracers[i].life -= dt;
    tracers[i].line.material.opacity = Math.max(0, tracers[i].life / 0.14);
    if (tracers[i].life <= 0) { scene.remove(tracers[i].line); tracers.splice(i, 1); }
  }
  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.userData.life -= dt;
    d.position.addScaledVector(d.userData.v, dt);
    d.userData.v.y -= 14 * dt;
    d.rotation.x += dt * 5; d.rotation.y += dt * 4;
    if (d.userData.life <= 0 || d.position.y < 0.05) { scene.remove(d); debris.splice(i, 1); }
  }
  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const s = smokePuffs[i];
    s.userData.life -= dt;
    s.position.y += dt * 1.4; s.scale.multiplyScalar(1 + dt * 0.7);
    s.material.opacity = Math.max(0, s.userData.life * 0.35);
    if (s.userData.life <= 0) { scene.remove(s); smokePuffs.splice(i, 1); }
  }

  // camera: chase / follow, frozen in shot mode
  if (!G.shotMode) {
    const back = 9.5, up = 4.2;
    const cx = G.playerPos.x - Math.sin(G.heading) * back;
    const cz = G.playerPos.z - Math.cos(G.heading) * back;
    const cy = Math.max(2.2, G.playerPos.y + up);
    camera.position.lerp(new THREE.Vector3(cx, cy, cz), Math.min(1, dt * 4));
    camera.lookAt(G.playerPos.x, G.playerPos.y + 1.6, G.playerPos.z);
  }
  updateHUD(G);
  if (!G._skipRender) renderer.render(scene, camera);
}

window.__step = (n) => {
  // headless playtest hook: advance the fixed-step sim n steps; render once
  // at the end (Chrome throttles rAF headless, and per-step renders are slow)
  G._skipRender = true;
  for (let i = 0; i < n; i++) step(1 / 60);
  G._skipRender = false;
  renderer.render(scene, camera);
  return { mission: G.missionRunner.state, cash: G.cash, wanted: G.wanted.level, health: G.health, speed: Math.round(G.speedKmh), errors: window.__errors.length, stage: G.missionRunner.stage };
};
window.__state = () => ({ mission: G.missionRunner.state, cash: G.cash, wanted: G.wanted.level, health: G.health, speed: Math.round(G.speedKmh), errors: window.__errors, stage: G.missionRunner.stage });

// ---- boot ----
buildHUD();
G.missionRunner.start(MISSIONS[0]);
if (shotName) {
  document.getElementById('menu').style.display = 'none';
  applyShot(G, shotName);
  step(1 / 60); step(1 / 60); // settle: two frames so HUD + effects are live
  updateHUD(G);
  renderer.render(scene, camera);
} else {
  document.getElementById('playBtn').addEventListener('click', () => {
    document.getElementById('menu').style.display = 'none';
    G.audio.ensure();
    G.missionRunner.start(MISSIONS[0]);
    showToast('M1 · FIRST LIGHT — drive to the pier checkpoint');
  });
  document.getElementById('metaClose').addEventListener('click', () => { G.metaOpen = false; toggleMeta(false); });
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
window.__ready = true;
