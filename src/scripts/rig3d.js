// The Lab: a 3D model of the rig, built from simple shapes in code (no model file to download).
// Sized to the real case, a HYTE Y40: 439 mm deep, 240 mm wide, 472 mm tall. Units are meters.
// Axes: x runs back (-) to front (+), y is up, z runs from the motherboard tray (-) to the side glass (+).
//
// Parts carry the same ids as the parts list on the page (cpu, cooler, gpu, ram, board, ssd, case, psu),
// so clicking a part here and clicking a row in the list do the same thing.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const D = 0.439;
const H = 0.472;
const W = 0.24;
const hx = D / 2;
const hy = H / 2;
const hz = W / 2;

// Site colors. The real rig's RGB is a rainbow; here the LEDs wear the site's burgundy and gold.
const C = {
  frame: 0x1c1819,
  panel: 0x262122,
  pcb: 0x2c2627,
  metal: 0x5e5658,
  heatsink: 0x4a4345,
  gpu: 0x2a2627,
  fanFrame: 0x302a2b,
  blade: 0x3a3435,
  tube: 0x141112,
  ssd: 0x2f6b4f,
  burgundy: 0xb0303f,
  gold: 0xe2c27a,
  glass: 0x9fb4c4,
};

const HILITE = new THREE.Color(C.gold);

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.15, ...opts });
}

function glow(color, intensity = 1.6) {
  return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });
}

function box(w, h, d, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  return m;
}

// Small textures drawn on a canvas at load time (labels, gradients, fins). Nothing is downloaded.
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function textTex(text, { color = '#d8d0c8', weight = 700, family = 'sans-serif', w = 512, h = 96, spacing = 0 } = {}) {
  return canvasTex(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = color;
    g.font = `${weight} ${Math.round(h * 0.72)}px ${family}`;
    g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = `${spacing}px`;
    g.fillText(text, 4, h / 2);
  });
}

// A flat decal (text or logo) facing +z.
function decal(tex, w, h, emissive = false) {
  const m = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: 0.6,
    ...(emissive ? { emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.2 } : {}),
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.raycast = () => {};
  return mesh;
}

// One curved fan blade, lying in the xy plane and reaching out along +x.
const bladeCache = new Map();
function bladeGeom(rIn, rOut) {
  const key = `${rIn}:${rOut}`;
  if (bladeCache.has(key)) return bladeCache.get(key);
  const mid = (rIn + rOut) / 2;
  const sh = new THREE.Shape();
  sh.moveTo(rIn, -0.35 * rIn);
  sh.quadraticCurveTo(mid, -0.28 * rOut, rOut, -0.02 * rOut);
  sh.quadraticCurveTo(rOut * 1.01, 0.22 * rOut, rOut * 0.82, 0.3 * rOut);
  sh.quadraticCurveTo(mid, 0.18 * rOut, rIn, 0.35 * rIn);
  sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.0012, bevelEnabled: false, curveSegments: 8 });
  bladeCache.set(key, geo);
  return geo;
}

// A cable made of side-by-side strands that follow the same path. offsetAxis is the direction the
// strands are spread along; it should be roughly square to the path.
function cable(points, strands, spread, offsetAxis, material, radius = 0.0022) {
  const g = new THREE.Group();
  for (let i = 0; i < strands; i++) {
    const k = (i - (strands - 1) / 2) * spread;
    const pts = points.map((p) => p.clone().addScaledVector(offsetAxis, k));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, radius, 6, false), material));
  }
  return g;
}

// A fan facing +z: square frame, hub, blades and an LED ring. Returns the group and its spinning blades.
// Graphics card fans skip the frame and the ring.
function fan(size, led, bare = false) {
  const g = new THREE.Group();
  const s = size / 2;
  const r = s * 0.92;
  const shape = new THREE.Shape();
  shape.moveTo(-s, -s);
  shape.lineTo(s, -s);
  shape.lineTo(s, s);
  shape.lineTo(-s, s);
  shape.closePath();
  const hole = new THREE.Path();
  hole.absarc(0, 0, r, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.025, bevelEnabled: false, curveSegments: 32 }), mat(C.fanFrame));
  frame.position.z = -0.0125;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.97, 0.0035, 8, 48), glow(led, 1.4));
  ring.position.z = 0.0105;
  if (!bare) g.add(frame, ring);

  const rotor = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.3, s * 0.3, 0.018, 24), mat(C.fanFrame));
  hub.rotation.x = Math.PI / 2;
  rotor.add(hub);
  const hubLed = new THREE.Mesh(new THREE.CircleGeometry(s * 0.22, 24), bare ? mat(C.metal, { metalness: 0.5 }) : glow(led, 0.9));
  hubLed.position.z = 0.0095;
  rotor.add(hubLed);
  const bladeMat = mat(C.blade, { transparent: true, opacity: 0.9, side: THREE.DoubleSide });
  const n = bare ? 11 : 9;
  for (let i = 0; i < n; i++) {
    const arm = new THREE.Group();
    arm.rotation.z = (i / n) * Math.PI * 2;
    const b = new THREE.Mesh(bladeGeom(s * 0.28, r * 0.97), bladeMat);
    b.rotation.x = 0.45;
    arm.add(b);
    rotor.add(arm);
  }
  g.add(rotor);
  return { group: g, rotor };
}

function buildRig() {
  const rig = new THREE.Group();
  const parts = {};
  const rotors = [];
  const part = (id) => {
    const g = new THREE.Group();
    g.userData.part = id;
    parts[id] = g;
    rig.add(g);
    return g;
  };
  const addFan = (parent, size, led, x, y, z, rot, bare) => {
    const f = fan(size, led, bare);
    f.group.position.set(x, y, z);
    if (rot) f.group.rotation.set(rot[0], rot[1], rot[2]);
    parent.add(f.group);
    rotors.push(f.rotor);
    return f;
  };

  // Case: top slab, base with front I/O, motherboard tray, rear wall, glass front and side.
  const kase = part('case');
  const frameMat = mat(C.frame, { roughness: 0.55 });
  const panelMat = mat(C.panel);
  kase.add(box(D, 0.028, W, frameMat, 0, hy - 0.014, 0));
  kase.add(box(D, 0.046, W, frameMat, 0, -hy + 0.023, 0));
  kase.add(box(D, H - 0.074, 0.006, panelMat, 0, 0, -hz + 0.003));
  kase.add(box(0.006, H - 0.074, W, panelMat, -hx + 0.003, 0, 0));
  // Front I/O along the bottom edge: lit power button, two USB-A, USB-C, audio.
  kase.add(box(0.002, 0.016, 0.016, glow(0xffffff, 1.2), hx + 0.001, -hy + 0.023, 0.0));
  kase.add(box(0.002, 0.006, 0.013, mat(0x050505), hx + 0.001, -hy + 0.023, 0.03));
  kase.add(box(0.002, 0.006, 0.013, mat(0x050505), hx + 0.001, -hy + 0.023, 0.05));
  kase.add(box(0.002, 0.004, 0.009, mat(0x050505), hx + 0.001, -hy + 0.023, 0.07));
  const jack = new THREE.Mesh(new THREE.CircleGeometry(0.0035, 16), mat(0x050505));
  jack.position.set(hx + 0.0015, -hy + 0.023, -0.03);
  jack.rotation.y = Math.PI / 2;
  kase.add(jack);
  // Fans that come with the case: two on the tray beside the board, one rear exhaust.
  addFan(kase, 0.12, C.burgundy, 0.135, 0.095, -hz + 0.02);
  addFan(kase, 0.12, C.gold, 0.135, -0.04, -hz + 0.02);
  addFan(kase, 0.12, C.gold, -hx + 0.02, 0.105, -0.035, [0, Math.PI / 2, 0]);

  // Glass: front and side, joined at a seamless corner. Not clickable, so clicks reach the parts inside.
  const glassMat = new THREE.MeshStandardMaterial({
    color: C.glass, transparent: true, opacity: 0.1, roughness: 0.05, metalness: 0.3,
    depthWrite: false, side: THREE.DoubleSide,
  });
  const gh = H - 0.074;
  const sideGlass = new THREE.Mesh(new THREE.PlaneGeometry(D, gh), glassMat);
  sideGlass.position.set(0, 0, hz);
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(W, gh), glassMat);
  frontGlass.position.set(hx, 0, 0);
  frontGlass.rotation.y = Math.PI / 2;
  for (const g of [sideGlass, frontGlass]) {
    g.raycast = () => {};
    g.renderOrder = 10;
    rig.add(g);
  }

  // Faint edges so the glass reads as glass.
  const edgeMat = new THREE.LineBasicMaterial({ color: C.gold, transparent: true, opacity: 0.22 });
  for (const g of [sideGlass, frontGlass]) {
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g.geometry), edgeMat);
    e.position.copy(g.position);
    e.rotation.copy(g.rotation);
    e.raycast = () => {};
    rig.add(e);
  }

  // Basement shroud: the PSU lives under here. Stepped vents on top.
  const psu = part('psu');
  const shroudTop = -hy + 0.046 + 0.06;
  psu.add(box(D - 0.012, 0.06, W - 0.012, mat(C.panel, { roughness: 0.8 }), 0, -hy + 0.046 + 0.03, 0));
  const ventMat = mat(0x0c0a0b);
  for (let i = 0; i < 7; i++) {
    const inset = 0.03 + i * 0.012;
    psu.add(box(D - 0.06 - i * 0.03, 0.002, 0.004, ventMat, 0.01, shroudTop + 0.001, hz - inset));
  }

  // Motherboard: ATX, 244 x 305 mm, on the tray toward the back.
  const board = part('board');
  const bx0 = -hx + 0.012;
  const bTop = 0.16;
  const bw = 0.244;
  const bh = 0.305;
  const bz = -hz + 0.012;
  board.add(box(bw, bh, 0.002, mat(C.pcb, { roughness: 0.9 }), bx0 + bw / 2, bTop - bh / 2, bz));
  const hs = mat(C.heatsink, { metalness: 0.4, roughness: 0.5 });
  board.add(box(0.03, 0.09, 0.022, hs, bx0 + 0.035, 0.085, bz + 0.012));
  board.add(box(0.08, 0.026, 0.02, hs, bx0 + 0.1, 0.143, bz + 0.011));
  board.add(box(0.045, 0.06, 0.03, mat(0x2a2526), bx0 + 0.025, 0.12, bz + 0.016));
  board.add(box(0.05, 0.05, 0.01, hs, bx0 + 0.185, -0.075, bz + 0.006));

  // CPU: the pump head sits on top of it.
  const cpu = part('cpu');
  const cx = bx0 + 0.12;
  const cy = 0.085;
  const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.034, 40), mat(0x1b1718, { roughness: 0.35 }));
  pump.rotation.x = Math.PI / 2;
  pump.position.set(cx, cy, bz + 0.019);
  cpu.add(pump);
  const cap = new THREE.Mesh(new THREE.CircleGeometry(0.029, 40), glow(C.burgundy, 1.3));
  cap.position.set(cx, cy, bz + 0.0365);
  cpu.add(cap);
  const capRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0022, 8, 40), glow(C.gold, 1.2));
  capRing.position.set(cx, cy, bz + 0.0365);
  cpu.add(capRing);

  // Memory: two sticks right of the CPU, light bars along the top edge.
  const ram = part('ram');
  // Light bars fade from burgundy at the bottom to gold at the top, a nod to the real RGB sticks.
  const ramGlow = canvasTex(8, 128, (g, w, h) => {
    const grad = g.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, '#b0303f');
    grad.addColorStop(0.55, '#d4785a');
    grad.addColorStop(1, '#e2c27a');
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
  });
  const ramBar = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: ramGlow, emissiveIntensity: 1.3 });
  for (const dx of [0.075, 0.087]) {
    ram.add(box(0.007, 0.133, 0.036, mat(0x3a3335, { metalness: 0.5, roughness: 0.4 }), cx + dx, 0.096, bz + 0.019));
    ram.add(box(0.006, 0.13, 0.008, ramBar, cx + dx, 0.096, bz + 0.041));
  }

  // Storage: the M.2 drive below the CPU.
  const ssd = part('ssd');
  ssd.add(box(0.08, 0.022, 0.003, mat(C.ssd, { roughness: 0.6 }), cx - 0.01, 0.03, bz + 0.003));
  ssd.add(box(0.02, 0.012, 0.0015, mat(0xe8e2d4), cx + 0.012, 0.03, bz + 0.0052));

  // Cooler: 240 mm radiator on top, two fans under it, tubes down to the pump.
  const cooler = part('cooler');
  const radY = hy - 0.028 - 0.0135;
  const fins = canvasTex(256, 32, (g, w, h) => {
    g.fillStyle = '#1a1617';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#3a3334';
    for (let x = 0; x < w; x += 4) g.fillRect(x, 3, 1, h - 6);
  });
  fins.wrapS = THREE.RepeatWrapping;
  fins.repeat.set(4, 1);
  cooler.add(box(0.275, 0.027, 0.12, mat(0xffffff, { map: fins, metalness: 0.3 }), -0.06, radY, -0.005));
  addFan(cooler, 0.12, C.burgundy, -0.122, radY - 0.026, -0.005, [-Math.PI / 2, 0, 0]);
  addFan(cooler, 0.12, C.gold, 0.002, radY - 0.026, -0.005, [-Math.PI / 2, 0, 0]);
  const tubeMat = mat(C.tube, { roughness: 0.85 });
  for (const off of [0, 0.016]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(cx + 0.03, cy + 0.005 - off, bz + 0.02),
      new THREE.Vector3(cx + 0.075, cy - 0.03 - off, bz + 0.07),
      new THREE.Vector3(cx + 0.15, cy - 0.04 - off, hz - 0.045),
      new THREE.Vector3(0.105 - off, 0.11, hz - 0.05),
      new THREE.Vector3(0.068 - off * 0.6, radY - 0.016, -0.005 + 0.03),
    ]);
    cooler.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.0055, 10, false), tubeMat));
  }

  // Graphics: vertical mount, card face parallel to the side glass, three fans facing out.
  const gpu = part('gpu');
  const gL = 0.335;
  const gH = 0.13;
  const gT = 0.058;
  const gx = -hx + 0.03 + gL / 2;
  const gy = shroudTop + 0.006 + gH / 2;
  const gz = 0.045;
  gpu.add(box(gL, gH, gT, mat(C.gpu, { roughness: 0.6, metalness: 0.25 }), gx, gy, gz));
  gpu.add(box(gL, 0.004, 0.012, glow(C.gold, 0.6), gx, gy + gH / 2 + 0.001, gz + gT / 2 - 0.008));
  // Branding as it looks on the real card: RADEON along the face, a lit XFX logo on the top edge.
  const radeon = decal(textTex('RADEON', { color: '#cfc7c0', spacing: 14 }), 0.07, 0.013);
  radeon.position.set(gx - gL / 2 + 0.05, gy + gH / 2 - 0.0085, gz + gT / 2 + 0.0006);
  gpu.add(radeon);
  const xfx = decal(textTex('XFX', { color: '#ffffff', weight: 800, w: 256, spacing: 10 }), 0.045, 0.016, true);
  xfx.rotation.x = -Math.PI / 2;
  xfx.position.set(gx + gL / 2 - 0.045, gy + gH / 2 + 0.0012, gz + 0.006);
  gpu.add(xfx);
  for (const dx of [-0.105, 0, 0.105]) {
    const well = new THREE.Mesh(new THREE.CircleGeometry(0.049, 40), mat(0x0e0c0d));
    well.position.set(gx + dx, gy, gz + gT / 2 + 0.0008);
    gpu.add(well);
    addFan(gpu, 0.098, C.blade, gx + dx, gy, gz + gT / 2 + 0.006, null, true);
  }
  // Riser bracket at the back of the case.
  gpu.add(box(0.006, gH + 0.02, 0.05, mat(C.metal, { metalness: 0.6 }), -hx + 0.012, gy, gz));

  // Power cables (they belong to the PSU): two 8-pin leads from the top of the card back and
  // down into the basement, and the 24-pin from the board's edge.
  const cableMat = mat(0x0f0d0e, { roughness: 0.5, metalness: 0.1 });
  const X = new THREE.Vector3(1, 0, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const gTop = gy + gH / 2;
  for (const cx8 of [gx + 0.085, gx + 0.118]) {
    psu.add(box(0.026, 0.008, 0.012, mat(0x0c0a0b), cx8, gTop + 0.004, gz - 0.004));
    psu.add(cable([
      new THREE.Vector3(cx8, gTop + 0.006, gz - 0.004),
      new THREE.Vector3(cx8, gTop + 0.04, gz - 0.01),
      new THREE.Vector3(cx8 + 0.02, gTop + 0.035, -0.045),
      new THREE.Vector3(cx8 + 0.04, gTop - 0.02, -0.07),
      new THREE.Vector3(cx8 + 0.045, shroudTop - 0.004, -0.07),
    ], 4, 0.0055, X, cableMat));
  }
  const pin24x = bx0 + bw + 0.002;
  psu.add(box(0.008, 0.052, 0.01, mat(0x0c0a0b), pin24x - 0.003, 0.03, bz + 0.012));
  psu.add(cable([
    new THREE.Vector3(pin24x, 0.03, bz + 0.012),
    new THREE.Vector3(pin24x + 0.018, 0.026, bz + 0.016),
    new THREE.Vector3(pin24x + 0.024, -0.04, bz + 0.016),
    new THREE.Vector3(pin24x + 0.024, shroudTop - 0.004, bz + 0.016),
  ], 6, 0.0048, Z, cableMat));

  // Each mesh gets its own material copy so a part can glow on its own.
  rig.traverse((o) => {
    if (o.isMesh && o.material && !o.material.transparent) {
      o.material = o.material.clone();
      o.userData.baseEmissive = o.material.emissive.clone();
      o.userData.baseIntensity = o.material.emissiveIntensity;
    }
  });

  // Where each part's label points. Most use the middle of the part; a few need a visible spot.
  const anchors = {
    case: new THREE.Vector3(hx - 0.01, hy - 0.06, hz),
    psu: new THREE.Vector3(0.12, shroudTop - 0.02, hz - 0.01),
    cooler: new THREE.Vector3(0.1, 0.12, 0.07),
    cpu: new THREE.Vector3(cx, cy, bz + 0.04),
    gpu: new THREE.Vector3(gx - 0.06, gy + 0.02, gz + gT / 2),
    board: new THREE.Vector3(bx0 + 0.03, 0.125, bz + 0.032),
    ram: new THREE.Vector3(cx + 0.081, 0.05, bz + 0.045),
    ssd: new THREE.Vector3(cx - 0.065, 0.03, bz + 0.004),
  };
  for (const id in parts) {
    if (!anchors[id]) anchors[id] = new THREE.Box3().setFromObject(parts[id]).getCenter(new THREE.Vector3());
  }

  return { rig, parts, rotors, anchors };
}

function partOf(obj) {
  for (let o = obj; o; o = o.parent) if (o.userData.part) return o.userData.part;
  return null;
}

function tint(group, amount) {
  if (!group) return;
  group.traverse((o) => {
    if (!o.isMesh || !o.userData.baseEmissive) return;
    const m = o.material;
    if (amount === 0 || o.userData.baseIntensity > 0.5) {
      // Off, or a part that's already lit (LEDs): leave it as built.
      m.emissive.copy(o.userData.baseEmissive);
      m.emissiveIntensity = o.userData.baseIntensity;
    } else {
      m.emissive.copy(HILITE);
      m.emissiveIntensity = amount;
    }
  });
}

// names: { id: 'Display name' } for the label buttons, taken from the parts list on the page.
export function initRig(stage, names = {}) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 10);
  camera.position.set(0.42, 0.2, 0.95);
  const home = camera.position.clone();

  scene.add(new THREE.HemisphereLight(0xfff4e6, 0x3a2a2c, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1, 1.4, 1.6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xe2c27a, 0.6);
  rim.position.set(-1.2, 0.6, -0.8);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xfff0e0, 0.9);
  fill.position.set(0.3, -0.2, 1.5);
  scene.add(fill);
  const inside = new THREE.PointLight(C.burgundy, 0.25, 0.6);
  inside.position.set(0.1, 0.05, 0);
  scene.add(inside);

  const { rig, parts, rotors, anchors } = buildRig();
  scene.add(rig);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, -0.01, 0);
  controls.enablePan = false;
  controls.enableDamping = !reduce;
  controls.minDistance = 0.6;
  controls.maxDistance = 1.7;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.75;
  // Keep the glass sides in view: the back of the case is a plain black panel.
  controls.minAzimuthAngle = -0.35;
  controls.maxAzimuthAngle = 1.75;
  controls.update();

  // Labels: real buttons over the canvas, so they work with a keyboard and a screen reader too.
  const tagLayer = document.createElement('div');
  tagLayer.className = 'rig-tags';
  tagLayer.hidden = true;
  const tags = {};
  for (const id in anchors) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'rig-tag';
    b.textContent = names[id] || id;
    b.addEventListener('click', () => document.dispatchEvent(new CustomEvent('rig:pick', { detail: id })));
    tagLayer.appendChild(b);
    tags[id] = b;
  }
  stage.appendChild(tagLayer);
  const v = new THREE.Vector3();
  const tagRay = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  // A label whose part is hidden behind something solid fades back, so it doesn't look like
  // it's floating on the wrong thing. It still works.
  function hiddenBehind(id) {
    dir.copy(anchors[id]).sub(camera.position);
    const dist = dir.length();
    tagRay.set(camera.position, dir.normalize());
    tagRay.far = dist - 0.004;
    const hit = tagRay.intersectObject(rig, true)[0];
    return !!hit && partOf(hit.object) !== id;
  }
  // The fade check only reruns when the camera has moved, at most a few times a second.
  const lastCam = new THREE.Vector3(Infinity, 0, 0);
  let lastCheck = 0;
  function placeTags() {
    if (tagLayer.hidden) return;
    const now = performance.now();
    const recheck = now - lastCheck > 150 && camera.position.distanceToSquared(lastCam) > 1e-7;
    if (recheck) {
      lastCheck = now;
      lastCam.copy(camera.position);
    }
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    for (const id in tags) {
      v.copy(anchors[id]).project(camera);
      const off = v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05;
      tags[id].style.visibility = off ? 'hidden' : '';
      if (recheck) tags[id].classList.toggle('behind', !off && hiddenBehind(id));
      tags[id].style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -50%)`;
    }
  }

  let selected = null;
  let hovered = null;
  let visible = true;
  let frame = 0;

  function refreshTint() {
    for (const id in parts) tint(parts[id], id === selected ? 0.45 : id === hovered ? 0.18 : 0);
    for (const id in tags) tags[id].classList.toggle('on', id === selected);
  }

  function render() {
    renderer.render(scene, camera);
    placeTags();
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }

  // Fans spin and the view eases after a drag, unless the visitor asked for less motion.
  function loop() {
    frame = 0;
    if (!visible) return;
    for (const r of rotors) r.rotation.z -= 0.06;
    controls.update();
    render();
    frame = requestAnimationFrame(loop);
  }
  function start() {
    if (reduce) return render();
    if (!frame) frame = requestAnimationFrame(loop);
  }
  if (reduce) {
    controls.addEventListener('change', render);
    // One more pass after a drag ends, so label fading catches up.
    controls.addEventListener('end', () => setTimeout(render, 200));
  }

  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting && !document.hidden && !stage.hidden;
    if (visible) start();
  }).observe(stage);
  document.addEventListener('visibilitychange', () => {
    visible = !document.hidden && !stage.hidden;
    if (visible) start();
  });

  // Picking: a click (not a drag) selects the part under the pointer.
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(rig, true)[0];
    return hit ? partOf(hit.object) : null;
  }
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    down = null;
    const id = pick(e);
    if (id) document.dispatchEvent(new CustomEvent('rig:pick', { detail: id }));
  });
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const id = pick(e);
    if (id !== hovered) {
      hovered = id;
      canvas.style.cursor = id ? 'pointer' : 'grab';
      refreshTint();
      if (reduce) render();
    }
  });
  canvas.addEventListener('pointerleave', () => {
    if (!hovered) return;
    hovered = null;
    refreshTint();
    if (reduce) render();
  });

  return {
    select(id) {
      selected = parts[id] ? id : null;
      refreshTint();
      render();
    },
    labels(on) {
      tagLayer.hidden = !on;
      lastCam.set(Infinity, 0, 0);
      render();
    },
    reset() {
      camera.position.copy(home);
      controls.target.set(0, -0.01, 0);
      controls.update();
      render();
    },
    show(on) {
      visible = on && !document.hidden;
      if (visible) {
        resize();
        start();
      }
    },
  };
}
