// Staged screenshot setups for Solara Bay (?shot=cover|foot|chase|meta).
// Each shot is a fully staged, deterministic frame of the live game — the same
// scene, lighting and HUD the player sees, frozen at its most dramatic beat.
// Cover rule: all five police cars separately visible, no overlap hiding a car,
// POLICE lettering big and readable, heli fully framed.
import { MISSIONS } from './missions.js';
import { showBanner, toggleMeta, renderMeta } from './hud.js';

function faceNorth(obj, yaw = 0) { obj.rotation.y = Math.PI / 2 + yaw; } // model front +X -> -Z

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
    G.player.position.set(12, 0, 46); G.player.rotation.y = 2.58; G.player.visible = true;
    G.playerPos.set(12, 0, 46); G.heading = 2.58;
    // enemies: one guard standing, one guard aiming, one DOWNED with red ring
    G.guards[0].position.set(22, 0, 30); G.guards[0].rotation.y = -0.4; G.guards[0].visible = true;
    G.guards[1].position.set(20, 0, 24); G.guards[1].rotation.y = -0.2; G.guards[1].visible = true;
    G.downed.position.set(14, 0, 40); G.downed.rotation.y = 0.7; G.downed.visible = true;
    G.policeCars.forEach((p, i) => { p.position.set(-7 + i * 3, 0, 60 + i * 8); faceNorth(p); p.visible = i < 2; });
    G.helis.forEach((h) => { h.visible = false; });
    // muzzle flash + tracer live at the player's gun
    G.fireFlash(12.8, 1.5, 45, 22, 1.4, 30);
    // over-shoulder camera: player big, FRUIT sign huge and fully in frame
    G.camera.position.set(6, 3.2, 56);
    G.camera.lookAt(17, 2, 32);
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
