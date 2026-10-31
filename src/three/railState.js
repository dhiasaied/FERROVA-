import { SPACING, garments } from '../data/garments'

/*
 * Mutable, per-frame state shared between the rail physics, the camera rig and the
 * DOM controls. Kept outside React so 60fps updates never trigger re-renders.
 */
export const rail = {
  offset: SPACING * 3,
  target: SPACING * 3,
  velocity: 0,
  dragging: false,
  dragDist: 0,
  worldPerPx: 0.005,
  lastInteraction: 0,
  rot: { current: 0, target: 0 },
  inspect: { v: 0 },
  intro: { v: 0 },
  focusIndex: 0,
  // Base camera pose, driven by the scroll timeline.
  cam: { px: 0, py: 1.42, pz: 4.3, lx: 0, ly: 1.2, lz: 0 },
}

export const COUNT = garments.length
export const TOTAL = SPACING * COUNT

/** Bounds of each built garment, filled in by <Garment>. */
export const garmentBounds = []

export function wrapX(v) {
  return ((((v + TOTAL / 2) % TOTAL) + TOTAL) % TOTAL) - TOTAL / 2
}

export function activeIndex(offset = rail.offset) {
  return ((Math.round(-offset / SPACING) % COUNT) + COUNT) % COUNT
}

/** Rail offset that brings item `i` to the centre, choosing the nearest wrap. */
export function centerTargetFor(i) {
  const base = -i * SPACING
  const k = Math.round((rail.target - base) / TOTAL)
  return base + k * TOTAL
}

export function snapTarget() {
  rail.target = Math.round(rail.target / SPACING) * SPACING
}

/** dir = +1 → next piece (moves the rail left). */
export function stepRail(dir) {
  rail.target = Math.round(rail.target / SPACING) * SPACING - dir * SPACING
  rail.lastInteraction = performance.now()
}
