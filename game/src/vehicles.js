// Vehicles for Solara Bay: bevelled-extrude hero sports car, five SBPD police
// sedans with big readable POLICE door lettering, traffic, scooter, tank,
// searchlight helicopters and the jetpack. High segment counts, flatShading off
// on rounded parts, castShadow on.
import * as THREE from 'three';
import { policeDoorTexture, policeRearTexture } from './textures.js';

function std(color, roughness = 0.35, metalness = 0.55) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

// Rounded car body via bevelled extrusion of a side-profile shape.
export function carBodyShape(len, hgt) {
  const s = new THREE.Shape();
  const L = len / 2, H = hgt;
  s.moveTo(-L, 0.55);
  s.lineTo(-L + 0.5, 0.32);
  s.quadraticCurveTo(-L - 0.15, 0.9, -L + 0.9, 1.05);
  s.lineTo(-L * 0.35, 1.35);
  s.quadraticCurveTo(-L * 0.1, 1.62, L * 0.18, 1.58);
  s.lineTo(L * 0.55, 1.28);
  s.quadraticCurveTo(L + 0.1, 1.05, L, 0.75);
  s.lineTo(L, 0.55);
  s.quadraticCurveTo(L, 0.3, L - 0.4, 0.3);
  s.lineTo(-L + 0.4, 0.3);
  s.quadraticCurveTo(-L, 0.3, -L, 0.55);
  return s;
}

function wheel(r = 0.42) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.32, 28), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9, flatShading: false }));
  tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, 0.34, 24), std(0xd8dde2, 0.25, 0.85));
  hub.rotation.z = Math.PI / 2; g.add(hub);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 12), std(0xff5a3c, 0.3, 0.6));
  cap.position.x = 0.18; g.add(cap);
  return g;
}

export function makeHeroCar() {
  const car = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(carBodyShape(4.6, 1.6), { depth: 1.9, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 4, steps: 1 });
  const body = new THREE.Mesh(bodyGeo, std(0xff5a3c, 0.28, 0.6));
  body.position.z = -0.95; body.castShadow = true;
  car.add(body);
  // cabin glass: smooth rounded box
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.05, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.12, metalness: 0.7, transparent: true, opacity: 0.85, flatShading: false }));
  glass.scale.set(1.3, 0.42, 0.8); glass.position.set(0.1, 1.38, 0); car.add(glass);
  // spoiler + splitter + headlights + taillights
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), std(0x1a1c20, 0.4, 0.7));
  spoiler.position.set(-2.25, 1.35, 0); spoiler.castShadow = true; car.add(spoiler);
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.9), std(0x1a1c20, 0.4, 0.7));
  splitter.position.set(2.3, 0.35, 0); car.add(splitter);
  for (const z of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffedb0, emissiveIntensity: 1.4, flatShading: false }));
    hl.position.set(2.32, 0.85, z); car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xcc0000, emissiveIntensity: 1.2 }));
    tl.position.set(-2.32, 0.9, z); car.add(tl);
  }
  // dented panels: dark crumple patches show the 62% DENTED condition
  const dentMat = new THREE.MeshStandardMaterial({ color: 0x8a2a1a, roughness: 0.8, metalness: 0.3 });
  const dent1 = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), dentMat);
  dent1.scale.set(0.5, 0.4, 1.0); dent1.position.set(-1.2, 0.75, -0.98); car.add(dent1);
  const dent2 = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 12), dentMat);
  dent2.scale.set(0.6, 0.35, 0.9); dent2.position.set(0.9, 0.7, 0.98); car.add(dent2);
  for (const [x, z] of [[1.55, -0.98], [1.55, 0.98], [-1.55, -0.98], [-1.55, 0.98]]) {
    const w = wheel(); w.position.set(x, 0.42, z); car.add(w);
  }
  car.userData.wheels = car.children.filter((c) => c.children.length === 3);
  return car;
}

const doorTex = policeDoorTexture();
const rearTex = policeRearTexture();

export function makePoliceCar(index) {
  const car = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(carBodyShape(4.4, 1.5), { depth: 1.85, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 4, steps: 1 });
  // black-and-white LSPD scheme: white body, black hood + trunk
  const body = new THREE.Mesh(bodyGeo, std(0xf4f6f2, 0.32, 0.5));
  body.position.z = -0.92; body.castShadow = true; car.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 1.7), std(0x14161c, 0.35, 0.5));
  hood.position.set(1.75, 1.08, 0); car.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 1.7), std(0x14161c, 0.35, 0.5));
  trunk.position.set(-1.95, 1.08, 0); car.add(trunk);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), new THREE.MeshStandardMaterial({ color: 0x16283a, roughness: 0.12, metalness: 0.7, transparent: true, opacity: 0.9, flatShading: false }));
  glass.scale.set(1.4, 0.52, 0.82); glass.position.set(0.05, 1.4, 0); car.add(glass);
  // BIG readable POLICE door lettering — canvas texture planes, offset proud
  // of the body surface (body half-depth ~1.05 with bevel)
  for (const z of [-1.12, 1.12]) {
    const door = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 1.0), new THREE.MeshBasicMaterial({ map: doorTex }));
    door.position.set(-0.1, 0.82, z); door.rotation.y = z < 0 ? Math.PI : 0;
    car.add(door);
  }
  const rear = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.42), new THREE.MeshBasicMaterial({ map: rearTex }));
  rear.position.set(-2.42, 0.85, 0); rear.rotation.y = -Math.PI / 2; car.add(rear);
  // red/blue light bar
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.16, 1.5), std(0x1a1c20, 0.4, 0.6));
  bar.position.set(0.05, 1.78, 0); car.add(bar);
  const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.62), new THREE.MeshStandardMaterial({ color: 0xff2020, emissive: 0xff1010, emissiveIntensity: 2.2 }));
  red.position.set(0.05, 1.8, -0.4); car.add(red);
  const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.62), new THREE.MeshStandardMaterial({ color: 0x2050ff, emissive: 0x1030ff, emissiveIntensity: 2.2 }));
  blue.position.set(0.05, 1.8, 0.4); car.add(blue);
  car.userData.redLight = red; car.userData.blueLight = blue;
  // push bar
  const push = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.5, 1.5), std(0x22242a, 0.4, 0.8));
  push.position.set(2.38, 0.6, 0); car.add(push);
  for (const [x, z] of [[1.5, -0.95], [1.5, 0.95], [-1.5, -0.95], [-1.5, 0.95]]) {
    const w = wheel(0.4); w.position.set(x, 0.4, z); car.add(w);
  }
  car.userData.index = index;
  return car;
}

export function makeTrafficCar(color) {
  const car = new THREE.Group();
  const bodyGeo = new THREE.ExtrudeGeometry(carBodyShape(4.2, 1.45), { depth: 1.8, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.1, bevelSegments: 3, steps: 1 });
  const body = new THREE.Mesh(bodyGeo, std(color, 0.35, 0.5));
  body.position.z = -0.9; body.castShadow = true; car.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 14), new THREE.MeshStandardMaterial({ color: 0x1a2a3a, roughness: 0.15, metalness: 0.6, transparent: true, opacity: 0.85, flatShading: false }));
  glass.scale.set(1.35, 0.5, 0.8); glass.position.set(0, 1.35, 0); car.add(glass);
  for (const [x, z] of [[1.45, -0.92], [1.45, 0.92], [-1.45, -0.92], [-1.45, 0.92]]) {
    const w = wheel(0.38); w.position.set(x, 0.38, z); car.add(w);
  }
  return car;
}

export function makeScooter() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 6, 14), std(0xffd23e, 0.35, 0.5));
  body.rotation.z = Math.PI / 2; body.position.y = 0.55; body.castShadow = true; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.5), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8 }));
  seat.position.set(-0.4, 0.95, 0); g.add(seat);
  for (const x of [0.85, -0.75]) {
    const w = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.11, 10, 20), new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.9 }));
    w.position.set(x, 0.32, 0); w.rotation.y = Math.PI / 2; w.castShadow = true; g.add(w);
  }
  return g;
}

export function makeTank() {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 2.8), std(0x4a5a3a, 0.7, 0.3));
  hull.position.y = 0.9; hull.castShadow = true; g.add(hull);
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.8, 24), std(0x55663f, 0.65, 0.3));
  turret.position.y = 1.8; turret.castShadow = true; g.add(turret);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 3.4, 16), std(0x3a4a2e, 0.6, 0.4));
  barrel.rotation.z = Math.PI / 2; barrel.position.set(2.4, 1.9, 0); g.add(barrel);
  for (const z of [-1.45, 1.45]) {
    const track = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 4.4, 6, 14), new THREE.MeshStandardMaterial({ color: 0x22241f, roughness: 0.95, flatShading: false }));
    track.rotation.z = Math.PI / 2; track.position.set(0, 0.55, z); track.castShadow = true; g.add(track);
  }
  return g;
}

// Police helicopter: rounded fuselage, tail, main rotor, searchlight cone.
export function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 28, 20), std(0xf4f6f2, 0.35, 0.4));
  body.scale.set(1.7, 1, 1.1); body.castShadow = true; g.add(body);
  const belly = new THREE.Mesh(new THREE.SphereGeometry(1.2, 24, 16), std(0x14161c, 0.4, 0.5));
  belly.scale.set(1.5, 0.6, 0.95); belly.position.y = -0.7; g.add(belly);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x16283a, roughness: 0.1, metalness: 0.7, transparent: true, opacity: 0.9, flatShading: false }));
  glass.scale.set(0.9, 0.7, 1.0); glass.position.set(1.6, 0.2, 0); g.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.3, 0.1), new THREE.MeshStandardMaterial({ color: 0xc8102e, roughness: 0.4 }));
  stripe.position.set(0, 0.1, 1.78); g.add(stripe);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.5, 4.6, 16), std(0xf4f6f2, 0.35, 0.4));
  tail.rotation.z = Math.PI / 2; tail.position.set(-4.2, 0.5, 0); tail.castShadow = true; g.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.2), std(0xc8102e, 0.4, 0.4));
  fin.position.set(-6.4, 1.1, 0); g.add(fin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.9, 10), std(0x22242a, 0.5, 0.6));
  mast.position.y = 1.9; g.add(mast);
  const rotor = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.42), std(0x1a1c20, 0.4, 0.6));
    blade.rotation.y = (i / 4) * Math.PI; rotor.add(blade);
  }
  rotor.position.y = 2.35; g.add(rotor); g.userData.rotor = rotor;
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.8, 0.3), std(0x1a1c20, 0.4, 0.6));
  tailRotor.position.set(-6.4, 0.9, 0.5); g.add(tailRotor);
  // searchlight cone: translucent, aimed down
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(6.5, 26, 24, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, fog: false }),
  );
  cone.position.y = -14; g.add(cone); g.userData.cone = cone;
  const spot = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 10), new THREE.MeshStandardMaterial({ color: 0xfff6c0, emissive: 0xffe9a0, emissiveIntensity: 2 }));
  spot.position.set(0, -1.2, 0); g.add(spot);
  // POLICE on the side
  const label = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.7), new THREE.MeshBasicMaterial({ map: policeDoorTexture() }));
  label.position.set(0, 0.2, 1.8); g.add(label);
  const label2 = label.clone(); label2.rotation.y = Math.PI; label2.position.z = -1.8; g.add(label2);
  return g;
}

// Jetpack: twin tanks, nozzles, flame cone, harness straps.
export function makeJetpack() {
  const g = new THREE.Group();
  for (const z of [-0.3, 0.3]) {
    const tank = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.7, 6, 16), std(0xd8dde2, 0.25, 0.9));
    tank.position.set(0, 0.1, z); tank.castShadow = true; g.add(tank);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.3, 14), std(0x22242a, 0.4, 0.8));
    nozzle.position.set(0, -0.5, z); g.add(nozzle);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 1.6, 14),
      new THREE.MeshBasicMaterial({ color: 0xffa030, transparent: true, opacity: 0.9, fog: false }),
    );
    flame.rotation.x = Math.PI; flame.position.set(0, -1.4, z); g.add(flame);
    const core = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 1.1, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.95, fog: false }),
    );
    core.rotation.x = Math.PI; core.position.set(0, -1.3, z); g.add(core);
    g.userData['flame' + (z < 0 ? 'L' : 'R')] = flame;
  }
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.9), new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8 }));
  strap.position.set(0, 0.45, 0); g.add(strap);
  const light = new THREE.PointLight(0xffa030, 12, 14, 1.6);
  light.position.set(0, -1.2, 0); g.add(light);
  g.userData.flameLight = light;
  return g;
}
