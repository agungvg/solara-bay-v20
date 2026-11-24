// HUD, minimap and the MAP/STATS meta screen for Solara Bay.
// The meta screen is a fully opaque DOM overlay — no 3D ghosting behind it.
import { MISSIONS, UNITS } from './missions.js';

const $ = (id) => document.getElementById(id);

export function buildHUD() {
  const unitsEl = $('units');
  unitsEl.innerHTML = UNITS.map((u) => `<div class="u"><span>${u.call} · ${u.role}</span><b data-unit="${u.call}">${u.dist} m</b></div>`).join('');
  renderMeta();
}

export function updateHUD(G) {
  const m = G.missionRunner.mission || MISSIONS[0];
  $('mName').innerHTML = `${m.id} &middot; ${m.name}`;
  $('mObj').textContent = G.missionRunner.objective;
  $('mSub').textContent = m.detail + (G.missionRunner.state === 'active' ? ` · ${fmtTime(G.missionRunner.timer)}` : '');
  $('cash').textContent = '$' + G.cash.toLocaleString('en-US');
  $('clock').textContent = `${G.clockTime} · ${G.preset === 'golden' ? 'GOLDEN HOUR' : 'SUNNY'}`;
  const stars = document.querySelectorAll('#stars span');
  stars.forEach((s, i) => { s.className = i < G.wanted.level ? 'on' : 'off'; });
  $('speed').textContent = Math.round(Math.abs(G.speedKmh));
  const dmg = Math.round(100 - G.carDamage);
  $('damage').textContent = `CONDITION ${dmg}% · ${G.carDamage > 50 ? 'DENTED' : G.carDamage > 25 ? 'SCRATCHED' : 'CLEAN'}`;
  $('hpBar').style.width = G.health + '%';
  const w = G.weapons[G.weaponIndex];
  $('weapon').textContent = `${w.name} · ${G.ammo} / ${G.reserve}`;
  const fuelEl = $('fuel');
  if (G.jetpackOn) { fuelEl.style.display = 'block'; fuelEl.innerHTML = `JETPACK FUEL ${'&#9646;'.repeat(Math.round(G.fuel / 12.5))} ${Math.round(G.fuel)}%`; }
  else fuelEl.style.display = 'none';
  // live unit distances
  for (const u of UNITS) {
    const el = document.querySelector(`[data-unit="${u.call}"]`);
    if (el) el.textContent = Math.max(18, Math.round(u.dist + Math.sin(G.t * 0.7 + u.call.length) * 14)) + ' m';
  }
  drawMinimap(G);
}

function fmtTime(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

// Circular minimap: districts, ocean, road, player, police, heli, waypoint.
export function drawMinimap(G) {
  const cv = $('minimap'); if (!cv) return;
  const g = cv.getContext('2d');
  const W = 168, C = 84;
  g.clearRect(0, 0, W, W);
  g.fillStyle = '#123a5c'; g.fillRect(0, 0, W, W);
  g.fillStyle = '#1e7fa8'; g.fillRect(0, 0, 52, W); // ocean west
  g.fillStyle = '#e8d5a4'; g.fillRect(52, 0, 10, W); // beach
  g.fillStyle = '#2c4a63';
  for (let i = 0; i < 8; i++) g.fillRect(66 + (i % 4) * 24, 10 + Math.floor(i / 4) * 74, 20, 64); // blocks
  g.fillStyle = '#45484f'; g.fillRect(78, 0, 12, W); // boulevard
  g.fillStyle = '#d8a928'; g.fillRect(83, 0, 2, W);
  // waypoint
  const wp = G.waypoint;
  g.fillStyle = '#ffd23e'; g.beginPath(); g.arc(mapX(wp.x), mapZ(wp.z), 7, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(mapX(wp.x), mapZ(wp.z), 7, 0, Math.PI * 2); g.stroke();
  // police blips
  g.fillStyle = '#ff3030';
  for (const p of G.policeCars) { g.beginPath(); g.arc(mapX(p.position.x), mapZ(p.position.z), 4, 0, Math.PI * 2); g.fill(); }
  // heli
  g.fillStyle = '#ff9030';
  for (const h of G.helis) { g.beginPath(); g.arc(mapX(h.position.x), mapZ(h.position.z), 5, 0, Math.PI * 2); g.fill(); }
  // player arrow
  const px = mapX(G.playerPos.x), pz = mapZ(G.playerPos.z);
  g.save(); g.translate(px, pz); g.rotate(-G.heading);
  g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -9); g.lineTo(6, 7); g.lineTo(-6, 7); g.closePath(); g.fill();
  g.restore();
  function mapX(x) { return C + (x / 160) * 78; }
  function mapZ(z) { return C + (z / 160) * 78; }
}

export function showBanner(big, sub, ms = 2600) {
  $('bannerBig').textContent = big;
  $('bannerSub').textContent = sub;
  $('banner').style.display = 'block';
  setTimeout(() => { $('banner').style.display = 'none'; }, ms);
}

export function showToast(text, ms = 2600) {
  const t = $('toast');
  t.textContent = text; t.style.display = 'block';
  setTimeout(() => { t.style.display = 'none'; }, ms);
}

export function toggleMeta(show) {
  $('meta').style.display = show ? 'block' : 'none';
  document.querySelectorAll('.hud').forEach((el) => { el.style.visibility = show ? 'hidden' : 'visible'; });
  if (show) renderMeta();
}

const TRACKS = [
  ['Story missions', 6, 8], ['Side jobs', 11, 14], ['Collectibles', 27, 40],
  ['Stunt jumps', 9, 15], ['Races won', 5, 10], ['Wanted escapes', 14, 20],
  ['Properties owned', 3, 6], ['Photos taken', 18, 25],
];
const CAREER = [
  ['Missions completed', '6 / 8'], ['Total earned', '$48,290'], ['Total spent', '$26,950'],
  ['Cars stolen', '23'], ['Top speed', '212 KM/H'], ['Longest jump', '64 m'],
  ['Jetpack flights', '17'], ['Jetpack airtime', '42 min'], ['Enemies dropped', '31'],
  ['Wanted escapes', '14'], ['Time played', '18 h 26 m'], ['Accuracy', '61%'],
];
const WORKSHOP = [
  ['Comet GT — turbo + armor', 'OWNED'], ['Comet GT — neon kit', 'OWNED'], ['Vulture bike — engine III', 'OWNED'],
  ['Rhino tank — plating', 'LOCKED'], ['Yacht — helipad', 'LOCKED'], ['Comet GT — rocket boost', 'LOCKED'],
];
const GEAR = [
  ['Pistol · SMG · Shotgun', 'OWNED'], ['Rifle · Sniper', 'OWNED'], ['Rocket Launcher', 'OWNED'],
  ['Body armor III', 'OWNED'], ['Jetpack Mk II', 'OWNED'], ['Night vision', 'LOCKED'],
];
const CREW = [
  ['Mara Voss', 'Driver · you'], ['Dex Marlowe', 'Hacker · getaway plans'], ['Lena Cruz', 'Wheelwoman · boats'],
];
const DISTRICTS = [
  ['Coral Row', 'Downtown'], ['Pier District', 'Beachfront'], ['Lantern Market', 'Old Town'],
  ['Solara Heights', 'Hills'], ['Marina Bay', 'Harbor'], ['Sunset Strip', 'Boulevard'],
  ['Palm Court', 'Residential'], ['Airport Flats', 'South'],
];

export function renderMeta() {
  $('tracks').innerHTML = TRACKS.map(([n, a, b]) =>
    `<div class="track">${n} <b style="float:right">${a} / ${b}</b><div class="bar"><i style="width:${Math.round(a / b * 100)}%"></i></div></div>`).join('');
  $('career').innerHTML = CAREER.map(([k, v]) => `<div class="row"><span>${k}</span><b>${v}</b></div>`).join('');
  $('workshop').innerHTML = WORKSHOP.map(([n, s]) => `<div class="row"><span>${n}</span><span class="tag ${s === 'OWNED' ? 'owned' : 'locked'}">${s}</span></div>`).join('');
  $('gear').innerHTML = GEAR.map(([n, s]) => `<div class="row"><span>${n}</span><span class="tag ${s === 'OWNED' ? 'owned' : 'locked'}">${s}</span></div>`).join('');
  $('crew').innerHTML = CREW.map(([n, r]) => `<div class="row"><span>${n}</span><b>${r}</b></div>`).join('');
  $('districts').innerHTML = DISTRICTS.map(([n, d]) => `<div class="row"><span>${n}</span><b>${d}</b></div>`).join('');
  const saves = JSON.parse(localStorage.getItem('solara-saves') || '[]');
  const slots = [
    { n: 1, label: saves[0] ? `FILLED · ${saves[0]}` : 'EMPTY' },
    { n: 2, label: saves[1] ? `FILLED · ${saves[1]}` : 'EMPTY' },
    { n: 3, label: saves[2] ? `FILLED · ${saves[2]}` : 'EMPTY' },
  ];
  $('slots').innerHTML = slots.map((s) =>
    `<div class="slot ${s.label.startsWith('FILLED') ? 'filled' : ''}"><span class="t">SLOT ${s.n}</span> — ${s.label}</div>`).join('');
  drawMap();
}

// Real 8-district map drawn on canvas: ocean, beach, road grid, labels.
export function drawMap() {
  const cv = $('mapCanvas'); if (!cv) return;
  const g = cv.getContext('2d');
  g.fillStyle = '#0a1a2e'; g.fillRect(0, 0, 400, 300);
  g.fillStyle = '#1e7fa8'; g.fillRect(0, 0, 92, 300);
  g.fillStyle = '#e8d5a4'; g.fillRect(92, 0, 16, 300);
  const cols = ['#2c4a63', '#33556e', '#2a4258', '#3a5a72'];
  const rects = [[120, 14, 120, 62], [252, 14, 132, 62], [120, 88, 120, 62], [252, 88, 132, 62], [120, 162, 120, 58], [252, 162, 132, 58], [120, 232, 120, 56], [252, 232, 132, 56]];
  rects.forEach(([x, y, w, h], i) => {
    g.fillStyle = cols[i % 4]; g.fillRect(x, y, w, h);
    g.strokeStyle = '#5a7d9c'; g.lineWidth = 1; g.strokeRect(x, y, w, h);
    g.fillStyle = '#eaf2ff'; g.font = 'bold 12px Arial'; g.textAlign = 'left';
    g.fillText(DISTRICTS[i][0], x + 8, y + 22);
    g.fillStyle = '#9fd8ff'; g.font = '11px Arial';
    g.fillText(DISTRICTS[i][1], x + 8, y + 40);
  });
  // roads
  g.fillStyle = '#45484f'; g.fillRect(108, 0, 8, 300); g.fillRect(246, 0, 8, 300); g.fillRect(116, 76, 268, 8); g.fillRect(116, 150, 268, 8); g.fillRect(116, 220, 268, 8);
  // yacht + ferris icons
  g.fillStyle = '#ffd23e'; g.font = 'bold 12px Arial';
  g.fillText('⛵ YACHT', 12, 42); g.fillText('🎡 WHEEL', 12, 250);
  // player marker (Sunset Strip, clear of labels)
  g.fillStyle = '#fff'; g.beginPath(); g.arc(318, 191, 7, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#c8102e'; g.beginPath(); g.arc(318, 191, 4, 0, Math.PI * 2); g.fill();
}
