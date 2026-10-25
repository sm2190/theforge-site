/* THE FORGE: the hero Monolith, a live WebGL scene.
   Obsidian day-blocks drop in and stack, today's block lands in gold, embers
   rise from the forge. Tilts with the pointer, spreads apart as the hero
   scrolls away. Falls back to the phone screenshot if WebGL is missing. */
import * as THREE from './three.module.min.js';

const wrap = document.querySelector('.forge3d');
const canvas = wrap && wrap.querySelector('canvas');

if (canvas) {
  try { start(); } catch (e) { /* the fallback screenshot stays visible */ }
}

function start() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = window.matchMedia('(max-width: 640px)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 2.6, 12);
  camera.lookAt(0, -0.1, 0);

  scene.environment = studioEnvironment(renderer);

  // ── Lights: a cool key from above-left, the forge glowing from below ──
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const forge = new THREE.PointLight(0xff9a1f, 40, 0, 2);
  forge.position.set(0.4, -3.4, 1.6);
  scene.add(forge);

  // ── The Monolith ──
  const COUNT = 8;
  const SLAB_H = 0.4, GAP = 0.08;
  const geo = slabGeometry(2.9, 1.7, SLAB_H, 0.14, 0.045);
  const obsidian = new THREE.MeshPhysicalMaterial({
    color: 0x0b0b0c, metalness: 0.3, roughness: 0.2,
    clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.25
  });
  const gold = new THREE.MeshPhysicalMaterial({
    color: 0xffc23a, metalness: 1, roughness: 0.26,
    clearcoat: 0.5, clearcoatRoughness: 0.12,
    emissive: 0xff8a00, emissiveIntensity: 0, envMapIntensity: 1.5
  });

  // Molten seams: a thin glowing plate under every block, like metal fresh off the anvil.
  const seamMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 0.42, 0.06).multiplyScalar(1.6) });
  const seamGeo = new THREE.BoxGeometry(2.78, 0.025, 1.58);

  const tower = new THREE.Group();
  scene.add(tower);
  const total = COUNT * SLAB_H + (COUNT - 1) * GAP;
  const slabs = [];
  for (let i = 0; i < COUNT; i++) {
    const top = i === COUNT - 1;
    const m = new THREE.Mesh(geo, top ? gold : obsidian);
    if (i > 0) {
      const seam = new THREE.Mesh(seamGeo, seamMat);
      seam.position.y = -SLAB_H / 2 - GAP / 2;
      m.add(seam);
    }
    const rest = -total / 2 + SLAB_H / 2 + i * (SLAB_H + GAP);
    m.rotation.y = i * 0.04;                  // a slow twist up the tower
    const s = { mesh: m, rest, y: reduce ? rest : rest + 7 + i * 0.6, v: 0, delay: 0.25 + i * 0.12, landed: reduce };
    m.position.y = s.y;
    slabs.push(s);
    tower.add(m);
  }

  // ── Forge glow under the tower ──
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: radialTexture('255,170,40'), transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending })
  );
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = -total / 2 - 0.35;
  scene.add(glow);

  // ── Embers ──
  const EMBERS = reduce ? 0 : (small ? 60 : 130);
  const eGeo = new THREE.BufferGeometry();
  const ePos = new Float32Array(EMBERS * 3), eCol = new Float32Array(EMBERS * 3), eLife = [];
  for (let i = 0; i < EMBERS; i++) { resetEmber(i, true); }
  eGeo.setAttribute('position', new THREE.BufferAttribute(ePos, 3));
  eGeo.setAttribute('color', new THREE.BufferAttribute(eCol, 3));
  const embers = new THREE.Points(eGeo, new THREE.PointsMaterial({
    size: 0.07, map: radialTexture('255,200,120'), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(embers);

  function resetEmber(i, scatter) {
    const a = Math.random() * Math.PI * 2, r = 0.6 + Math.random() * 2.6;
    ePos[i * 3] = Math.cos(a) * r;
    ePos[i * 3 + 1] = scatter ? -3 + Math.random() * 6.5 : -3 - Math.random() * 0.8;
    ePos[i * 3 + 2] = Math.sin(a) * r;
    eLife[i] = { speed: 0.35 + Math.random() * 0.9, drift: (Math.random() - 0.5) * 0.25 };
  }

  // ── Input: pointer tilt + scroll spread ──
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  let spread = 0;
  const hero = document.querySelector('.hero');
  function readScroll() {
    const h = hero ? hero.offsetHeight : window.innerHeight;
    spread = Math.min(1, Math.max(0, window.scrollY / h));
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll();

  // ── Size ──
  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.8 ? 14 : 12;   // pull back on tall, narrow layouts
    camera.lookAt(0, -0.1, 0);
    camera.updateProjectionMatrix();
    if (reduce) renderer.render(scene, camera);
  }
  new ResizeObserver(resize).observe(wrap);
  resize();

  // ── Loop ──
  const clock = new THREE.Clock();
  let t = 0, flash = 0;
  // Adaptive quality: a slow GPU (old phone, software rendering) first drops
  // to 1x resolution, then freezes on a still frame so the page stays smooth.
  let perfFrames = 0, perfTime = 0, perfStage = 0, frozen = false;
  function frame() {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 1 / 30);
    t += dt;
    if (t > 2.5 && perfStage < 2) {
      perfFrames++; perfTime += raw;
      if (perfFrames === 60) {
        const avg = perfTime / perfFrames;
        perfFrames = 0; perfTime = 0;
        if (avg > 0.045 && perfStage === 0) { renderer.setPixelRatio(1); resize(); perfStage = 1; }
        else if (avg > 0.06 && perfStage === 1) { perfStage = 2; frozen = true; }
        else perfStage = 2;   // fast enough, stop measuring
      }
    }

    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    // Slabs fall on a damped spring and settle with a small bounce.
    for (let i = 0; i < COUNT; i++) {
      const s = slabs[i];
      if (t < s.delay) continue;
      const target = s.rest + i * spread * 0.32;
      const a = (target - s.y) * 140 - s.v * 15;
      s.v += a * dt;
      s.y += s.v * dt;
      if (!s.landed && Math.abs(target - s.y) < 0.02 && Math.abs(s.v) < 0.4) {
        s.landed = true;
        if (i === COUNT - 1) flash = 1;           // today's block is forged
      }
      s.mesh.position.y = s.y;
    }

    flash = Math.max(0, flash - dt * 1.4);
    gold.emissiveIntensity = flash * 2.2;
    seamMat.color.setRGB(1, 0.42, 0.06).multiplyScalar(1.3 + flash * 2 + Math.sin(t * 2.2) * 0.25);
    forge.intensity = 40 + flash * 120 + Math.sin(t * 7) * 3;

    tower.rotation.y = -0.55 + t * 0.12 + pointer.x * 0.35 + spread * 1.1;
    tower.rotation.x = pointer.y * 0.1 + spread * 0.12;
    tower.position.y = Math.sin(t * 0.9) * 0.06;

    for (let i = 0; i < EMBERS; i++) {
      const L = eLife[i];
      ePos[i * 3 + 1] += L.speed * dt * (1 + flash * 3);
      ePos[i * 3] += L.drift * dt;
      const y = ePos[i * 3 + 1];
      if (y > 3.6) resetEmber(i, false);
      const life = Math.max(0, 1 - (y + 3) / 6.6);    // fade as they rise
      eCol[i * 3] = life; eCol[i * 3 + 1] = life * 0.75; eCol[i * 3 + 2] = life * 0.4;
    }
    if (EMBERS) { eGeo.attributes.position.needsUpdate = true; eGeo.attributes.color.needsUpdate = true; }

    renderer.render(scene, camera);
    if (frozen) sync();
  }

  // Only run while the hero is on screen and the tab is visible.
  let onScreen = true, running = false;
  function sync() {
    const should = !reduce && !frozen && onScreen && !document.hidden;
    if (should && !running) { clock.getDelta(); renderer.setAnimationLoop(frame); running = true; }
    if (!should && running) { renderer.setAnimationLoop(null); running = false; }
  }
  new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); }).observe(wrap);
  document.addEventListener('visibilitychange', sync);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    renderer.setAnimationLoop(null);
    wrap.classList.remove('is-live');
  });

  renderer.render(scene, camera);
  wrap.classList.add('is-live');
  sync();
}

/* A dark studio with soft light strips, baked into an environment map so the
   obsidian and gold have something to reflect (the look of a product shot). */
function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.BackSide })));
  const strip = (w, h, hex, power, pos, rot) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(power), side: THREE.DoubleSide }));
    m.position.set(pos[0], pos[1], pos[2]);
    m.rotation.set(rot[0], rot[1], rot[2]);
    env.add(m);
  };
  strip(9, 1.4, 0xffffff, 5, [0, 7, -3], [Math.PI / 2.3, 0, 0]);      // overhead softbox
  strip(1.1, 11, 0xffffff, 3.2, [-8, 0, 2], [0, Math.PI / 2, 0]);      // cool left rim
  strip(1.6, 9, 0xffb547, 4.5, [8, -0.5, 1], [0, -Math.PI / 2, 0]);    // warm right rim
  strip(12, 1.2, 0xff8a00, 2.6, [0, -7, 2], [-Math.PI / 2, 0, 0]);     // the forge floor
  strip(6, 0.6, 0xffffff, 2, [2, 2, 9], [0, Math.PI, 0]);              // front catch-light
  strip(14, 7, 0x8a8f99, 0.55, [0, 1, 11], [0, Math.PI, 0]);           // broad front wash for glossy faces
  strip(3, 3, 0xffd27a, 1.6, [-5, 4, 6], [0, Math.PI * 0.8, 0]);      // warm key reflection
  const pm = new THREE.PMREMGenerator(renderer);
  const tex = pm.fromScene(env, 0.03).texture;
  pm.dispose();
  return tex;
}

/* A slab: rounded rectangle, extruded and bevelled, centred on the origin. */
function slabGeometry(w, d, h, r, bevel) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -d / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: h - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel,
    bevelSegments: 4, curveSegments: 10
  });
  g.rotateX(-Math.PI / 2);
  g.center();
  return g;
}

function radialTexture(rgb) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(' + rgb + ',1)');
  g.addColorStop(0.35, 'rgba(' + rgb + ',0.35)');
  g.addColorStop(1, 'rgba(' + rgb + ',0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
