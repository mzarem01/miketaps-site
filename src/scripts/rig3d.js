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
  const bladeMat = mat(C.blade, { transparent: true, opacity: 0.85 });
  for (let i = 0; i < 7; i++) {
    const b = box(r * 0.62, s * 0.26, 0.002, bladeMat);
    b.geometry.translate(r * 0.31 + s * 0.28, 0, 0);
    b.rotation.z = (i / 7) * Math.PI * 2;
    b.rotation.x = 0.35;
    rotor.add(b);
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
  for (const dx of [0.075, 0.087]) {
    ram.add(box(0.007, 0.133, 0.036, mat(0x3a3335, { metalness: 0.5, roughness: 0.4 }), cx + dx, 0.096, bz + 0.019));
    ram.add(box(0.006, 0.13, 0.008, glow(C.gold, 1.1), cx + dx, 0.096, bz + 0.041));
  }

  // Storage: the M.2 drive below the CPU.
  const ssd = part('ssd');
  ssd.add(box(0.08, 0.022, 0.003, mat(C.ssd, { roughness: 0.6 }), cx - 0.01, 0.03, bz + 0.003));
  ssd.add(box(0.02, 0.012, 0.0015, mat(0xe8e2d4), cx + 0.012, 0.03, bz + 0.0052));

  // Cooler: 240 mm radiator on top, two fans under it, tubes down to the pump.
  const cooler = part('cooler');
  const radY = hy - 0.028 - 0.0135;
  cooler.add(box(0.275, 0.027, 0.12, mat(0x201c1d, { metalness: 0.3 }), -0.06, radY, -0.005));
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
  gpu.add(box(0.04, 0.003, 0.012, glow(0xffffff, 1.0), gx + gL / 2 - 0.04, gy + gH / 2 + 0.002, gz));
  for (const dx of [-0.105, 0, 0.105]) {
    const well = new THREE.Mesh(new THREE.CircleGeometry(0.049, 40), mat(0x0e0c0d));
    well.position.set(gx + dx, gy, gz + gT / 2 + 0.0008);
    gpu.add(well);
    addFan(gpu, 0.098, C.blade, gx + dx, gy, gz + gT / 2 + 0.006, null, true);
  }
  // Riser bracket at the back of the case.
  gpu.add(box(0.006, gH + 0.02, 0.05, mat(C.metal, { metalness: 0.6 }), -hx + 0.012, gy, gz));

  // Each mesh gets its own material copy so a part can glow on its own.
  rig.traverse((o) => {
    if (o.isMesh && o.material && !o.material.transparent) {
      o.material = o.material.clone();
      o.userData.baseEmissive = o.material.emissive.clone();
      o.userData.baseIntensity = o.material.emissiveIntensity;
    }
  });

  return { rig, parts, rotors };
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

export function initRig(stage) {
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

  const { rig, parts, rotors } = buildRig();
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
  controls.minAzimuthAngle = -1.0;
  controls.maxAzimuthAngle = 1.75;
  controls.update();

  let selected = null;
  let hovered = null;
  let visible = true;
  let frame = 0;

  function refreshTint() {
    for (const id in parts) tint(parts[id], id === selected ? 0.45 : id === hovered ? 0.18 : 0);
  }

  function render() {
    renderer.render(scene, camera);
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
  if (reduce) controls.addEventListener('change', render);

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
    show(on) {
      visible = on && !document.hidden;
      if (visible) {
        resize();
        start();
      }
    },
  };
}
