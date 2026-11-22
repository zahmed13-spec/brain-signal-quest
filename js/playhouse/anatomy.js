// Shared anatomy helpers for the 3D scene and the 2D fallback.
// Coordinates: x = the person's right (+) / left (-), y = up, z = front (+) / back (-).
// About 1 unit = half the brain's length. Structures and pathways themselves live in content.json.

// Keep in sync with the --r-* tokens in style.css.
export const REGION_COLORS = {
  frontal: '#ff8a5b', parietal: '#ffcf4a', temporal: '#69d68c', occipital: '#5fb4ff', cerebellum: '#c08cff',
  brainstem: '#3fd0d4', thalamus: '#ff8fcf', hippocampus: '#b9f26a', amygdala: '#ff5c7a', cerebrum: '#9aa8ff',
};

// Simple ellipsoids that make up the stylised brain and head (used in 3D, and projected for 2D).
export const SILHOUETTE = [
  { kind: 'hemi', c: { x: -0.4, y: 0.3, z: 0 }, r: { x: 0.39, y: 0.55, z: 0.98 } },
  { kind: 'hemi', c: { x: 0.4, y: 0.3, z: 0 }, r: { x: 0.39, y: 0.55, z: 0.98 } },
  { kind: 'temporal', c: { x: -0.55, y: -0.05, z: 0.12 }, r: { x: 0.24, y: 0.24, z: 0.45 } },
  { kind: 'temporal', c: { x: 0.55, y: -0.05, z: 0.12 }, r: { x: 0.24, y: 0.24, z: 0.45 } },
  { kind: 'cerebellum', c: { x: 0, y: -0.27, z: -0.72 }, r: { x: 0.55, y: 0.24, z: 0.3 } },
];
export const HEAD = { c: { x: 0, y: 0.12, z: 0.12 }, r: { x: 0.98, y: 1.18, z: 1.42 } };
export const ARM = [{ x: 0.55, y: -1.15, z: -0.3 }, { x: 0.72, y: -1.5, z: 0.05 }, { x: 0.85, y: -1.8, z: 0.35 }, { x: 0.95, y: -2.02, z: 0.58 }];

/** Every structure id a scenario mentions (steps, extras and challenge options). */
export function scenarioStructureIds(scenario) {
  const ids = new Set();
  for (const s of scenario.steps) { ids.add(s.structure); (s.also || []).forEach((a) => ids.add(a)); (s.predictOptions || []).forEach((a) => ids.add(a)); }
  if (scenario.challenge?.type === 'pick') (scenario.challenge.options || []).forEach((o) => ids.add(o));
  ids.delete(''); ids.delete(undefined);
  return ids;
}
/** Does the scenario reach down into the body (spinal cord, arm)? */
export function needsBody(scenario, structs) {
  for (const id of scenarioStructureIds(scenario)) if ((structs.get(id)?.position.y ?? 0) < -1.2) return true;
  return false;
}

/** Uniform Catmull-Rom sampling (matches THREE.CatmullRomCurve3 closely enough for the 2D view). */
export function sampleCurve(points, perSeg = 10) {
  if (points.length < 2) return points.slice();
  const out = []; const P = (i) => points[Math.max(0, Math.min(points.length - 1, i))];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = P(i - 1); const p1 = P(i); const p2 = P(i + 1); const p3 = P(i + 2);
    for (let k = 0; k < perSeg; k++) {
      const t = k / perSeg; const t2 = t * t; const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y), z: f(p0.z, p1.z, p2.z, p3.z) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** 2D projections. "side" = seen from the person's left (face on the left), "top" = from above (face at the top),
 *  "front" = facing the person (their right side appears on your left). Returns [screenX, screenY] in units. */
export const PROJECT = {
  side: (p) => [-p.z, -p.y],
  top: (p) => [p.x, -p.z],
  front: (p) => [-p.x, -p.y],
};
export const VIEW_NOTE = {
  side: 'Side view: the face is on the left.',
  top: 'View from above: the face points up. The person’s right side is on the right.',
  front: 'Front view: you are facing the person, so their right side is on YOUR left.',
};
/** Radii of an axis-aligned ellipsoid as seen in each projection. */
export function projectEllipsoid(view, e) {
  const [cx, cy] = PROJECT[view](e.c);
  if (view === 'side') return { cx, cy, rx: e.r.z, ry: e.r.y };
  if (view === 'top') return { cx, cy, rx: e.r.x, ry: e.r.z };
  return { cx, cy, rx: e.r.x, ry: e.r.y };
}
