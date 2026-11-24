// Solara Bay world: sky dome + sun + clouds, boulevard, beach, ocean, yacht,
// pier, Ferris wheel, lantern market, palms and a warm-facade city skyline.
// Smoothness rules applied throughout: high segment counts (24-32), flatShading
// off on organic shapes, bevelled extrusions, 1024px facades, one shadow sun.
import * as THREE from 'three';
import { facadeTexture, roadTexture, sandTexture, oceanTexture, sailTexture, awningTexture, fruitSignTexture, signTexture, cloudSpriteTexture, mulberry32 } from './textures.js';

export const PRESETS = {
  noon: {
    zenith: 0x2f7fd0, mid: 0x7ec3ee, horizon: 0xcfe9f7, fog: 0xcfe9f7,
    sunColor: 0xfff6e0, sunI: 3.0, sunPos: [60, 110, 30], hemiSky: 0xbfe3ff, hemiGround: 0x8a7a5a, hemiI: 0.9,
    exposure: 1.05, cloudTint: 0xffffff, cloudOpacity: 0.92,
  },
  golden: {
    zenith: 0x3a2a6e, mid: 0xe86a4a, horizon: 0xffb347, fog: 0xff9e5e,
    sunColor: 0xffb347, sunI: 2.6, sunPos: [-110, 22, -40], hemiSky: 0xff9e7a, hemiGround: 0x5a3a28, hemiI: 0.75,
    exposure: 1.12, cloudTint: 0xffd9b0, cloudOpacity: 0.95,
  },
};

export function buildWorld(G) {
  const scene = G.scene;
  const rnd = mulberry32(20261124);

  // ---- sky dome: 3-stop gradient + sun glow, one sun direction shared by all ----
  const skyUniforms = {
    uZenith: { value: new THREE.Color(PRESETS.noon.zenith) },
    uMid: { value: new THREE.Color(PRESETS.noon.mid) },
    uHorizon: { value: new THREE.Color(PRESETS.noon.horizon) },
    uSunDir: { value: new THREE.Vector3(0.4, 0.8, 0.2).normalize() },
    uSunColor: { value: new THREE.Color(0xfff2c0) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(880, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: skyUniforms,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `varying vec3 vDir; uniform vec3 uZenith,uMid,uHorizon,uSunColor; uniform vec3 uSunDir;
        void main(){
          float h = clamp(vDir.y, -0.08, 1.0);
          vec3 col = mix(uHorizon, uMid, smoothstep(0.0, 0.28, h));
          col = mix(col, uZenith, smoothstep(0.25, 0.85, h));
          float s = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
          col += uSunColor * (pow(s, 220.0) * 1.4 + pow(s, 10.0) * 0.35);
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -1;
  scene.add(sky);

  // ---- lights: ONE shadow-casting sun + hemisphere fill ----
  const sun = new THREE.DirectionalLight(PRESETS.noon.sunColor, PRESETS.noon.sunI);
  sun.position.set(60, 110, 30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90;
  sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90;
  sun.shadow.camera.near = 10; sun.shadow.camera.far = 320;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03;
  scene.add(sun); scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(PRESETS.noon.hemiSky, PRESETS.noon.hemiGround, PRESETS.noon.hemiI);
  scene.add(hemi);
  scene.fog = new THREE.Fog(PRESETS.noon.fog, 120, 700);

  // ---- Tier-2 clouds: flattened sphere clusters + soft sprites, 3 drift layers ----
  const cloudTex = cloudSpriteTexture();
  const clouds = new THREE.Group();
  const puffMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, fog: false });
  const cloudDefs = [
    [-120, 78, -160, 1.6], [-40, 88, -200, 2.1], [60, 82, -170, 1.8], [130, 76, -120, 1.4],
    [-170, 70, -40, 1.7], [150, 90, 40, 1.9], [-90, 84, 120, 1.5], [30, 95, 160, 2.2],
    [110, 72, 170, 1.3], [-150, 92, 90, 1.6], [0, 80, -260, 2.4], [-60, 74, -60, 1.2],
  ];
  for (const [x, y, z, s] of cloudDefs) {
    const cl = new THREE.Group();
    const puffs = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < puffs; i++) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(6 + rnd() * 5, 24, 18), puffMat);
      p.position.set((rnd() - 0.5) * 16 * s, (rnd() - 0.5) * 3.2, (rnd() - 0.5) * 8 * s);
      p.scale.y = 0.55;
      cl.add(p);
    }
    const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.5, fog: false, depthWrite: false }));
    spr.scale.set(36 * s, 12 * s, 1); spr.position.y = 1;
    cl.add(spr);
    cl.position.set(x, y, z);
    cl.userData.drift = 0.6 + rnd() * 1.1;
    clouds.add(cl);
  }
  scene.add(clouds);

  // ---- ground: grass verges, sand beach, ocean ----
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x5da24a, roughness: 1, metalness: 0 }),
  );
  grass.rotation.x = -Math.PI / 2; grass.position.set(40, -0.05, 0); grass.receiveShadow = true;
  scene.add(grass);

  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 320),
    new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1, metalness: 0 }),
  );
  beach.rotation.x = -Math.PI / 2; beach.position.set(-33, 0.02, 0); beach.receiveShadow = true;
  scene.add(beach);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(320, 420),
    new THREE.MeshStandardMaterial({ map: oceanTexture(), roughness: 0.35, metalness: 0.1 }),
  );
  ocean.rotation.x = -Math.PI / 2; ocean.position.set(-210, -0.4, -20); ocean.receiveShadow = true;
  scene.add(ocean);

  // ---- boulevard: smooth gradient asphalt with skid marks ----
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 320),
    new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 0.9, metalness: 0 }),
  );
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.06, 0); road.receiveShadow = true;
  scene.add(road);
  // sidewalks: warm bevelled kerbs
  for (const sx of [-12.2, 12.2]) {
    const walk = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.35, 320),
      new THREE.MeshStandardMaterial({ color: 0xcbb693, roughness: 0.95 }),
    );
    walk.position.set(sx, 0.17, 0); walk.receiveShadow = true; walk.castShadow = true;
    scene.add(walk);
  }

  // ---- city skyline: varied heights, warm 1024px facades, rounded roofs ----
  const palettes = [
    ['#f2b879', '#e2703a'], ['#f6d9a0', '#c96f4a'], ['#e8a06a', '#8f5a2a'],
    ['#f9c784', '#d94f3d'], ['#eec27a', '#5a7d8c'], ['#f4a261', '#2a9d8f'],
    ['#ffd9a0', '#e76f51'], ['#e9c46a', '#264653'],
  ];
  const buildings = new THREE.Group();
  const citySpots = [];
  for (let i = 0; i < 14; i++) citySpots.push([30 + rnd() * 4, -150 + i * 23, 10 + rnd() * 14]);
  for (let i = 0; i < 10; i++) citySpots.push([56 + rnd() * 8, -140 + i * 30, 14 + rnd() * 18]);
  for (let i = 0; i < 6; i++) citySpots.push([-15 - rnd() * 2, [-140, -110, -80, 80, 110, 140][i], 8 + rnd() * 8]);
  citySpots.forEach(([x, z, w], i) => {
    const h = 12 + rnd() * 26;
    const pal = palettes[i % palettes.length];
    const mat = new THREE.MeshStandardMaterial({ map: facadeTexture(100 + i * 17, pal[0], pal[1], 0.35 + rnd() * 0.3), roughness: 0.85, metalness: 0 });
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.9), mat);
    b.position.set(x, h / 2, z); b.castShadow = true; b.receiveShadow = true;
    buildings.add(b);
    // rounded roof cap: half-cylinder, kills the sharp-box read
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(w * 0.46, w * 0.46, w * 0.9, 24, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ color: pal[1], roughness: 0.8 }),
    );
    cap.rotation.z = Math.PI / 2; cap.rotation.y = Math.PI / 2;
    cap.position.set(x, h, z); cap.castShadow = true;
    buildings.add(cap);
    // rooftop AC box + antenna
    if (rnd() < 0.7) {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.2, 2.2), new THREE.MeshStandardMaterial({ color: 0x9aa3ab, roughness: 0.7, metalness: 0.4 }));
      ac.position.set(x + w * 0.2, h + 0.6, z); ac.castShadow = true; buildings.add(ac);
    }
  });
  // hero hotel tower with curved crown, near the pier
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(9, 11, 52, 32),
    new THREE.MeshStandardMaterial({ map: facadeTexture(999, '#f6d9a0', '#c96f4a', 0.6), roughness: 0.8 }),
  );
  tower.position.set(34, 26, -60); tower.castShadow = true; tower.receiveShadow = true;
  buildings.add(tower);
  const crown = new THREE.Mesh(
    new THREE.SphereGeometry(9, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xe2703a, roughness: 0.6, flatShading: false }),
  );
  crown.position.set(34, 52, -60); crown.castShadow = true; buildings.add(crown);
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 4),
    new THREE.MeshBasicMaterial({ map: signTexture('SOLARA', '#123a5c', '#ffd23e', 'HOTEL & CASINO') }),
  );
  hotelSign.position.set(34, 40, -50.6); buildings.add(hotelSign);
  scene.add(buildings);

  // ---- BIG yacht with tall sail, anchored off the beach ----
  const yacht = new THREE.Group();
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-11, 0); hullShape.lineTo(11, 0); hullShape.lineTo(8, -2.4); hullShape.lineTo(-8, -2.4); hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 4.4, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.7, bevelSegments: 4 });
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0xf4f6f2, roughness: 0.35, metalness: 0.15 }));
  hull.rotation.x = -Math.PI / 2; hull.position.y = 1.4; hull.castShadow = true;
  yacht.add(hull);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(20, 0.5, 4.6), new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.8 }));
  deck.position.y = 1.9; yacht.add(deck);
  const cabin = new THREE.Mesh(new THREE.CapsuleGeometry(1.6, 6, 8, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.1 }));
  cabin.rotation.z = Math.PI / 2; cabin.position.set(0, 3.4, 0); cabin.castShadow = true; yacht.add(cabin);
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 19, 16), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.7 }));
  mast.position.set(1, 12, 0); mast.castShadow = true; yacht.add(mast);
  const sail = new THREE.Mesh(new THREE.PlaneGeometry(9, 17), new THREE.MeshStandardMaterial({ map: sailTexture(), side: THREE.DoubleSide, roughness: 0.85 }));
  sail.position.set(5.6, 11, 0); sail.castShadow = true; yacht.add(sail);
  const sail2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 13), new THREE.MeshStandardMaterial({ map: sailTexture(), side: THREE.DoubleSide, roughness: 0.85 }));
  sail2.position.set(-2.2, 9.5, 0); sail2.rotation.y = 0.2; yacht.add(sail2);
  yacht.position.set(-56, 0, -30); yacht.rotation.y = 0.5;
  scene.add(yacht);

  // ---- pier: planks on posts, lanterns, end pavilion ----
  const pier = new THREE.Group();
  const plankMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3a, roughness: 0.9 });
  for (let i = 0; i < 22; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.25, 7), plankMat);
    p.position.set(-48 - i * 1.7, 1.1, 20); p.castShadow = true; p.receiveShadow = true; pier.add(p);
  }
  for (let i = 0; i < 8; i++) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.4, 3.4, 12), new THREE.MeshStandardMaterial({ color: 0x5d3d1e, roughness: 0.95 }));
    post.position.set(-50 - i * 4.6, 0.4, 17.4); pier.add(post);
    const post2 = post.clone(); post2.position.z = 22.6; pier.add(post2);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 0.9 }));
    lamp.position.set(-50 - i * 4.6, 3.1, 17.4); pier.add(lamp);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.4, 8), new THREE.MeshStandardMaterial({ color: 0x22242a, roughness: 0.6, metalness: 0.5 }));
    pole.position.set(-50 - i * 4.6, 1.9, 17.4); pier.add(pole);
  }
  const pav = new THREE.Mesh(new THREE.ConeGeometry(5, 3.4, 24), new THREE.MeshStandardMaterial({ color: 0xd94f3d, roughness: 0.7, flatShading: false }));
  pav.position.set(-84, 4.4, 20); pav.castShadow = true; pier.add(pav);
  scene.add(pier);

  // ---- Ferris wheel: big, smooth, slowly turning ----
  const ferris = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.TorusGeometry(17, 0.9, 16, 48), new THREE.MeshStandardMaterial({ color: 0xff5a3c, roughness: 0.4, metalness: 0.3 }));
  rim.castShadow = true; ferris.add(rim);
  const rim2 = new THREE.Mesh(new THREE.TorusGeometry(13, 0.6, 12, 40), new THREE.MeshStandardMaterial({ color: 0xffd23e, roughness: 0.4, metalness: 0.3 }));
  ferris.add(rim2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 17, 12), new THREE.MeshStandardMaterial({ color: 0xf4f6f2, roughness: 0.5, metalness: 0.4 }));
    spoke.rotation.z = a + Math.PI / 2; spoke.position.set(Math.cos(a) * 8.5, Math.sin(a) * 8.5, 0); ferris.add(spoke);
    const cab = new THREE.Mesh(new THREE.SphereGeometry(1.7, 20, 14), new THREE.MeshStandardMaterial({ color: [0xff5a3c, 0x2aa3c8, 0xffd23e, 0x7ddb4a][i % 4], roughness: 0.35, flatShading: false }));
    cab.position.set(Math.cos(a) * 17, Math.sin(a) * 17, 0); cab.castShadow = true; ferris.add(cab);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(2.2, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffd23e, roughness: 0.3, metalness: 0.5, flatShading: false }));
  ferris.add(hub);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 20, 12), new THREE.MeshStandardMaterial({ color: 0xf4f6f2, roughness: 0.5, metalness: 0.4 }));
  legL.position.set(-7, -10, 0); legL.rotation.z = 0.6; ferris.add(legL);
  const legR = legL.clone(); legR.position.x = 7; legR.rotation.z = -0.6; ferris.add(legR);
  ferris.position.set(-50, 21, -70);
  scene.add(ferris);

  // ---- beach umbrellas + loungers ----
  const umbrellaCols = [0xff5a3c, 0xffd23e, 0x2aa3c8, 0x7ddb4a, 0xff4d6d];
  for (let i = 0; i < 8; i++) {
    const x = -22 - rnd() * 18, z = -60 + i * 16 + rnd() * 6;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 8), new THREE.MeshStandardMaterial({ color: 0xf4f6f2 }));
    pole.position.set(x, 1.5, z); scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.4, 24), new THREE.MeshStandardMaterial({ color: umbrellaCols[i % 5], roughness: 0.7, flatShading: false }));
    top.position.set(x, 3.6, z); top.castShadow = true; scene.add(top);
    const lounger = new THREE.Mesh(new THREE.BoxGeometry(1, 0.4, 2.4), new THREE.MeshStandardMaterial({ color: 0x2aa3c8, roughness: 0.8 }));
    lounger.position.set(x + 2.4, 0.35, z + 1); lounger.castShadow = true; scene.add(lounger);
  }

  // ---- palms: segmented curved trunks + drooping fronds ----
  const palms = new THREE.Group();
  function palm(x, z, s = 1) {
    const g = new THREE.Group();
    let px = 0, py = 0, ang = 0;
    for (let i = 0; i < 4; i++) {
      ang += (rnd() - 0.4) * 0.22;
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.34 - i * 0.05, 0.42 - i * 0.05, 2.2, 16), new THREE.MeshStandardMaterial({ color: 0x8a6a42, roughness: 0.95, flatShading: false }));
      seg.position.set(px, py + 1.1, 0); seg.rotation.z = ang; g.add(seg);
      px += Math.sin(ang) * 2.1; py += Math.cos(ang) * 2.1;
    }
    const topX = px, topY = py;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      // drooping leaf blade: flattened ellipsoid, tilted down — reads as a palm
      // frond, not a stiff cone
      const frond = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), new THREE.MeshStandardMaterial({ color: 0x3f9e4d, roughness: 0.85, flatShading: false }));
      frond.scale.set(2.1, 0.16, 0.6);
      frond.position.set(topX + Math.cos(a) * 1.9, topY + 0.5, Math.sin(a) * 1.9);
      frond.rotation.y = -a;
      frond.rotation.z = Math.cos(a) * 0.55; frond.rotation.x = -Math.sin(a) * 0.55;
      frond.castShadow = true; g.add(frond);
    }
    const nuts = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.8, flatShading: false }));
    nuts.position.set(topX, topY - 0.4, 0); g.add(nuts);
    g.position.set(x, 0, z); g.scale.setScalar(s);
    palms.add(g);
  }
  for (let i = 0; i < 12; i++) palm(-14.5, -140 + i * 26, 0.9 + rnd() * 0.4);
  for (let i = 0; i < 10; i++) palm(14.5, -130 + i * 28 + (i === 6 ? 8 : 0), 0.9 + rnd() * 0.4);
  for (let i = 0; i < 6; i++) palm(-20 - rnd() * 14, -90 + i * 30, 1 + rnd() * 0.3);
  scene.add(palms);

  // ---- lantern market: stalls with curved striped awnings + big FRUIT sign ----
  const market = new THREE.Group();
  // FRUIT sign: freestanding board on two posts at the market entrance,
  // angled south-west so it reads from the road, never edge-on
  const fruitSign = new THREE.Mesh(
    new THREE.PlaneGeometry(9.5, 3.6),
    new THREE.MeshBasicMaterial({ map: fruitSignTexture() }),
  );
  fruitSign.position.set(13, 4.2, 40); fruitSign.rotation.y = -0.9;
  market.add(fruitSign);
  for (const [px, pz] of [[10.05, 36.3], [15.95, 43.7]]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 4.4, 10), new THREE.MeshStandardMaterial({ color: 0x5d3413, roughness: 0.9 }));
    post.position.set(px, 2.2, pz); post.castShadow = true; market.add(post);
  }
  const stallCols = [['#f2ede0', '#d94f3d'], ['#f2ede0', '#2a9d8f'], ['#f2ede0', '#e9c46a'], ['#f2ede0', '#7d5ba6']];
  const stallPos = [[20, 26], [20, 38], [20, 50], [16, 32], [16, 46], [24, 34], [24, 48]];
  stallPos.forEach(([x, z], i) => {
    const st = new THREE.Group();
    const counter = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 2.4), new THREE.MeshStandardMaterial({ color: 0x8a5a2e, roughness: 0.85 }));
    counter.position.y = 0.55; counter.castShadow = true; st.add(counter);
    const awn = new THREE.Mesh(
      new THREE.CylinderGeometry(2.6, 2.6, 4.6, 20, 1, false, 0, Math.PI),
      new THREE.MeshStandardMaterial({ map: awningTexture(stallCols[i % 4][0], stallCols[i % 4][1]), roughness: 0.85, side: THREE.DoubleSide }),
    );
    awn.rotation.z = Math.PI / 2; awn.rotation.y = Math.PI / 2; awn.position.y = 3.1; awn.castShadow = true; st.add(awn);
    for (const px of [-2, 2]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.1, 8), new THREE.MeshStandardMaterial({ color: 0x3a2a1a }));
      pole.position.set(px, 1.55, 0); st.add(pole);
    }
    // fruit piles: smooth spheres, varied colours
    const fruitCols = [0xff7a2e, 0xffd23e, 0x7ddb4a, 0xff4d6d];
    for (let f = 0; f < 9; f++) {
      const fr = new THREE.Mesh(new THREE.SphereGeometry(0.28 + rnd() * 0.12, 16, 12), new THREE.MeshStandardMaterial({ color: fruitCols[f % 4], roughness: 0.5, flatShading: false }));
      fr.position.set(-1.6 + (f % 3) * 1.5, 1.35, -0.6 + Math.floor(f / 3) * 0.6); fr.castShadow = true; st.add(fr);
    }
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), new THREE.MeshStandardMaterial({ color: 0xff6a3c, emissive: 0xff7a2e, emissiveIntensity: 0.7, flatShading: false }));
    lantern.position.set(0, 3.9, 0); st.add(lantern);
    st.position.set(x, 0, z); st.rotation.y = -Math.PI / 2;
    market.add(st);
  });
  // string lights over the market lane
  for (let i = 0; i < 10; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffe9a0, emissive: 0xffc860, emissiveIntensity: 1.2 }));
    bulb.position.set(26 + (i % 2) * 8, 5.2 + Math.sin(i * 1.3) * 0.3, 24 + i * 3); market.add(bulb);
  }
  scene.add(market);

  // ---- street lamps + traffic lights along the boulevard ----
  for (let z = -140; z <= 140; z += 28) {
    for (const sx of [-12.8, 12.8]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7.5, 12), new THREE.MeshStandardMaterial({ color: 0x2a2e35, roughness: 0.5, metalness: 0.6 }));
      pole.position.set(sx, 3.75, z); pole.castShadow = true; scene.add(pole);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.2, 8), new THREE.MeshStandardMaterial({ color: 0x2a2e35, metalness: 0.6, roughness: 0.5 }));
      arm.rotation.z = Math.PI / 2; arm.position.set(sx + (sx < 0 ? 1 : -1), 7.4, z); scene.add(arm);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), new THREE.MeshStandardMaterial({ color: 0xfff2c0, emissive: 0xffe9a0, emissiveIntensity: 0.8, flatShading: false }));
      lamp.position.set(sx + (sx < 0 ? 2 : -2), 7.3, z); scene.add(lamp);
    }
  }

  function setPreset(name) {
    const p = PRESETS[name];
    skyUniforms.uZenith.value.set(p.zenith); skyUniforms.uMid.value.set(p.mid); skyUniforms.uHorizon.value.set(p.horizon);
    skyUniforms.uSunColor.value.set(p.sunColor);
    const dir = new THREE.Vector3(...p.sunPos).normalize();
    skyUniforms.uSunDir.value.copy(dir);
    sun.color.set(p.sunColor); sun.intensity = p.sunI; sun.position.set(...p.sunPos);
    hemi.color.set(p.hemiSky); hemi.groundColor.set(p.hemiGround); hemi.intensity = p.hemiI;
    scene.fog.color.set(p.fog);
    G.renderer.toneMappingExposure = p.exposure;
    clouds.children.forEach((cl) => {
      cl.children.forEach((m) => { if (m.isMesh) m.material.color.set(p.cloudTint); });
    });
    G.preset = name;
  }

  function update(dt, t) {
    clouds.children.forEach((cl) => {
      cl.position.x += cl.userData.drift * dt;
      if (cl.position.x > 260) cl.position.x = -260;
    });
    ferris.rotation.z += dt * 0.12;
    ocean.position.y = -0.4 + Math.sin(t * 0.5) * 0.08;
    yacht.position.y = Math.sin(t * 0.6) * 0.25;
    yacht.rotation.z = Math.sin(t * 0.5) * 0.02;
  }

  return { sun, hemi, skyUniforms, clouds, ferris, yacht, setPreset, update };
}
