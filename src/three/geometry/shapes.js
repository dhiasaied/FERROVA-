import * as THREE from 'three'

const V = (x, y) => new THREE.Vector2(x, y)

// Corner-cutting smoothing for closed polygons.
export function chaikin(points, iterations = 2) {
  let pts = points
  for (let it = 0; it < iterations; it++) {
    const next = []
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i]
      const [bx, by] = pts[(i + 1) % pts.length]
      next.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25])
      next.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75])
    }
    pts = next
  }
  return pts
}

/** Closed shape from [x, y] pairs. `sx = -1` mirrors the piece without flipping its faces. */
export function polyShape(points, { smooth = 2, sx = 1, dx = 0, dy = 0 } = {}) {
  let pts = points.map(([x, y]) => [x * sx + dx, y + dy])
  if (smooth) pts = chaikin(pts, smooth)
  const s = new THREE.Shape()
  s.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1])
  s.closePath()
  return s
}

export function rectShape(cx, cy, w, h, smooth = 2) {
  return polyShape(
    [
      [cx - w / 2, cy + h / 2],
      [cx + w / 2, cy + h / 2],
      [cx + w / 2, cy - h / 2],
      [cx - w / 2, cy - h / 2],
    ],
    { smooth },
  )
}

/** Tapered sleeve with a rounded cap, hanging from (0, 0) towards -y. */
export function sleeveShape(topW, botW, len) {
  const s = new THREE.Shape()
  s.moveTo(-topW / 2, 0)
  s.quadraticCurveTo(0, topW * 0.42, topW / 2, 0)
  s.lineTo(botW / 2, -len)
  s.quadraticCurveTo(0, -len - 0.012, -botW / 2, -len)
  s.closePath()
  return s
}

/** Front body panel. y = 0 is the neck point, the garment hangs towards -y. */
export function bodyShape(p) {
  const {
    neckW,
    neckDrop,
    shoulderW,
    shoulderDrop,
    chestW,
    armDepth,
    waistW,
    waistY,
    hemW,
    length,
    hemCurve = 0,
    vneck = false,
  } = p
  const s = new THREE.Shape()
  s.moveTo(-neckW / 2, 0)
  if (vneck) {
    s.lineTo(0, -neckDrop)
    s.lineTo(neckW / 2, 0)
  } else {
    s.quadraticCurveTo(0, -neckDrop * 2, neckW / 2, 0)
  }
  s.lineTo(shoulderW / 2, -shoulderDrop)
  s.splineThru([
    V(chestW / 2 - 0.012, -(shoulderDrop + armDepth) * 0.55),
    V(chestW / 2, -armDepth),
    V(waistW / 2, waistY),
    V(hemW / 2, -length),
  ])
  s.quadraticCurveTo(0, -length - hemCurve * 2, -hemW / 2, -length)
  s.splineThru([
    V(-waistW / 2, waistY),
    V(-chestW / 2, -armDepth),
    V(-(chestW / 2 - 0.012), -(shoulderDrop + armDepth) * 0.55),
    V(-shoulderW / 2, -shoulderDrop),
  ])
  s.lineTo(-neckW / 2, 0)
  return s
}

/** Points along the neckline curve, for collars / ribbing tubes. */
export function necklinePoints(neckW, neckDrop, count = 14, vneck = false) {
  const pts = []
  for (let i = 0; i <= count; i++) {
    const t = i / count
    const x = -neckW / 2 + neckW * t
    const y = vneck ? -neckDrop * (1 - Math.abs(t * 2 - 1)) : -neckDrop * 4 * t * (1 - t)
    pts.push([x, y])
  }
  return pts
}
