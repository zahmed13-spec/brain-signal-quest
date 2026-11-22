// Brain Playhouse 2D fallback: same scenarios and steps, drawn as a flat SVG diagram.
// Used when WebGL is unavailable, when reduced motion is on, or when the player picks "2D diagram".
import { svg } from '../core.js';
import { SILHOUETTE, HEAD, ARM, REGION_COLORS, PROJECT, VIEW_NOTE, projectEllipsoid, sampleCurve, needsBody, scenarioStructureIds } from './anatomy.js';

const U = 100; // svg units per anatomy unit

export class View2D {
  constructor(container, labelsLayer, data, { onPick } = {}) {
    this.container = container; this.data = data; this.onPick = onPick; labelsLayer.replaceChildren();
    this.structs = new Map(data.structures.map((s) => [s.id, s]));
    this.paths = new Map(data.pathways.map((p) => [p.id, p]));
    this.svg = svg('svg', { class: 'ph2d', role: 'img', preserveAspectRatio: 'xMidYMid meet' });
    container.prepend(this.svg);
    this.speed = 1; this.playing = true; this.showAll = false;
  }
  setScenario(scenario) {
    this.scenario = scenario; const view = scenario.view2d in PROJECT ? scenario.view2d : 'side'; this.view = view;
    const proj = (p) => PROJECT[view](p).map((v) => v * U);
    const body = needsBody(scenario, this.structs);
    const ids = scenarioStructureIds(scenario); const pathIds = new Set(scenario.steps.flatMap((s) => s.pathways));
    // Bounds
    const xs = []; const ys = [];
    const addPt = (p) => { const [x, y] = proj(p); xs.push(x); ys.push(y); };
    const shapes = [HEAD, ...SILHOUETTE];
    for (const e of shapes) { const q = projectEllipsoid(view, e); xs.push((q.cx - q.rx) * U, (q.cx + q.rx) * U); ys.push((q.cy - q.ry) * U, (q.cy + q.ry) * U); }
    for (const id of ids) { const s = this.structs.get(id); if (s) addPt(s.position); }
    for (const id of pathIds) (this.paths.get(id)?.points || []).forEach(addPt);
    if (body) ARM.forEach(addPt);
    const pad = 30; const minX = Math.min(...xs) - pad; const minY = Math.min(...ys) - pad; const w = Math.max(...xs) - minX + pad; const h = Math.max(...ys) - minY + pad;
    this.svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`);
    this.fs = Math.max(11, Math.min(w, h * 1.33) / 24);
    const s = this.svg; s.replaceChildren();
    s.style.setProperty('--fs', this.fs + 'px');
    s.append(svg('defs', {}, svg('marker', { id: 'ph-arrow', viewBox: '0 0 10 10', refX: 5, refY: 5, markerUnits: 'userSpaceOnUse', markerWidth: 16, markerHeight: 16, orient: 'auto' }, svg('path', { d: 'M0 0L10 5L0 10z', fill: '#fff' }))));
    // Head + body silhouettes
    const ell = (e, attrs) => { const q = projectEllipsoid(view, e); return svg('ellipse', { cx: q.cx * U, cy: q.cy * U, rx: q.rx * U, ry: q.ry * U, ...attrs }); };
    s.append(ell(HEAD, { fill: 'rgba(124,247,255,.05)', stroke: 'rgba(124,247,255,.35)', 'stroke-width': 3, 'stroke-dasharray': '8 8' }));
    const line = (pts, attrs) => svg('polyline', { points: sampleCurve(pts, 6).map((p) => proj(p).join(',')).join(' '), fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs });
    const cordEnd = body ? { x: 0, y: -2.1, z: -0.44 } : { x: 0, y: -1.1, z: -0.4 };
    s.append(line([{ x: 0, y: -0.02, z: -0.22 }, { x: 0, y: -0.45, z: -0.3 }, { x: 0, y: -0.9, z: -0.37 }], { stroke: REGION_COLORS.brainstem, 'stroke-width': 24, opacity: 0.55 }));
    s.append(line([{ x: 0, y: -0.88, z: -0.37 }, cordEnd], { stroke: REGION_COLORS.brainstem, 'stroke-width': 11, opacity: 0.55 }));
    if (body) s.append(line(ARM, { stroke: '#ffd6b0', 'stroke-width': 22, opacity: 0.25 }));
    const fillOf = { hemi: REGION_COLORS.cerebrum, temporal: REGION_COLORS.temporal, cerebellum: REGION_COLORS.cerebellum };
    const order = view === 'top' ? ['cerebellum', 'temporal', 'hemi'] : ['cerebellum', 'hemi', 'temporal'];
    for (const kind of order) for (const e of SILHOUETTE.filter((x) => x.kind === kind)) s.append(ell(e, { fill: fillOf[kind], 'fill-opacity': 0.22, stroke: fillOf[kind], 'stroke-opacity': 0.7, 'stroke-width': 2.5 }));
    for (const sx of [-1, 1]) {
      const eye = { c: { x: 0.32 * sx, y: -0.05, z: 1.25 }, r: { x: 0.14, y: 0.14, z: 0.14 } };
      s.append(ell(eye, { fill: '#f4f8ff', stroke: '#9fb0d8', 'stroke-width': 2 }));
    }
    // Pathways
    this.pathEls = new Map();
    const gp = svg('g', {});
    for (const id of pathIds) {
      const p = this.paths.get(id); if (!p) continue;
      const pts = sampleCurve(p.points, 10).map(proj);
      const d = 'M' + pts.map((q) => q.map((v) => v.toFixed(1)).join(' ')).join('L');
      const under = svg('path', { d, class: 'pw-under', stroke: p.color, fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.25 });
      const top = svg('path', { d, class: 'pw', stroke: p.color, fill: 'none', 'stroke-width': 7, 'stroke-linecap': 'round', 'marker-end': 'url(#ph-arrow)', opacity: 0 });
      gp.append(under, top); this.pathEls.set(id, { under, top });
    }
    s.append(gp);
    // Structures
    this.nodeEls = new Map();
    const gn = svg('g', {});
    for (const id of ids) {
      const st = this.structs.get(id); if (!st) continue;
      const [x, y] = proj(st.position);
      const r = Math.max(7, (st.size || 0.06) * U * 0.7);
      const ring = svg('circle', { cx: x, cy: y, r: r * 1.9, fill: 'none', stroke: st.color, 'stroke-width': 4, opacity: 0 });
      const dot = svg('circle', { cx: x, cy: y, r, fill: st.color, stroke: '#0a1229', 'stroke-width': 2.5, opacity: 0.45 });
      const label = svg('text', { x, y: y - r * 2.1, 'text-anchor': 'middle', class: 'ph2d-lbl', style: `font:600 ${this.fs}px var(--font-head);fill:#fff;paint-order:stroke;stroke:#0a1229;stroke-width:${this.fs / 3}px`, opacity: 0 });
      label.textContent = st.name;
      const g = svg('g', { style: 'cursor:pointer' }, ring, dot, label);
      g.addEventListener('click', () => this.onPick && this.onPick(id));
      gn.append(g); this.nodeEls.set(id, { ring, dot, label });
    }
    s.append(gn);
    const note = svg('text', { x: minX + 12, y: minY + this.fs, style: `font:700 ${this.fs * 0.8}px var(--font-body);fill:#cfd8ff` });
    note.textContent = VIEW_NOTE[view];
    s.append(note);
    this.applyMotion();
  }
  setStep(step) {
    this.step = step; const active = new Set(step.pathways); const also = new Set(step.also || []); const glow = step.glow ?? 1;
    for (const [id, el] of this.pathEls) {
      const on = active.has(id);
      el.top.setAttribute('opacity', on ? 0.45 + 0.55 * glow : 0);
      el.top.setAttribute('stroke-width', on ? 4 + 6 * glow : 7);
      el.top.classList.toggle('flow', on);
    }
    for (const [id, n] of this.nodeEls) {
      const on = id === step.structure; const sec = also.has(id);
      n.dot.setAttribute('opacity', on || sec ? 1 : 0.4);
      n.ring.setAttribute('opacity', on ? 1 : sec ? 0.5 : 0);
      n.label.setAttribute('opacity', on || sec || this.showAll ? 1 : 0);
      n.label.style.fontSize = (on ? this.fs * 1.2 : sec ? this.fs : this.fs * 0.85) + 'px';
    }
    const st = this.structs.get(step.structure);
    this.svg.setAttribute('aria-label', `Diagram showing: ${step.title}. Highlighted: ${st ? st.name : ''}. ${VIEW_NOTE[this.view]}`);
  }
  applyMotion() { this.svg.style.setProperty('--flow-dur', (1.4 / this.speed).toFixed(2) + 's'); this.svg.classList.toggle('paused', !this.playing); }
  setSpeed(s) { this.speed = s; this.applyMotion(); }
  setPlaying(p) { this.playing = p; this.applyMotion(); }
  setShowAll(b) { this.showAll = b; if (this.step) this.setStep(this.step); }
  rotate() {} tilt() {} zoom() {} resetView() {}
  start() {} stop() {}
  dispose() { this.svg.remove(); }
}
