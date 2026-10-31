import * as THREE from 'three'
import Delaunator from 'delaunator'

/*
 * "Pillow" meshes: a flat 2D pattern piece (a THREE.Shape) is triangulated on an
 * even hex grid, then inflated front and back with a rounded edge roll. This gives
 * the soft, stitched-together volume of real garment panels from pure geometry,
 * with enough interior vertices to carry folds and drape.
 */

const smoothstep = (t) => t * t * (3 - 2 * t)

function resampleClosed(points, step) {
  const out = []
  const n = points.length
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    const len = a.distanceTo(b)
    if (len < 1e-6) continue
    const count = Math.max(1, Math.round(len / step))
    for (let k = 0; k < count; k++) {
      const t = k / count
      out.push(new THREE.Vector2(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t))
    }
  }
  return out
}

function toSegments(pts) {
  const segs = new Float64Array(pts.length * 4)
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    segs[i * 4] = a.x
    segs[i * 4 + 1] = a.y
    segs[i * 4 + 2] = b.x - a.x
    segs[i * 4 + 3] = b.y - a.y
  }
  return segs
}

function distToSegments(x, y, segs) {
  let min = Infinity
  for (let i = 0; i < segs.length; i += 4) {
    const ax = segs[i]
    const ay = segs[i + 1]
    const dx = segs[i + 2]
    const dy = segs[i + 3]
    const len2 = dx * dx + dy * dy || 1e-12
    let t = ((x - ax) * dx + (y - ay) * dy) / len2
    t = t < 0 ? 0 : t > 1 ? 1 : t
    const px = ax + dx * t - x
    const py = ay + dy * t - y
    const d = px * px + py * py
    if (d < min) min = d
  }
  return Math.sqrt(min)
}

export function insidePolygon(x, y, pts) {
  let inside = false
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x
    const yi = pts[i].y
    const xj = pts[j].x
    const yj = pts[j].y
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/**
 * @param {THREE.Shape} shape  pattern piece in the XY plane
 * @param {object} opts
 *   thickness  half-thickness of the panel at full roll
 *   roll       width of the rounded edge
 *   volume     extra fullness added towards the centre of the panel
 *   offset     (x, y) => z shared by front and back (folds, drape, body curve)
 *   step       target triangle size
 */
export function buildPillow(shape, opts = {}) {
  const {
    thickness = 0.03,
    roll: rollIn = 0.06,
    volume = 0,
    volumeReach = 0.22,
    curveSegments = 18,
    offset = null,
    step: stepIn,
  } = opts

  const raw = shape.extractPoints(curveSegments).shape
  if (raw.length > 2 && raw[0].distanceTo(raw[raw.length - 1]) < 1e-6) raw.pop()

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of raw) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const minDim = Math.min(maxX - minX, maxY - minY)
  const step = stepIn ?? THREE.MathUtils.clamp(minDim / 9, 0.006, 0.024)
  const roll = Math.min(rollIn, minDim * 0.45)

  const outline = resampleClosed(raw, step)
  const segs = toSegments(outline)

  // Boundary points first, then an interior hex grid kept clear of the edge.
  const coords = []
  for (const p of outline) coords.push(p.x, p.y)
  const rowH = step * 0.866
  let row = 0
  for (let y = minY + rowH * 0.5; y < maxY; y += rowH, row++) {
    for (let x = minX + (row % 2 ? step * 0.5 : 0); x < maxX; x += step) {
      if (!insidePolygon(x, y, outline)) continue
      if (distToSegments(x, y, segs) < step * 0.5) continue
      coords.push(x, y)
    }
  }

  const del = new Delaunator(coords)
  const tris = del.triangles
  const index = []
  for (let i = 0; i < tris.length; i += 3) {
    const a = tris[i]
    const b = tris[i + 1]
    const c = tris[i + 2]
    const ax = coords[a * 2]
    const ay = coords[a * 2 + 1]
    const bx = coords[b * 2]
    const by = coords[b * 2 + 1]
    const cx = coords[c * 2]
    const cy = coords[c * 2 + 1]
    if (!insidePolygon((ax + bx + cx) / 3, (ay + by + cy) / 3, outline)) continue
    const area = (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)
    if (Math.abs(area) < 1e-12) continue
    // Front faces wind counter-clockwise so their normal points to +z.
    if (area > 0) index.push(a, b, c)
    else index.push(a, c, b)
  }

  const n = coords.length / 2
  const liftAt = (x, y) => {
    const d = distToSegments(x, y, segs)
    const t = Math.min(d / roll, 1)
    const prof = Math.sqrt(1 - (1 - t) * (1 - t))
    const vol = volume ? volume * smoothstep(Math.min(d / volumeReach, 1)) : 0
    return thickness * prof + vol
  }
  const offAt = offset ?? (() => 0)

  const position = new Float32Array(n * 2 * 3)
  const uv = new Float32Array(n * 2 * 2)
  for (let i = 0; i < n; i++) {
    const x = coords[i * 2]
    const y = coords[i * 2 + 1]
    const l = liftAt(x, y)
    const o = offAt(x, y)
    position.set([x, y, o + l], i * 3)
    position.set([x, y, o - l], (i + n) * 3)
    uv.set([x, y], i * 2)
    uv.set([-x, y], (i + n) * 2)
  }
  const fullIndex = index.slice()
  for (let i = 0; i < index.length; i += 3) {
    fullIndex.push(index[i] + n, index[i + 2] + n, index[i + 1] + n)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  geometry.setIndex(fullIndex)
  geometry.computeVertexNormals()

  const surfaceZ = (x, y) => (insidePolygon(x, y, outline) ? offAt(x, y) + liftAt(x, y) : offAt(x, y))
  return { geometry, surfaceZ }
}
