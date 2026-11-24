// Staged screenshot setups for Solara Bay (?shot=cover|foot|chase|meta).
// Each shot is a fully staged, deterministic frame of the live game — the same
// scene, lighting and HUD the player sees, frozen at its most dramatic beat.
// Cover rule: all five police cars separately visible, no overlap hiding a car,
// POLICE lettering big and readable, heli fully framed.
import * as THREE from 'three';
import { MISSIONS } from './missions.js';
import { showBanner, toggleMeta, renderMeta } from './hud.js';
import { flashTexture } from './textures.js';

function faceNorth(obj, yaw = 0) { obj.rotation.y = Math.PI / 2 + yaw; } // model front +X -> -Z

// Foot-shot-only combat effects: a THICK sharp tracer (hot white core inside
// a wide orange glow) plus a big hard muzzle flash. The shared fireFlash
// bolt is thin by design (it also serves the chase shot), so the foot shot
// layers these static bolts on top — cover/chase never call them.
function heavyTracer(G, ax, ay, az, bx, by, bz, coreR = 0.08, glowR = 0.18, coreColor = 0xfff6c0, glowColor = 0xff7a1a) {
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz);
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const unit = dir.clone().normalize();
  for (const [r, color, opacity] of [[glowR, glowColor, 0.45], [coreR, coreColor, 1.0]]) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 8, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, fog: false }),
    );
    bolt.position.copy(a).addScaledVector(dir, 0.5);
    bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), unit);
    G.scene.add(bolt);
  }
}

function bigFlash(G, x, y, z, scale = 3.8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), transparent: true, opacity: 1, depthWrite: false, fog: false }));
  s.position.set(x, y, z);
  s.scale.set(scale, scale, 1);
  G.scene.add(s);
}

// Foot-shot-only fruit crate: wooden box + a smaller box on top, so the
// market spills into the foreground instead of bare sidewalk.
function addCrate(G, x, z, s = 1, ry = 0.3) {
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.9 });
  const woodDark = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(s, s * 0.7, s), wood);
  box.position.set(x, s * 0.35, z); box.rotation.y = ry; box.castShadow = true;
  G.scene.add(box);
  const top = new THREE.Mesh(new THREE.BoxGeometry(s * 0.7, s * 0.45, s * 0.7), woodDark);
  top.position.set(x, s * 0.7 + s * 0.22, z); top.rotation.y = ry + 0.5; top.castShadow = true;
  G.scene.add(top);
  // fruit piled on the crate: smooth spheres, market colours
  const cols = [0xff7a2e, 0xffd23e, 0x7ddb4a];
  for (let i = 0; i < 3; i++) {
    const fr = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.5 }));
    fr.position.set(x - 0.2 + i * 0.2, s * 0.7 + s * 0.45 + 0.14, z + (i % 2 ? 0.12 : -0.1));
    fr.castShadow = true;
    G.scene.add(fr);
  }
}

export function applyShot(G, name) {
  const W = G.world;
  if (name === 'cover') {
    W.setPreset('noon');
    G.missionRunner.start(MISSIONS[5]);
    G.cash = 18450; G.clockTime = '12:00';
    G.wanted.level = 5; G.wanted.heat = 100;
    G.speedKmh = 111; G.health = 88; G.carDamage = 62;
    G.inCar = true; G.jetpackOn = false;
    // hero large and central, heading north up the boulevard
    G.hero.position.set(0, 0, 8); faceNorth(G.hero);
    G.hero.visible = true; G.player.visible = false;
    // FIVE police cars: spread across lanes at different depths, slight yaw
    // so the POLICE door lettering reads — none overlapping another
    const spots = [[-6.5, 17, 0.35], [5.5, 16, -0.35], [-8, 2, -0.5], [6.5, -10, 0.3], [-5, -26, -0.2]];
    G.policeCars.forEach((p, i) => {
      p.position.set(spots[i][0], 0, spots[i][1]);
      faceNorth(p, spots[i][2]); p.visible = true;
    });
    // one helicopter, fully framed upper right, searchlight cone on
    G.helis[0].position.set(6, 15, -32); G.helis[0].visible = true;
    G.helis[1].visible = false;
    G.helis.forEach((h) => { h.userData.rotor.rotation.y = 0.6; });
    // traffic for depth
    G.traffic[0].position.set(-3, 0, -44); faceNorth(G.traffic[0]); G.traffic[0].visible = true;
    G.traffic[1].position.set(7, 0, -58); faceNorth(G.traffic[1]); G.traffic[1].visible = true;
    G.traffic[2].position.set(-6, 0, 34); faceNorth(G.traffic[2]); G.traffic[2].visible = true;
    // low dynamic camera behind the hero, yacht + wheel in the frame
    G.camera.position.set(6.5, 5.5, 27);
    G.camera.lookAt(-10, 2, -12);
    G.playerPos.set(0, 0, 8); G.heading = Math.PI;
    G.waypoint.set(0, 0, -60);
  } else if (name === 'foot') {
    W.setPreset('noon');
    G.missionRunner.start(MISSIONS[1]);
    G.missionRunner.dropped = 1;
    G.cash = 7270; G.clockTime = '14:30';
    G.wanted.level = 2; G.wanted.heat = 80;
    G.speedKmh = 0; G.health = 92; G.carDamage = 18;
    G.inCar = false; G.jetpackOn = false;
    G.hero.position.set(2, 0, 20); G.hero.rotation.y = Math.PI / 2; G.hero.visible = true;
    // player BIG and close: camera ~7 units behind her shoulder, FRUIT sign
    // still huge and fully in frame above the stalls
    G.player.position.set(13, 0, 46); G.player.rotation.y = 2.06; G.player.visible = true;
    G.playerPos.set(13, 0, 46); G.heading = 2.06;
    // guards: closer, scaled up, in front of the stalls — not behind them.
    // Guard 0 stands LATERALLY in the market lane (east of the player), so
    // the tracer crosses the frame instead of vanishing away from the camera.
    G.guards[0].position.set(23.5, 0, 40.5); G.guards[0].rotation.y = -1.1; G.guards[0].scale.setScalar(1.25); G.guards[0].visible = true;
    G.guards[1].position.set(22.5, 0, 29.5); G.guards[1].rotation.y = -0.2; G.guards[1].scale.setScalar(1.25); G.guards[1].visible = true;
    // DOWNED enemy: LARGE, on the OPEN sidewalk left-centre foreground — the
    // near stalls occlude everything behind them from this close camera, so
    // the body goes where nothing stands between it and the lens: clear of
    // the player, the sign post and the minimap, red ring on open pavement
    G.downed.position.set(12.0, 0, 42.5); G.downed.rotation.y = 0.9; G.downed.scale.setScalar(1.6); G.downed.visible = true;
    G.policeCars.forEach((p, i) => { p.position.set(-7 + i * 3, 0, 60 + i * 8); faceNorth(p); p.visible = i < 2; });
    G.helis.forEach((h) => { h.visible = false; });
    // DENSE crowd: ten peds pulled into the frame — foreground figures at the
    // bottom edge, more around the stalls and the FRUIT sign — frozen in place
    const crowdSpots = [
      [7.8, 48.0, 2.4], [19.8, 48.5, -2.2], [9.2, 47.2, 3.1], [9.0, 42.0, 2.2],
      [14.5, 42.5, -0.5], [15.0, 36.5, 0.9], [25.5, 43.0, -1.2], [19.0, 30.5, 2.9],
      [24.0, 35.0, -2.0], [11.5, 39.5, 1.4],
    ];
    crowdSpots.forEach(([x, z, ry], i) => {
      const p = G.crowd[i];
      if (!p) return;
      p.position.set(x, 0, z); p.rotation.y = ry; p.userData.walking = false;
    });
    // FILL the lower third: fruit crates spilling onto the sidewalk foreground
    addCrate(G, 17.8, 48.5, 1.1, 0.3);
    addCrate(G, 21.8, 45.0, 0.9, -0.2);
    addCrate(G, 24.5, 44.0, 1.0, 0.6);
    // STRONG shooting: thick sharp tracer + big hard muzzle flash from the
    // player, and a return-fire tracer + flash from the guard — a shootout,
    // not a soft glow. The bolt runs laterally across the frame (player east
    // to the guard in the market lane), so it reads as a bolt, not a dot.
    G.fireFlash(14.1, 1.5, 45.4, 23.5, 1.3, 40.5);
    heavyTracer(G, 14.1, 1.5, 45.4, 23.5, 1.3, 40.5, 0.11, 0.24);
    heavyTracer(G, 14.1, 1.85, 45.4, 23.5, 1.6, 40.5, 0.05, 0.13);
    bigFlash(G, 14.1, 1.5, 45.4, 3.0);
    heavyTracer(G, 23.5, 1.4, 40.5, 14.0, 1.2, 45.8, 0.05, 0.13, 0xffd0a0, 0xff5020);
    bigFlash(G, 23.3, 1.4, 40.7, 2.2);
    // close over-shoulder camera, turned a touch east so the road wedge
    // shrinks: player big, FRUIT sign huge and fully in frame
    G.camera.position.set(10.5, 2.3, 52.5);
    G.camera.lookAt(16.5, 1.6, 38);
    G.waypoint.set(22, 0, 26);
  } else if (name === 'chase') {
    W.setPreset('golden');
    G.missionRunner.start(MISSIONS[2]);
    G.cash = 12860; G.clockTime = '17:45';
    G.wanted.level = 3; G.wanted.heat = 100;
    G.speedKmh = 110; G.health = 95; G.carDamage = 62;
    G.inCar = false; G.jetpackOn = true; G.fuel = 82;
    G.hero.position.set(4, 0, 30); faceNorth(G.hero); G.hero.visible = true;
    // player on the jetpack, centre frame, flame clearly visible
    G.player.position.set(0, 14, 0); G.player.rotation.y = Math.PI; G.player.visible = true;
    G.jetpack.position.set(0, 13.6, 0.55); G.jetpack.visible = true;
    G.playerPos.set(0, 14, 0); G.heading = Math.PI;
    // TWO helicopters, both fully framed, neither at the frame edge, cones on
    G.helis[0].position.set(-20, 28, -20); G.helis[0].visible = true;
    G.helis[1].position.set(14, 21, -38); G.helis[1].visible = true;
    G.helis.forEach((h) => { h.userData.rotor.rotation.y = 0.9; });
    G.policeCars.forEach((p, i) => { p.position.set(-6 + i * 4, 0, 26 + i * 6); faceNorth(p); p.visible = i < 3; });
    // tracers arcing from both helis toward the player
    G.fireTracer(-20, 27, -20, 0, 14.5, 0);
    G.fireTracer(14, 20, -38, 0, 14.5, 0);
    // low camera looking slightly up — escape under fire, not a hover
    G.camera.position.set(7, 13, 15);
    G.camera.lookAt(0, 14, -4);
    G.waypoint.set(0, 0, -80);
  } else if (name === 'meta') {
    W.setPreset('noon');
    G.missionRunner.start(MISSIONS[6]);
    G.cash = 21340; G.clockTime = '16:20';
    G.wanted.level = 0;
    try {
      localStorage.setItem('solara-saves', JSON.stringify([
        'M6 · $18,450 · 12:00', 'M4 · $15,400 · 20:15', 'M2 · $7,270 · 14:30',
      ]));
    } catch (e) { /* storage unavailable in some sandboxes */ }
    renderMeta();
    toggleMeta(true);
    G.camera.position.set(0, 30, 60);
    G.camera.lookAt(0, 0, 0);
  }
  G.shotMode = name;
}
