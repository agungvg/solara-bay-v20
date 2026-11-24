// Procedural canvas textures for Solara Bay. Everything is drawn in code with a
// seeded RNG so the look is identical on every load — no downloaded images.
// All colour maps are tagged sRGB; facades are 1024x1024 so close-up walls read
// as modelled surfaces, never flat colour slabs.
import * as THREE from 'three';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function toTex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.RepeatWrapping; }
  return t;
}

// Warm stucco facade with lit windows, balconies, cornice shading and speckle.
// Never a flat slab: every wall carries windows, shadow lines and grain.
export function facadeTexture(seed, base, trim, lit = 0.45) {
  const rnd = mulberry32(seed);
  const [c, g] = canvas(1024, 1024);
  const grad = g.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, base); grad.addColorStop(0.75, shade(base, -14)); grad.addColorStop(1, shade(base, -30));
  g.fillStyle = grad; g.fillRect(0, 0, 1024, 1024);
  // stucco speckle
  for (let i = 0; i < 5200; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    g.fillRect(rnd() * 1024, rnd() * 1024, 2 + rnd() * 3, 2 + rnd() * 3);
  }
  // cornice bands
  g.fillStyle = trim; g.fillRect(0, 0, 1024, 26); g.fillRect(0, 340, 1024, 16); g.fillRect(0, 682, 1024, 16);
  g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(0, 26, 1024, 8); g.fillRect(0, 356, 1024, 6); g.fillRect(0, 698, 1024, 6);
  // window grid: warm lit glass, cool glass, frames, sills, awnings
  const cols = 6, rows = 3;
  for (let r = 0; r < rows; r++) for (let col = 0; col < cols; col++) {
    const x = 52 + col * 162, y = 78 + r * 342, w = 104, h = 190;
    const litWin = rnd() < lit;
    const wg = g.createLinearGradient(x, y, x, y + h);
    if (litWin) { wg.addColorStop(0, '#ffe9a0'); wg.addColorStop(1, '#ff9d4d'); }
    else { wg.addColorStop(0, '#2c4a63'); wg.addColorStop(1, '#16283a'); }
    g.fillStyle = '#1c1c22'; g.fillRect(x - 7, y - 7, w + 14, h + 14);
    g.fillStyle = wg; g.fillRect(x, y, w, h);
    g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x, y, w, 10);
    g.fillStyle = '#1c1c22'; g.fillRect(x + w / 2 - 3, y, 6, h); g.fillRect(x, y + h / 2 - 3, w, 6);
    g.fillStyle = trim; g.fillRect(x - 10, y + h + 6, w + 20, 12);
    // balcony rail on some windows
    if (rnd() < 0.4) {
      g.strokeStyle = 'rgba(20,20,26,0.85)'; g.lineWidth = 4;
      g.strokeRect(x - 12, y + h + 22, w + 24, 46);
      for (let b = 0; b < 6; b++) { g.beginPath(); g.moveTo(x - 2 + b * 20, y + h + 22); g.lineTo(x - 2 + b * 20, y + h + 68); g.stroke(); }
    }
    // striped awning on some windows
    if (rnd() < 0.35) {
      for (let s = 0; s < 6; s++) { g.fillStyle = s % 2 ? '#f2ede0' : '#d94f3d'; g.fillRect(x - 8 + s * 20, y - 34, 20, 28); }
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - 8, y - 8, w + 16, 6);
    }
  }
  // ground-floor shopfront band
  g.fillStyle = shade(base, -42); g.fillRect(0, 900, 1024, 124);
  g.fillStyle = trim; g.fillRect(0, 892, 1024, 10);
  for (let s = 0; s < 4; s++) {
    const x = 40 + s * 250;
    g.fillStyle = '#1d2f45'; g.fillRect(x, 930, 190, 80);
    g.fillStyle = 'rgba(255,220,140,0.85)'; g.fillRect(x + 8, 938, 174, 20);
    g.fillStyle = '#222'; g.font = 'bold 15px Arial'; g.fillText(['CAFE', 'TACOS', 'SURF', 'BAR'][s], x + 14, 953);
  }
  return toTex(c);
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const gg = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${gg},${b})`;
}

// Boulevard asphalt: smooth gradient, soft lane dashes, tyre wear, skid marks.
export function roadTexture() {
  const [c, g] = canvas(512, 1024);
  const grad = g.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0, '#3a3d44'); grad.addColorStop(0.5, '#45484f'); grad.addColorStop(1, '#383b42');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 1024);
  const rnd = mulberry32(77);
  for (let i = 0; i < 2600; i++) { g.fillStyle = rnd() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.07)'; g.fillRect(rnd() * 512, rnd() * 1024, 2, 2); }
  // centre double yellow
  g.fillStyle = '#d8a928'; g.fillRect(246, 0, 8, 1024); g.fillRect(258, 0, 8, 1024);
  // lane dashes
  g.fillStyle = 'rgba(240,240,230,0.85)';
  for (const x of [128, 384]) for (let y = 0; y < 1024; y += 128) g.fillRect(x - 4, y, 8, 64);
  // edge lines
  g.fillStyle = 'rgba(240,240,230,0.7)'; g.fillRect(14, 0, 5, 1024); g.fillRect(493, 0, 5, 1024);
  // skid marks: dark curved sweeps
  for (let i = 0; i < 7; i++) {
    g.strokeStyle = 'rgba(12,12,14,0.5)'; g.lineWidth = 7 + rnd() * 5; g.beginPath();
    const x = 60 + rnd() * 380, y = rnd() * 900;
    g.moveTo(x, y); g.quadraticCurveTo(x + (rnd() - 0.5) * 90, y + 60, x + (rnd() - 0.5) * 130, y + 120); g.stroke();
  }
  const t = toTex(c, true); t.repeat.set(1, 10); return t;
}

// Big readable POLICE door lettering on a white door panel.
export function policeDoorTexture() {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#f4f6f2'; g.fillRect(0, 0, 512, 256);
  g.fillStyle = '#14161c'; g.font = '900 92px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POLICE', 256, 108);
  g.fillStyle = '#c8102e'; g.fillRect(56, 178, 400, 10);
  g.fillStyle = '#14161c'; g.font = '700 34px Arial'; g.fillText('S B P D', 256, 222);
  return toTex(c);
}

export function policeRearTexture() {
  const [c, g] = canvas(512, 128);
  g.fillStyle = '#14161c'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#f4f6f2'; g.font = '900 64px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POLICE', 256, 62);
  return toTex(c);
}

// Huge legible FRUIT market sign — warm wood, big red letters, painted fruit dots.
export function fruitSignTexture() {
  const [c, g] = canvas(1024, 384);
  g.fillStyle = '#7a4a21'; g.fillRect(0, 0, 1024, 384);
  g.fillStyle = '#8f5a2a';
  for (let x = 0; x < 1024; x += 128) g.fillRect(x, 0, 6, 384);
  g.strokeStyle = '#5d3413'; g.lineWidth = 10; g.strokeRect(8, 8, 1008, 368);
  g.fillStyle = '#ffe9a8'; g.font = '900 190px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('FRUIT', 512, 178);
  g.fillStyle = '#ff5a3c'; g.font = '800 64px Arial';
  g.fillText('FRESH  •  LOCAL  •  2 FOR $5', 512, 322);
  // painted fruit row
  const fruits = ['#ff7a2e', '#ffd23e', '#7ddb4a', '#ff4d6d', '#b678e8'];
  for (let i = 0; i < 5; i++) {
    g.fillStyle = fruits[i]; g.beginPath(); g.arc(120 + i * 195, 60, 26, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2f7a2e'; g.fillRect(112 + i * 195, 26, 16, 14);
  }
  return toTex(c);
}

// Soft white puff cloud sprite — radial gradient, no grey pancake underside.
export function cloudSpriteTexture() {
  const [c, g] = canvas(256, 256);
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 126);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
  return toTex(c);
}

export function sandTexture() {
  const rnd = mulberry32(31);
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#e8d5a4'; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    g.fillStyle = rnd() > 0.5 ? 'rgba(255,244,214,0.5)' : 'rgba(160,130,80,0.35)';
    g.fillRect(rnd() * 512, rnd() * 512, 2, 2);
  }
  g.strokeStyle = 'rgba(190,160,110,0.5)'; g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { g.beginPath(); g.moveTo(0, rnd() * 512); g.bezierCurveTo(170, rnd() * 512, 340, rnd() * 512, 512, rnd() * 512); g.stroke(); }
  const t = toTex(c, true); t.repeat.set(6, 14); return t;
}

export function oceanTexture() {
  const rnd = mulberry32(55);
  const [c, g] = canvas(512, 512);
  const grad = g.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#1e7fa8'); grad.addColorStop(0.5, '#2aa3c8'); grad.addColorStop(1, '#17678f');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(255,255,255,0.28)'; g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {
    g.beginPath(); const y = rnd() * 512;
    g.moveTo(rnd() * 200, y); g.quadraticCurveTo(256, y + (rnd() - 0.5) * 24, 512, y + (rnd() - 0.5) * 18); g.stroke();
  }
  const t = toTex(c, true); t.repeat.set(8, 8); return t;
}

export function sailTexture() {
  const [c, g] = canvas(256, 512);
  g.fillStyle = '#fdf6e3'; g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#ff5a3c'; g.beginPath(); g.moveTo(0, 90); g.lineTo(256, 60); g.lineTo(256, 150); g.lineTo(0, 180); g.closePath(); g.fill();
  g.fillStyle = '#ffb400'; g.beginPath(); g.moveTo(0, 260); g.lineTo(256, 240); g.lineTo(256, 300); g.lineTo(0, 320); g.closePath(); g.fill();
  g.fillStyle = '#1e6f9f'; g.beginPath(); g.moveTo(0, 420); g.lineTo(256, 410); g.lineTo(256, 452); g.lineTo(0, 462); g.closePath(); g.fill();
  return toTex(c);
}

export function awningTexture(c1, c2) {
  const [c, g] = canvas(256, 128);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? c1 : c2; g.fillRect(i * 32, 0, 32, 128); }
  g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, 104, 256, 24);
  return toTex(c);
}

// Generic bold sign: big text on a coloured board.
export function signTexture(text, bg, fg, sub = '') {
  const [c, g] = canvas(1024, 256);
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 8; g.strokeRect(10, 10, 1004, 236);
  g.fillStyle = fg; g.font = '900 120px Arial'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 512, sub ? 108 : 128);
  if (sub) { g.font = '700 52px Arial'; g.fillText(sub, 512, 208); }
  return toTex(c);
}

// Glowing muzzle-flash sprite.
export function flashTexture() {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, 'rgba(255,255,220,1)');
  grad.addColorStop(0.35, 'rgba(255,190,60,0.9)');
  grad.addColorStop(1, 'rgba(255,80,0,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  return toTex(c);
}
