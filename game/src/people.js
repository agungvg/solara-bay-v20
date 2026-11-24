// People of Solara Bay: jointed pedestrians with varied proportions, caps,
// jackets and readable poses — no doll-like identical figures. Player, armed
// guards, enemies and a downed enemy with a pulsing red ring.
import * as THREE from 'three';
import { mulberry32 } from './textures.js';

const SKINS = [0xe8b98a, 0xc98d5f, 0x8a5a34, 0xf2c9a0, 0x6e4426];
const SHIRTS = [0xff5a3c, 0x2aa3c8, 0xffd23e, 0x7ddb4a, 0xff4d6d, 0x7d5ba6, 0xf4f6f2, 0x2a9d8f];
const PANTS = [0x2a3550, 0x3a3a3a, 0x5a4a6a, 0x8a6a42, 0x22303a];

function std(color, roughness = 0.85) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, flatShading: false });
}

// A jointed person: torso capsule, head sphere, limbs as capsules, optional cap.
// heightScale / bulk vary proportions per person.
export function makePed(opts = {}) {
  const rnd = mulberry32(opts.seed || 7);
  const skin = opts.skin ?? SKINS[Math.floor(rnd() * SKINS.length)];
  const shirt = opts.shirt ?? SHIRTS[Math.floor(rnd() * SHIRTS.length)];
  const pants = opts.pants ?? PANTS[Math.floor(rnd() * PANTS.length)];
  const hs = opts.height ?? (0.92 + rnd() * 0.2);
  const bulk = opts.bulk ?? (0.85 + rnd() * 0.35);
  const g = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26 * bulk, 0.5, 6, 16), std(shirt));
  torso.position.y = 1.05 * hs; torso.castShadow = true; g.add(torso);
  // jacket shoulders
  const jacket = new THREE.Mesh(new THREE.SphereGeometry(0.3 * bulk, 18, 12), std(opts.jacket ?? shirt, 0.8));
  jacket.scale.set(1.15, 0.55, 0.9); jacket.position.y = 1.32 * hs; g.add(jacket);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 20, 16), std(skin, 0.6));
  head.position.y = 1.62 * hs; head.castShadow = true; g.add(head);
  // hair / cap
  if (opts.cap) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), std(opts.capColor ?? 0xc8102e, 0.7));
    cap.position.y = 1.66 * hs; g.add(cap);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16, 1, false, 0, Math.PI), std(opts.capColor ?? 0xc8102e, 0.7));
    brim.position.set(0, 1.66 * hs, 0.14); brim.rotation.x = 0.15; g.add(brim);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.215, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2.2), std(opts.hair ?? 0x1a1410, 0.9));
    hair.position.y = 1.64 * hs; g.add(hair);
  }
  // arms: shoulder pivots so poses can aim / wave / run
  const arms = {};
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.3 * bulk, 1.38 * hs, 0);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.45, 4, 12), std(shirt));
    arm.position.y = -0.28; arm.castShadow = true; pivot.add(arm);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), std(skin, 0.6));
    hand.position.y = -0.58; pivot.add(hand);
    g.add(pivot); arms[side < 0 ? 'L' : 'R'] = pivot;
  }
  // legs
  const legs = {};
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.13, 0.78 * hs, 0);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 12), std(pants));
    leg.position.y = -0.36; leg.castShadow = true; pivot.add(leg);
    const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.3), std(0xf4f6f2, 0.6));
    shoe.position.set(0, -0.74, 0.05); pivot.add(shoe);
    g.add(pivot); legs[side < 0 ? 'L' : 'R'] = pivot;
  }
  g.userData = { ...g.userData, arms, legs, hs, walkPhase: rnd() * Math.PI * 2, seed: opts.seed || 7 };
  return g;
}

// Player: Mara Voss — red cap, black jacket, white tee, readable aiming pose.
export function makePlayer() {
  const p = makePed({ seed: 42, height: 1.0, bulk: 0.95, shirt: 0xf4f6f2, jacket: 0x1a1c20, cap: true, capColor: 0xc8102e, skin: 0xe8b98a });
  // pistol in right hand
  const gun = new THREE.Group();
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.07, 0.09), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.35, metalness: 0.8 }));
  gun.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.18, 0.08), new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.6, metalness: 0.5 }));
  grip.position.set(-0.1, -0.1, 0); gun.add(grip);
  gun.position.set(0, -0.58, 0.08);
  p.userData.arms.R.add(gun);
  p.userData.gun = gun;
  // aiming pose: right arm forward, left arm across
  p.userData.arms.R.rotation.x = -Math.PI / 2 + 0.12;
  p.userData.arms.L.rotation.x = -Math.PI / 2 + 0.35;
  p.userData.arms.L.rotation.y = 0.5;
  return p;
}

export function makeGuard(seed) {
  const g = makePed({ seed, height: 1.04, bulk: 1.15, shirt: 0x2a3550, jacket: 0x14161c, cap: true, capColor: 0x14161c });
  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.3), std(0x1a1c20, 0.7));
  vest.position.y = 1.1; g.add(vest);
  const rifle = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.12), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.4, metalness: 0.7 }));
  rifle.add(body);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.09), new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.6, roughness: 0.5 }));
  mag.position.set(0.05, -0.14, 0); rifle.add(mag);
  rifle.position.set(0, -0.58, 0.1);
  g.userData.arms.R.add(rifle);
  g.userData.arms.R.rotation.x = -Math.PI / 2 + 0.1;
  g.userData.arms.L.rotation.x = -Math.PI / 2 + 0.3;
  return g;
}

// Downed enemy lying on the ground with a pulsing red ring marker.
export function makeDowned(seed = 5) {
  const g = new THREE.Group();
  const body = makePed({ seed, height: 0.98, bulk: 1.05, shirt: 0x7d5ba6 });
  body.rotation.x = -Math.PI / 2 + 0.08;
  body.position.y = 0.28;
  g.add(body);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.25, 32),
    new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.85, side: THREE.DoubleSide, fog: false }),
  );
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.12; g.add(ring);
  const ring2 = new THREE.Mesh(
    new THREE.RingGeometry(1.3, 1.42, 32),
    new THREE.MeshBasicMaterial({ color: 0xff8080, transparent: true, opacity: 0.5, side: THREE.DoubleSide, fog: false }),
  );
  ring2.rotation.x = -Math.PI / 2; ring2.position.y = 0.12; g.add(ring2);
  g.userData.ring = ring; g.userData.ring2 = ring2;
  return g;
}

// Crowd: 26 varied pedestrians scattered through the market and sidewalks.
export function makeCrowd(scene) {
  const rnd = mulberry32(5150);
  const crowd = [];
  const spots = [];
  for (let i = 0; i < 14; i++) spots.push([15 + rnd() * 11, 22 + rnd() * 34]);
  for (let i = 0; i < 8; i++) spots.push([14.5 + rnd() * 1.5, -120 + rnd() * 260]);
  for (let i = 0; i < 4; i++) spots.push([-14.5 - rnd() * 1.5, -80 + rnd() * 160]);
  for (const [x, z] of spots) {
    const p = makePed({ seed: Math.floor(rnd() * 9000) + 10 });
    p.position.set(x, 0, z);
    p.rotation.y = rnd() * Math.PI * 2;
    p.userData.walking = rnd() < 0.6;
    p.userData.speed = 0.6 + rnd() * 0.9;
    scene.add(p);
    crowd.push(p);
  }
  return crowd;
}

export function updateCrowd(crowd, dt, t) {
  for (const p of crowd) {
    if (!p.userData.walking) continue;
    p.userData.walkPhase += dt * 6 * p.userData.speed;
    const ph = p.userData.walkPhase;
    p.userData.legs.L.rotation.x = Math.sin(ph) * 0.5;
    p.userData.legs.R.rotation.x = -Math.sin(ph) * 0.5;
    p.userData.arms.L.rotation.x = -Math.sin(ph) * 0.4;
    p.userData.arms.R.rotation.x = Math.sin(ph) * 0.4;
    p.position.x += Math.sin(p.rotation.y) * dt * p.userData.speed * 0.9;
    p.position.z += Math.cos(p.rotation.y) * dt * p.userData.speed * 0.9;
    if (p.position.z > 150 || p.position.z < -150 || Math.abs(p.position.x) > 60) p.rotation.y += Math.PI * (0.5 + Math.random() * 0.5);
  }
}
