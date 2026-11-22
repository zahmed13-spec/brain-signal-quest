// Brain Playhouse 3D view. Procedural low-poly brain, glowing pathway tubes and travelling pulses.
// Loaded lazily (dynamic import) only when the Playhouse screen opens.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { REGION_COLORS, SILHOUETTE, needsBody, scenarioStructureIds, ARM } from './anatomy.js';

const v3 = (p) => new THREE.Vector3(p.x, p.y, p.z);
const haloSize = (s) => (s.size || 0.06) * 1.4 + 0.03;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function bumpyEllipsoid({ c, r }, detail, bump, ridges = false) {
  const g = new THREE.IcosahedronGeometry(1, detail);
  const pos = g.attributes.position; const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n = ridges ? Math.sin(p.y * 38) * 0.6 + Math.sin(p.x * 9) * 0.2 : Math.sin(p.x * 9 + p.y * 4) * Math.cos(p.z * 8 + p.y * 3) + 0.5 * Math.sin(p.z * 15 + p.x * 5);
    const k = 1 + bump * n;
    pos.setXYZ(i, c.x + p.x * r.x * k, c.y + p.y * r.y * k, c.z + p.z * r.z * k);
  }
  g.computeVertexNormals();
  return g;
}

function regionOf(p, part) {
  if (part !== 'hemi') return part;
  if (p.z < -0.6) return 'occipital';
  if (p.z > 0.05 - 0.25 * (p.y - 0.6)) return (p.y < 0.05 && Math.abs(p.x) > 0.5) ? 'temporal' : 'frontal';
  if (p.y < 0.12 && Math.abs(p.x) > 0.45) return 'temporal';
  return 'parietal';
}

export class Scene3D {
  constructor(container, labelsLayer, data, { onPick } = {}) {
    this.container = container; this.labelsLayer = labelsLayer; this.data = data; this.onPick = onPick;
    this.structs = new Map(data.structures.map((s) => [s.id, s]));
    this.paths = new Map(data.pathways.map((p) => [p.id, p]));
    this.speed = 1; this.playing = true; this.showAll = false; this.time = 0; this.running = false;
    this.renderer = new THREE.WebGLRenderer({ antialias: window.devicePixelRatio < 2, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = this.renderer.domElement;
    canvas.setAttribute('tabindex', '0'); canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '3D brain. Drag to turn it. Use the arrow keys to rotate and plus or minus to zoom.');
    container.prepend(canvas);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, 4 / 3, 0.1, 60);
    this.camera.position.set(2.4, 1.3, 2.6);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.08, minDistance: 1.2, maxDistance: 8, enablePan: false, rotateSpeed: 0.8 });
    this.scene.add(new THREE.HemisphereLight(0xcfe8ff, 0x1a1440, 1.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4); dir.position.set(3, 4, 5); this.scene.add(dir);
    this.buildAnatomy(); this.buildMarkers(); this.buildPathways(); this.buildPulses();
    this.labels = new Map();
    this.fps = { frames: 0, t0: performance.now(), value: 0 };
    this.bindInput(canvas);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(container); this.resize();
    this.loop = this.loop.bind(this);
    this.onVis = () => { if (document.hidden) this.stop(); else if (this.wanted) this.start(); };
    document.addEventListener('visibilitychange', this.onVis);
  }

  buildAnatomy() {
    const brainMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.34, depthWrite: false, flatShading: true, side: THREE.DoubleSide });
    this.brainParts = [];
    const add = (geo, part) => {
      const pos = geo.attributes.position; const regions = []; const base = new Float32Array(pos.count * 3); const p = new THREE.Vector3(); const col = new THREE.Color();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i); const r = regionOf(p, part); regions.push(r);
        col.set(REGION_COLORS[r]); base.set([col.r, col.g, col.b], i * 3);
      }
      geo.setAttribute('color', new THREE.BufferAttribute(base.slice(), 3));
      const mesh = new THREE.Mesh(geo, brainMat); mesh.renderOrder = 1; this.scene.add(mesh);
      this.brainParts.push({ mesh, regions, base });
    };
    for (const prim of SILHOUETTE) {
      if (prim.kind === 'hemi') add(bumpyEllipsoid(prim, 3, 0.035), 'hemi');
      if (prim.kind === 'temporal') add(bumpyEllipsoid(prim, 2, 0.04), 'temporal');
      if (prim.kind === 'cerebellum') add(bumpyEllipsoid(prim, 3, 0.03, true), 'cerebellum');
    }
    const stemCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.02, -0.22), new THREE.Vector3(0, -0.45, -0.3), new THREE.Vector3(0, -0.9, -0.37)]);
    const stem = new THREE.Mesh(new THREE.TubeGeometry(stemCurve, 12, 0.12, 8), new THREE.MeshLambertMaterial({ color: REGION_COLORS.brainstem, transparent: true, opacity: 0.45, depthWrite: false }));
    stem.renderOrder = 1; this.scene.add(stem); this.stem = stem;
    this.cordShort = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, -0.88, -0.37), new THREE.Vector3(0, -1.1, -0.4)), 2, 0.06, 8), stem.material);
    this.cordLong = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.88, -0.37), new THREE.Vector3(0, -1.5, -0.43), new THREE.Vector3(0, -2.1, -0.44)]), 12, 0.06, 8), stem.material);
    const armMat = new THREE.MeshLambertMaterial({ color: 0xffd6b0, transparent: true, opacity: 0.32, depthWrite: false });
    this.arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ARM.map(v3)), 24, 0.1, 10), armMat);
    this.hand = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), armMat); this.hand.position.copy(v3(ARM[ARM.length - 1]));
    this.scene.add(this.cordShort, this.cordLong, this.arm, this.hand);
    // Face features (simple, friendly)
    const white = new THREE.MeshLambertMaterial({ color: 0xf4f8ff }); const iris = new THREE.MeshBasicMaterial({ color: 0x3a6ff0 }); const pupil = new THREE.MeshBasicMaterial({ color: 0x0a1229 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), white); eye.position.set(0.32 * sx, -0.05, 1.25);
      const ir = new THREE.Mesh(new THREE.CircleGeometry(0.065, 16), iris); ir.position.set(0, 0, 0.141);
      const pu = new THREE.Mesh(new THREE.CircleGeometry(0.032, 12), pupil); pu.position.set(0, 0, 0.142);
      eye.add(ir, pu); this.scene.add(eye);
      const ear = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 16), new THREE.MeshLambertMaterial({ color: 0xffd6b0, transparent: true, opacity: 0.55 }));
      ear.position.set(0.9 * sx, -0.05, 0.05); ear.rotation.y = Math.PI / 2; this.scene.add(ear);
    }
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.26, 10), new THREE.MeshLambertMaterial({ color: 0xffd6b0, transparent: true, opacity: 0.55 }));
    nose.position.set(0, -0.3, 1.36); nose.rotation.x = Math.PI / 2; this.scene.add(nose);
    const head = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: 0x7cf7ff, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.BackSide }));
    head.scale.set(0.98, 1.18, 1.42); head.position.set(0, 0.12, 0.12); this.scene.add(head);
  }

  buildMarkers() {
    this.markers = new Map(); this.pickables = [];
    const core = new THREE.SphereGeometry(1, 14, 10);
    for (const s of this.data.structures) {
      const color = new THREE.Color(s.color || '#ffffff');
      const m = new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color })); m.scale.setScalar((s.size || 0.06) * 0.6);
      const halo = new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      halo.scale.setScalar(haloSize(s)); halo.renderOrder = 3;
      const g = new THREE.Group(); g.add(m, halo); g.position.copy(v3(s.position)); g.visible = false;
      m.userData.id = s.id; halo.userData.id = s.id; this.pickables.push(m, halo);
      this.scene.add(g); this.markers.set(s.id, { g, m, halo, s });
    }
  }

  buildPathways() {
    this.tubes = new Map();
    for (const p of this.data.pathways) {
      const curve = new THREE.CatmullRomCurve3(p.points.map(v3));
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(p.color || '#7cf7ff'), transparent: true, opacity: 0.15, depthWrite: false, blending: THREE.AdditiveBlending });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.014, 6), mat); mesh.renderOrder = 2; mesh.visible = false;
      this.scene.add(mesh); this.tubes.set(p.id, { mesh, curve, p });
    }
  }

  buildPulses() {
    this.pulses = [];
    const geo = new THREE.SphereGeometry(0.022, 10, 8);
    for (let i = 0; i < 48; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xfff6c4, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
      m.visible = false; m.renderOrder = 4; this.scene.add(m); this.pulses.push(m);
    }
  }

  setScenario(scenario) {
    this.scenario = scenario;
    this.inScene = scenarioStructureIds(scenario);
    this.scenePaths = new Set(scenario.steps.flatMap((s) => s.pathways));
    const body = needsBody(scenario, this.structs);
    this.cordShort.visible = !body; this.cordLong.visible = body; this.arm.visible = body; this.hand.visible = body;
    for (const [id, mk] of this.markers) mk.g.visible = this.inScene.has(id);
    for (const [id, t] of this.tubes) t.mesh.visible = this.scenePaths.has(id);
    this.labelsLayer.replaceChildren(); this.labels.clear();
    for (const id of this.inScene) {
      const s = this.structs.get(id); if (!s) continue;
      const lbl = document.createElement('span'); lbl.className = 'ph-label'; lbl.textContent = s.name; lbl.style.setProperty('--c', s.color);
      lbl.setAttribute('aria-hidden', 'true'); this.labelsLayer.append(lbl); this.labels.set(id, lbl);
    }
  }

  setStep(step, { instant = false } = {}) {
    this.step = step;
    const active = step.structure; const also = new Set(step.also || []);
    for (const [id, mk] of this.markers) {
      if (!mk.g.visible) continue;
      const on = id === active; const sec = also.has(id);
      mk.m.material.transparent = true;
      mk.m.material.opacity = on || sec ? 1 : 0.35;
      mk.m.material.depthTest = !(on || sec); mk.halo.material.depthTest = !(on || sec); mk.m.renderOrder = on || sec ? 5 : 0;
      mk.halo.material.opacity = on ? 0.4 : sec ? 0.22 : 0;
      mk.active = on;
    }
    const glow = step.glow ?? 1; const activePaths = new Set(step.pathways);
    for (const [id, t] of this.tubes) {
      if (!t.mesh.visible) continue;
      const on = activePaths.has(id);
      t.mesh.material.opacity = on ? 0.35 + 0.6 * glow : 0.1;
      t.mesh.material.depthTest = !on;
    }
    // Rebuild active tube geometry radius for the learning scenario's "brighter, thicker" path.
    for (const id of activePaths) {
      const t = this.tubes.get(id); if (!t) continue;
      const r = 0.014 * (0.6 + 0.9 * glow);
      if (t.radius !== r) { t.mesh.geometry.dispose(); t.mesh.geometry = new THREE.TubeGeometry(t.curve, 40, r, 6); t.radius = r; }
    }
    // Pulses: more pulses on stronger pathways.
    let k = 0; this.pulseAssign = [];
    const per = Math.max(1, Math.round(1 + 2 * glow));
    for (const id of step.pathways) { const t = this.tubes.get(id); if (!t) continue; for (let i = 0; i < per && k < this.pulses.length; i++, k++) this.pulseAssign.push({ m: this.pulses[k], curve: t.curve, offset: i / per }); }
    this.pulses.forEach((m, i) => { m.visible = i < k; });
    // Region highlight on the brain mesh.
    const region = this.structs.get(active)?.region || '';
    for (const part of this.brainParts) {
      const col = part.mesh.geometry.attributes.color;
      for (let i = 0; i < part.regions.length; i++) {
        const f = region ? (part.regions[i] === region ? 1.25 : 0.5) : 0.9;
        col.setXYZ(i, Math.min(1, part.base[i * 3] * f), Math.min(1, part.base[i * 3 + 1] * f), Math.min(1, part.base[i * 3 + 2] * f));
      }
      col.needsUpdate = true;
    }
    this.flyTo(step.camera, step.target, instant); this.dirty = true;
    this.renderer.domElement.setAttribute('aria-label', `3D brain showing: ${step.title}. Highlighted: ${this.structs.get(active)?.name || ''}. Drag or use arrow keys to rotate, plus and minus to zoom.`);
  }

  flyTo(cam, target, instant) {
    const toPos = cam ? v3(cam) : new THREE.Vector3(2.4, 1.3, 2.6); const toT = target ? v3(target) : new THREE.Vector3();
    this.home = { pos: toPos.clone(), target: toT.clone() };
    if (instant) { this.camera.position.copy(toPos); this.controls.target.copy(toT); this.tween = null; return; }
    this.tween = { t0: performance.now(), dur: 1200, fromP: this.camera.position.clone(), fromT: this.controls.target.clone(), toP: toPos, toT };
  }
  resetView() { if (this.home) this.flyTo(this.home.pos, this.home.target, false); }
  rotate(deg) {
    const off = this.camera.position.clone().sub(this.controls.target); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), (deg * Math.PI) / 180);
    this.tween = { t0: performance.now(), dur: 350, fromP: this.camera.position.clone(), fromT: this.controls.target.clone(), toP: this.controls.target.clone().add(off), toT: this.controls.target.clone() };
  }
  tilt(deg) {
    const off = this.camera.position.clone().sub(this.controls.target); const sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = Math.min(Math.PI - 0.15, Math.max(0.15, sph.phi - (deg * Math.PI) / 180)); off.setFromSpherical(sph);
    this.tween = { t0: performance.now(), dur: 350, fromP: this.camera.position.clone(), fromT: this.controls.target.clone(), toP: this.controls.target.clone().add(off), toT: this.controls.target.clone() };
  }
  zoom(factor) {
    const off = this.camera.position.clone().sub(this.controls.target);
    const len = Math.min(this.controls.maxDistance, Math.max(this.controls.minDistance, off.length() * factor)); off.setLength(len);
    this.tween = { t0: performance.now(), dur: 300, fromP: this.camera.position.clone(), fromT: this.controls.target.clone(), toP: this.controls.target.clone().add(off), toT: this.controls.target.clone() };
  }
  setSpeed(s) { this.speed = s; }
  setPlaying(p) { this.playing = p; this.dirty = true; }
  setShowAll(b) { this.showAll = b; this.dirty = true; }

  bindInput(canvas) {
    let down = null; const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
    canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; this.tween = null; });
    canvas.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return;
      const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.pickables.filter((o) => o.parent.visible), false)[0];
      if (hit && this.onPick) this.onPick(hit.object.userData.id);
    });
    canvas.addEventListener('keydown', (e) => {
      const map = { ArrowLeft: () => this.rotate(-20), ArrowRight: () => this.rotate(20), ArrowUp: () => this.tilt(15), ArrowDown: () => this.tilt(-15), '+': () => this.zoom(0.8), '=': () => this.zoom(0.8), '-': () => this.zoom(1.25), '0': () => this.resetView() };
      if (map[e.key]) { e.preventDefault(); map[e.key](); }
    });
  }

  resize() {
    const w = this.container.clientWidth; const h = this.container.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.dirty = true;
  }
  start() { this.wanted = true; if (this.running || document.hidden) return; this.running = true; this.last = performance.now(); requestAnimationFrame(this.loop); }
  stop() { this.running = false; }
  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (this.playing) this.time += dt * this.speed;
    if (this.tween) {
      const k = Math.min(1, (now - this.tween.t0) / this.tween.dur); const e = ease(k);
      this.camera.position.lerpVectors(this.tween.fromP, this.tween.toP, e); this.controls.target.lerpVectors(this.tween.fromT, this.tween.toT, e);
      if (k >= 1) this.tween = null;
    }
    const moved = this.controls.update();
    // Render on demand: when paused and nothing moves, skip the frame (saves battery on Chromebooks/tablets).
    if (!this.playing && !this.tween && !moved && !this.dirty) { requestAnimationFrame(this.loop); return; }
    this.dirty = false;
    // Pulses travel along each active pathway (about one trip every 2.5 s at 1x speed; no flashing).
    for (const a of this.pulseAssign || []) a.m.position.copy(a.curve.getPointAt((this.time * 0.4 + a.offset) % 1));
    const breathe = 1 + 0.12 * Math.sin(this.time * 2.2);
    for (const mk of this.markers.values()) if (mk.active) mk.halo.scale.setScalar(haloSize(mk.s) * breathe);
    this.renderer.render(this.scene, this.camera);
    this.updateLabels();
    this.fps.frames++;
    if (now - this.fps.t0 > 1000) {
      this.fps.value = Math.round((this.fps.frames * 1000) / (now - this.fps.t0)); this.fps.frames = 0; this.fps.t0 = now; window.__bsqFps = this.fps.value;
      // Adaptive quality: if a slow device can't keep up for 2 seconds in a row, render fewer pixels.
      this.slow = this.playing && this.fps.value < 40 ? (this.slow || 0) + 1 : 0;
      if (this.slow >= 2 && this.renderer.getPixelRatio() > 1) { this.renderer.setPixelRatio(1); this.resize(); this.slow = 0; }
    }
    requestAnimationFrame(this.loop);
  }
  updateLabels() {
    const w = this.container.clientWidth; const h = this.container.clientHeight; const p = new THREE.Vector3();
    const also = new Set(this.step?.also || []);
    for (const [id, lbl] of this.labels) {
      const isActive = this.step && id === this.step.structure; const show = isActive || also.has(id) || this.showAll;
      if (!show) { lbl.style.display = 'none'; continue; }
      p.copy(this.markers.get(id).g.position).project(this.camera);
      if (p.z > 1) { lbl.style.display = 'none'; continue; }
      lbl.style.display = ''; lbl.className = 'ph-label' + (isActive ? ' active' : also.has(id) ? '' : ' minor');
      lbl.style.transform = `translate(${((p.x + 1) / 2) * w}px, ${((1 - p.y) / 2) * h}px) translate(-50%, -140%)`;
    }
  }
  dispose() {
    this.stop(); this.wanted = false; this.ro.disconnect(); document.removeEventListener('visibilitychange', this.onVis);
    this.controls.dispose();
    this.scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    this.renderer.dispose(); this.renderer.domElement.remove(); this.labelsLayer.replaceChildren();
  }
}
