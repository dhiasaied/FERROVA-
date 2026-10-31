import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { buildPillow } from './pillow.js'
import { bodyShape, sleeveShape, polyShape, rectShape, necklinePoints } from './shapes.js'

// Garment-local space: origin sits on the rail, the neckline hangs just below the hanger bar.
const NECK_Y = -0.135
const CLIP_Y = -0.165

const _m = new THREE.Matrix4()
const _q = new THREE.Quaternion()
const _e = new THREE.Euler()
const _v = new THREE.Vector3()
const _s = new THREE.Vector3(1, 1, 1)

function xf(geom, { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {}) {
  _m.compose(_v.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s)
  geom.applyMatrix4(_m)
  return geom
}

/** Shared drape: soft vertical folds that deepen towards the hem plus a slight wrap around the body. */
function drape({ length, amp = 0.012, freq = 16, seed = 0, curve = 0.1 }) {
  return (x, y) => {
    const h = THREE.MathUtils.clamp(-y / length, 0, 1)
    const f = Math.sin(x * freq + seed + y * 1.6) * 0.65 + Math.sin(x * freq * 2.1 - seed * 1.3 + y * 4.2) * 0.35
    return amp * (0.2 + h * h) * f - curve * x * x
  }
}

function tube(points, radius, segments = 48, radial = 8) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
  return new THREE.TubeGeometry(curve, segments, radius, radial, false)
}

function button(x, y, z, r = 0.009) {
  const g = new THREE.CylinderGeometry(r, r * 0.92, 0.005, 20)
  g.rotateX(Math.PI / 2)
  g.translate(x, y, z + 0.003)
  return g
}

/** Lay a small pattern piece flat on top of the body surface. */
function patch(shape, surface, opts = {}) {
  return buildPillow(shape, {
    thickness: 0.004,
    roll: 0.01,
    ...opts,
    offset: (x, y) => surface(x, y) + (opts.lift ?? 0.0015),
  }).geometry
}

/** Body + sleeves shared by all tops. */
function buildTop(p) {
  const fold = drape({ length: p.length, amp: p.foldAmp, freq: p.foldFreq, seed: p.seed, curve: p.curve })
  const body = buildPillow(bodyShape(p), {
    thickness: p.thick,
    roll: p.roll ?? 0.07,
    volume: p.volume ?? 0.02,
    offset: fold,
  })
  const fabric = [body.geometry]
  const hardware = []
  const surf = body.surfaceZ

  if (p.sleeve) {
    const { topW, botW, len, angle, cuff = 0 } = p.sleeve
    for (const side of [1, -1]) {
      const sway = (x, y) => 0.005 * Math.sin(y * 11 + side * 2) + 0.004 * Math.sin(x * 40)
      const parts = [
        buildPillow(sleeveShape(topW, botW, len), {
          thickness: p.thick * 0.78,
          roll: 0.045,
          volume: 0.008,
          offset: sway,
        }).geometry,
      ]
      if (cuff) {
        parts.push(
          buildPillow(rectShape(0, -len + cuff / 2 - 0.004, botW + 0.012, cuff, 1), {
            thickness: p.thick * 0.85,
            roll: 0.015,
            offset: sway,
          }).geometry,
        )
      }
      const px = side * (p.shoulderW / 2 - topW * 0.3)
      const py = -p.shoulderDrop - 0.012
      for (const g of parts) {
        xf(g, { x: px, y: py, z: fold(px, py) - 0.006, rz: side * angle })
        fabric.push(g)
      }
    }
  }

  if (p.hemBand) {
    fabric.push(
      buildPillow(rectShape(0, -p.length + p.hemBand / 2 - 0.006, p.hemW + 0.012, p.hemBand, 1), {
        thickness: p.thick * 1.12 + (p.volume ?? 0.02) * 0.5,
        roll: 0.02,
        offset: fold,
      }).geometry,
    )
  }

  return { fabric, hardware, surf, fold }
}

function ribNeck(p, radius, surf, extra = 0) {
  const pts = necklinePoints(p.neckW + extra, p.neckDrop, 18).map(([x, y]) => [x, y, surf(x, y - 0.004) * 0.4])
  return tube(pts, radius, 40, 10)
}

const builders = {
  tee() {
    const p = {
      neckW: 0.2, neckDrop: 0.055, shoulderW: 0.56, shoulderDrop: 0.06, chestW: 0.56, armDepth: 0.24,
      waistW: 0.54, waistY: -0.45, hemW: 0.56, length: 0.7, thick: 0.03, volume: 0.022,
      foldAmp: 0.012, foldFreq: 15, seed: 1.2, curve: 0.1,
      sleeve: { topW: 0.21, botW: 0.19, len: 0.22, angle: 0.62, cuff: 0.03 },
    }
    const t = buildTop(p)
    t.fabric.push(ribNeck(p, 0.011, t.surf))
    return { ...t, p }
  },

  sweater() {
    const p = {
      neckW: 0.19, neckDrop: 0.06, shoulderW: 0.52, shoulderDrop: 0.07, chestW: 0.54, armDepth: 0.26,
      waistW: 0.5, waistY: -0.45, hemW: 0.48, length: 0.68, thick: 0.034, volume: 0.03,
      foldAmp: 0.01, foldFreq: 13, seed: 2.4, curve: 0.11, hemBand: 0.075,
      sleeve: { topW: 0.21, botW: 0.12, len: 0.64, angle: 0.16, cuff: 0.07 },
    }
    const t = buildTop(p)
    t.fabric.push(ribNeck(p, 0.017, t.surf))
    return { ...t, p }
  },

  hoodie() {
    const p = {
      neckW: 0.2, neckDrop: 0.06, shoulderW: 0.56, shoulderDrop: 0.08, chestW: 0.58, armDepth: 0.29,
      waistW: 0.55, waistY: -0.45, hemW: 0.5, length: 0.7, thick: 0.038, volume: 0.032,
      foldAmp: 0.013, foldFreq: 12, seed: 0.4, curve: 0.11, hemBand: 0.08,
      sleeve: { topW: 0.23, botW: 0.13, len: 0.64, angle: 0.15, cuff: 0.07 },
    }
    const t = buildTop(p)
    const { surf } = t
    // Hood falls behind the back panel, peeking above the neckline.
    const hood = buildPillow(
      polyShape([[-0.17, -0.06], [-0.16, 0.1], [-0.09, 0.18], [0.09, 0.18], [0.16, 0.1], [0.17, -0.06], [0, -0.16]], { smooth: 3 }),
      { thickness: 0.03, roll: 0.05, volume: 0.02, offset: () => -0.055 },
    ).geometry
    t.fabric.push(hood)
    t.fabric.push(ribNeck(p, 0.026, surf, 0.02))
    // Kangaroo pocket.
    t.fabric.push(patch(polyShape([[-0.2, -0.62], [0.2, -0.62], [0.15, -0.42], [-0.15, -0.42]], { smooth: 1 }), surf, { thickness: 0.007 }))
    // Drawcords + metal tips.
    for (const side of [1, -1]) {
      const pts = [0, 0.25, 0.5, 0.75, 1].map((k) => {
        const x = side * (0.045 + 0.01 * k) + Math.sin(k * 3 + side) * 0.006
        const y = -0.03 - 0.25 * k
        return [x, y, surf(x, y) + 0.008]
      })
      t.fabric.push(tube(pts, 0.0045, 24, 6))
      const [ex, ey, ez] = pts[pts.length - 1]
      const tip = new THREE.CylinderGeometry(0.0055, 0.0055, 0.03, 12)
      tip.translate(ex, ey - 0.015, ez)
      t.hardware.push(tip)
    }
    return { ...t, p }
  },

  shirt() {
    const p = {
      neckW: 0.15, neckDrop: 0.03, shoulderW: 0.48, shoulderDrop: 0.055, chestW: 0.5, armDepth: 0.26,
      waistW: 0.46, waistY: -0.45, hemW: 0.5, length: 0.8, hemCurve: 0.05, thick: 0.022, volume: 0.02,
      foldAmp: 0.011, foldFreq: 17, seed: 3.1, curve: 0.1,
      sleeve: { topW: 0.19, botW: 0.115, len: 0.66, angle: 0.13, cuff: 0.065 },
    }
    const t = buildTop(p)
    const { surf } = t
    for (const sx of [1, -1]) {
      t.fabric.push(
        buildPillow(polyShape([[0.0, 0.03], [0.1, 0.025], [0.125, -0.005], [0.075, -0.1], [0.012, -0.055]], { sx, smooth: 1 }), {
          thickness: 0.006, roll: 0.012, offset: (x, y) => surf(x, Math.min(y, -0.01)) + 0.006,
        }).geometry,
      )
    }
    t.fabric.push(tube(necklinePoints(0.17, 0.03, 16).map(([x, y]) => [x, y + 0.012, 0]), 0.014, 32, 10))
    t.fabric.push(patch(rectShape(0, -0.42, 0.036, 0.72, 1), surf, { thickness: 0.003 }))
    t.fabric.push(patch(polyShape([[0.07, -0.18], [0.18, -0.18], [0.18, -0.3], [0.125, -0.32], [0.07, -0.3]], { smooth: 1 }), surf))
    for (let i = 0; i < 7; i++) {
      const y = -0.07 - i * 0.11
      t.hardware.push(button(0, y, surf(0, y) + 0.004, 0.0075))
    }
    return { ...t, p }
  },

  coat() {
    const p = {
      neckW: 0.18, neckDrop: 0.34, vneck: true, shoulderW: 0.56, shoulderDrop: 0.05, chestW: 0.58, armDepth: 0.29,
      waistW: 0.54, waistY: -0.5, hemW: 0.66, length: 1.12, thick: 0.042, volume: 0.035,
      foldAmp: 0.016, foldFreq: 10, seed: 5.2, curve: 0.12,
      sleeve: { topW: 0.23, botW: 0.15, len: 0.68, angle: 0.11, cuff: 0 },
    }
    const t = buildTop(p)
    const { surf } = t
    // Peak lapels.
    for (const sx of [1, -1]) {
      t.fabric.push(
        buildPillow(polyShape([[0.085, 0.015], [0.16, -0.06], [0.2, -0.05], [0.17, -0.13], [0.02, -0.36], [0.0, -0.33]], { sx, smooth: 1 }), {
          thickness: 0.008, roll: 0.02, offset: (x, y) => Math.max(surf(x, y), surf(x * 0.5, y)) + 0.004,
        }).geometry,
      )
    }
    // Back collar standing behind the neck.
    t.fabric.push(tube(necklinePoints(0.2, 0.025, 16).map(([x, y]) => [x, y + 0.02, -0.02]), 0.024, 32, 10))
    // Front edge.
    const edge = [0, 0.2, 0.4, 0.6, 0.8, 1].map((k) => {
      const y = -0.34 - k * (p.length - 0.35)
      const x = 0.07 + 0.005 * Math.sin(k * 4)
      return [x, y, surf(x, y) + 0.001]
    })
    t.fabric.push(tube(edge, 0.004, 30, 6))
    // Flap pockets.
    for (const sx of [1, -1]) t.fabric.push(patch(rectShape(sx * 0.17, -0.74, 0.17, 0.055, 1), surf, { thickness: 0.006 }))
    // Double-breasted buttons.
    for (const sx of [1, -1]) {
      for (let i = 0; i < 3; i++) {
        const x = sx * 0.075
        const y = -0.4 - i * 0.12
        t.hardware.push(button(x, y, surf(x, y) + 0.005, 0.012))
      }
    }
    return { ...t, p }
  },

  dress() {
    const p = {
      neckW: 0.18, neckDrop: 0.1, shoulderW: 0.26, shoulderDrop: 0.0, chestW: 0.38, armDepth: 0.2,
      waistW: 0.32, waistY: -0.38, hemW: 0.78, length: 1.06, thick: 0.018, volume: 0.018, roll: 0.05,
      foldAmp: 0.022, foldFreq: 28, seed: 0.7, curve: 0.08,
    }
    const t = buildTop(p)
    t.fabric.push(
      buildPillow(rectShape(0, -0.38, 0.35, 0.035, 1), { thickness: 0.04, roll: 0.012, offset: t.fold }).geometry,
    )
    // Tie ends.
    for (const sx of [1, -1]) {
      t.fabric.push(
        tube([[sx * 0.03, -0.39, 0.02], [sx * 0.05, -0.5, 0.025], [sx * 0.035, -0.62, 0.022]].map(([x, y]) => [x, y, t.surf(x, y) + 0.006]), 0.009, 20, 8),
      )
    }
    return { ...t, p }
  },

  biker() {
    const p = {
      neckW: 0.2, neckDrop: 0.2, vneck: true, shoulderW: 0.5, shoulderDrop: 0.05, chestW: 0.53, armDepth: 0.26,
      waistW: 0.5, waistY: -0.42, hemW: 0.5, length: 0.6, thick: 0.03, volume: 0.025, roll: 0.05,
      foldAmp: 0.006, foldFreq: 9, seed: 4.4, curve: 0.11, hemBand: 0.06,
      sleeve: { topW: 0.2, botW: 0.12, len: 0.62, angle: 0.13, cuff: 0 },
    }
    const t = buildTop(p)
    const { surf } = t
    for (const sx of [1, -1]) {
      t.fabric.push(
        buildPillow(polyShape([[0.1, 0.01], [0.2, -0.06], [0.22, -0.16], [0.16, -0.2], [0.03, -0.2], [0.01, -0.19]], { sx, smooth: 1 }), {
          thickness: 0.007, roll: 0.018, offset: (x, y) => surf(x, y) + 0.004,
        }).geometry,
      )
    }
    // Asymmetric front zip.
    const zip = [[0.1, -0.2], [0.07, -0.3], [0.06, -0.42], [0.07, -0.56]].map(([x, y]) => [x, y, surf(x, y) + 0.004])
    t.hardware.push(tube(zip, 0.0045, 40, 6))
    // Slanted zip pocket.
    t.hardware.push(tube([[-0.21, -0.36], [-0.16, -0.43], [-0.11, -0.5]].map(([x, y]) => [x, y, surf(x, y) + 0.003]), 0.0035, 16, 6))
    // Belt buckle.
    const buckle = new THREE.BoxGeometry(0.05, 0.05, 0.008)
    buckle.translate(0.2, -p.length + 0.03, surf(0.2, -p.length + 0.05) + 0.012)
    t.hardware.push(buckle)
    for (const sx of [1, -1]) {
      const stud = button(sx * 0.2, -0.04, surf(sx * 0.2, -0.04) + 0.008, 0.007)
      t.hardware.push(stud)
    }
    return { ...t, p }
  },

  trucker() {
    const p = {
      neckW: 0.17, neckDrop: 0.04, shoulderW: 0.54, shoulderDrop: 0.05, chestW: 0.56, armDepth: 0.27,
      waistW: 0.55, waistY: -0.4, hemW: 0.55, length: 0.6, thick: 0.03, volume: 0.02,
      foldAmp: 0.008, foldFreq: 11, seed: 2.2, curve: 0.1, hemBand: 0.06,
      sleeve: { topW: 0.22, botW: 0.14, len: 0.64, angle: 0.13, cuff: 0.06 },
    }
    const t = buildTop(p)
    const { surf } = t
    for (const sx of [1, -1]) {
      t.fabric.push(
        buildPillow(polyShape([[0.0, 0.03], [0.11, 0.03], [0.15, -0.02], [0.09, -0.12], [0.015, -0.06]], { sx, smooth: 1 }), {
          thickness: 0.007, roll: 0.014, offset: (x, y) => surf(x, Math.min(y, -0.01)) + 0.006,
        }).geometry,
      )
      // Pleated chest pocket flap + its seam line.
      t.fabric.push(patch(polyShape([[0.08, -0.17], [0.21, -0.17], [0.21, -0.21], [0.145, -0.235], [0.08, -0.21]], { sx, smooth: 1 }), surf, { thickness: 0.006 }))
      t.hardware.push(button(sx * 0.145, -0.215, surf(sx * 0.145, -0.215) + 0.007, 0.008))
      const seam = [[0.145, -0.24], [0.15, -0.38], [0.155, -0.53]].map(([x, y]) => [sx * x, y, surf(sx * x, y) + 0.0005])
      t.fabric.push(tube(seam, 0.0028, 16, 5))
    }
    t.fabric.push(patch(rectShape(0, -0.32, 0.04, 0.56, 1), surf, { thickness: 0.004 }))
    for (let i = 0; i < 5; i++) {
      const y = -0.07 - i * 0.12
      t.hardware.push(button(0, y, surf(0, y) + 0.006, 0.009))
    }
    return { ...t, p }
  },

  trousers() {
    const length = 1.02
    const fold = (x, y) => {
      const h = THREE.MathUtils.clamp(-y / length, 0, 1)
      const crease = Math.cos(((Math.abs(x) - 0.105) / 0.1) * Math.PI) * 0.01
      return crease * (0.4 + h) + 0.006 * Math.sin(x * 34 + y * 3) * h - 0.08 * x * x
    }
    const shape = polyShape(
      [
        [-0.2, 0], [0.2, 0], [0.218, -0.18], [0.205, -0.6], [0.2, -length], [0.022, -length],
        [0.012, -0.44], [0, -0.35], [-0.012, -0.44], [-0.022, -length], [-0.2, -length], [-0.205, -0.6], [-0.218, -0.18],
      ],
      { smooth: 2 },
    )
    const body = buildPillow(shape, { thickness: 0.026, roll: 0.05, volume: 0.012, offset: fold })
    const surf = body.surfaceZ
    const fabric = [body.geometry]
    const hardware = []
    fabric.push(buildPillow(rectShape(0, -0.03, 0.4, 0.06, 1), { thickness: 0.032, roll: 0.012, offset: fold }).geometry)
    for (const x of [-0.16, -0.06, 0.06, 0.16]) {
      fabric.push(patch(rectShape(x, -0.03, 0.014, 0.07, 1), (xx, yy) => surf(xx, yy) + 0.008, { thickness: 0.004 }))
    }
    // Front pleats.
    for (const sx of [1, -1]) {
      fabric.push(tube([[0.085, -0.06], [0.095, -0.2], [0.1, -0.32]].map(([x, y]) => [sx * x, y, surf(sx * x, y) + 0.001]), 0.0035, 16, 6))
    }
    hardware.push(button(0.12, -0.03, fold(0.12, -0.03) + 0.034, 0.009))
    return { fabric, hardware, p: { shoulderW: 0.44, length }, clip: true }
  },
}

const cache = new Map()

export function buildGarment(item) {
  if (cache.has(item.id)) return cache.get(item.id)
  const built = builders[item.type]()
  const topY = built.clip ? CLIP_Y : NECK_Y

  const fabric = mergeGeometries(built.fabric, false)
  built.fabric.forEach((g) => g.dispose())
  fabric.translate(0, topY, 0)
  fabric.computeBoundingBox()

  let hardware = null
  if (built.hardware.length) {
    hardware = mergeGeometries(built.hardware.map((g) => { g.deleteAttribute('uv'); return g }), false)
    built.hardware.forEach((g) => g.dispose())
    hardware.translate(0, topY, 0)
  }

  const box = fabric.boundingBox
  const result = {
    fabric,
    hardware,
    hangerWidth: built.clip ? 0.44 : built.p.shoulderW + 0.02,
    bounds: {
      w: box.max.x - box.min.x,
      h: box.max.y - Math.min(box.min.y, -0.02) + 0.02,
      cy: (box.min.y + 0.02) / 2,
      minY: box.min.y,
    },
  }
  cache.set(item.id, result)
  return result
}
