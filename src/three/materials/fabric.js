import * as THREE from 'three'

/*
 * Procedural fabric textures painted on a canvas: a tileable height field per weave
 * (jersey, rib knit, oxford, twill, denim, fleece, wool, silk, leather) used as a
 * bump map, plus a subtle albedo variation map that the garment colour tints.
 */

const SIZE = 256

function rng(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Tileable value noise sampled on an n x n lattice. */
function valueNoise(n, seed) {
  const r = rng(seed)
  const grid = new Float32Array(n * n).map(() => r())
  const at = (i, j) => grid[((j % n) + n) % n * n + (((i % n) + n) % n)]
  return (u, v) => {
    const x = u * n
    const y = v * n
    const i = Math.floor(x)
    const j = Math.floor(y)
    const fx = x - i
    const fy = y - j
    const sx = fx * fx * (3 - 2 * fx)
    const sy = fy * fy * (3 - 2 * fy)
    const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx
    const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx
    return a + (b - a) * sy
  }
}

function fbm(seed, base = 4, octaves = 4) {
  const layers = Array.from({ length: octaves }, (_, k) => valueNoise(base << k, seed + k * 97))
  return (u, v) => {
    let sum = 0
    let amp = 0.5
    let norm = 0
    for (const l of layers) {
      sum += l(u, v) * amp
      norm += amp
      amp *= 0.5
    }
    return sum / norm
  }
}

function worley(count, seed) {
  const r = rng(seed)
  const pts = Array.from({ length: count }, () => [r(), r()])
  return (u, v) => {
    let min = 1
    for (const [px, py] of pts) {
      let dx = Math.abs(u - px)
      let dy = Math.abs(v - py)
      dx = Math.min(dx, 1 - dx)
      dy = Math.min(dy, 1 - dy)
      min = Math.min(min, dx * dx + dy * dy)
    }
    return Math.sqrt(min) * Math.sqrt(count)
  }
}

const TAU = Math.PI * 2

// Each weave: height function on [0,1)^2, tile size in metres, albedo contrast.
const weaves = {
  jersey: {
    tile: 0.06, contrast: 0.12,
    make() {
      const n = fbm(11, 8, 3)
      return (u, v) => {
        const cu = (u * 32) % 1
        const row = v * 40 + Math.abs(cu - 0.5) * 1.6
        const stitch = Math.sin(Math.PI * cu) * (0.6 + 0.4 * Math.sin(TAU * row))
        return stitch * 0.8 + n(u, v) * 0.2
      }
    },
  },
  knit: {
    tile: 0.12, contrast: 0.16,
    make() {
      const n = fbm(21, 8, 3)
      return (u, v) => {
        const cu = (u * 16) % 1
        const row = v * 22 + Math.abs(cu - 0.5) * 2.2
        const stitch = Math.pow(Math.sin(Math.PI * cu), 0.7) * (0.55 + 0.45 * Math.sin(TAU * row))
        const rib = 0.5 + 0.5 * Math.cos(TAU * u * 4)
        return stitch * 0.7 + rib * 0.15 + n(u, v) * 0.15
      }
    },
  },
  oxford: {
    tile: 0.025, contrast: 0.1,
    make() {
      const n = fbm(31, 16, 2)
      return (u, v) => {
        const bx = Math.floor(u * 32)
        const by = Math.floor(v * 32)
        const even = (bx + by) % 2 === 0
        const t = even ? Math.sin(Math.PI * ((v * 64) % 1)) : Math.sin(Math.PI * ((u * 64) % 1))
        return t * 0.8 + n(u, v) * 0.2
      }
    },
  },
  twill: {
    tile: 0.04, contrast: 0.1,
    make() {
      const n = fbm(41, 16, 3)
      return (u, v) => 0.5 + 0.4 * Math.sin(TAU * (u + v) * 24) + (n(u, v) - 0.5) * 0.3
    },
  },
  denim: {
    tile: 0.06, contrast: 0.42,
    make() {
      const n = fbm(51, 8, 4)
      const slub = valueNoise(64, 52)
      return (u, v) => {
        const diag = 0.5 + 0.5 * Math.sin(TAU * (u * 30 + v * 30))
        const streak = slub(u * 0.15, v)
        return diag * 0.55 + streak * 0.3 + n(u, v) * 0.15
      }
    },
  },
  fleece: {
    tile: 0.1, contrast: 0.12,
    make() {
      const n = fbm(61, 16, 4)
      return (u, v) => n(u, v)
    },
  },
  wool: {
    tile: 0.12, contrast: 0.16,
    make() {
      const n = fbm(71, 8, 5)
      const fibres = valueNoise(128, 72)
      return (u, v) => n(u, v) * 0.6 + fibres(u * 4, v) * 0.4
    },
  },
  silk: {
    tile: 0.2, contrast: 0.06,
    make() {
      const streak = valueNoise(96, 81)
      const n = fbm(82, 4, 3)
      return (u, v) => streak(u * 0.08, v) * 0.6 + n(u, v) * 0.4
    },
  },
  leather: {
    tile: 0.08, contrast: 0.14,
    make() {
      const cells = worley(140, 91)
      const n = fbm(92, 16, 3)
      return (u, v) => Math.min(cells(u, v), 1) * 0.75 + n(u, v) * 0.25
    },
  },
  plaster: {
    tile: 1.6, contrast: 0.08,
    make() {
      const n = fbm(101, 4, 6)
      return (u, v) => n(u, v)
    },
  },
  stone: {
    tile: 0.9, contrast: 0.18,
    make() {
      const n = fbm(111, 4, 5)
      const pits = worley(90, 112)
      return (u, v) => n(u, v) * 0.7 + Math.min(pits(u, v) * 1.4, 1) * 0.3
    },
  },
}

const cache = new Map()

export function getWeaveTextures(kind) {
  if (cache.has(kind)) return cache.get(kind)
  const weave = weaves[kind] ?? weaves.fleece
  const h = weave.make()
  const values = new Float32Array(SIZE * SIZE)
  let lo = Infinity
  let hi = -Infinity
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const val = h(x / SIZE, y / SIZE)
      values[y * SIZE + x] = val
      if (val < lo) lo = val
      if (val > hi) hi = val
    }
  }
  const range = hi - lo || 1

  const make = (fn) => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = SIZE
    const ctx = canvas.getContext('2d')
    const img = ctx.createImageData(SIZE, SIZE)
    for (let i = 0; i < values.length; i++) {
      const g = Math.round(fn((values[i] - lo) / range) * 255)
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = g
      img.data[i * 4 + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    const tex = new THREE.CanvasTexture(canvas)
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping
    tex.anisotropy = 8
    tex.repeat.set(1 / weave.tile, 1 / weave.tile)
    return tex
  }

  const bump = make((t) => t)
  const map = make((t) => 1 - weave.contrast + weave.contrast * t)
  map.colorSpace = THREE.SRGBColorSpace
  const result = { bump, map }
  cache.set(kind, result)
  return result
}

const WHITE = new THREE.Color('#ffffff')

export function createFabricMaterial(item, colorIndex = 0) {
  const { map, bump } = getWeaveTextures(item.fabric)
  const color = new THREE.Color(item.colors[colorIndex].hex)
  const look = item.look
  return new THREE.MeshPhysicalMaterial({
    color,
    map,
    bumpMap: bump,
    bumpScale: look.bump ?? 1.2,
    roughness: look.roughness ?? 0.9,
    sheen: look.sheen ?? 0.8,
    sheenRoughness: look.sheenRoughness ?? 0.55,
    sheenColor: color.clone().lerp(WHITE, 0.35),
    clearcoat: look.clearcoat ?? 0,
    clearcoatRoughness: 0.45,
  })
}

const hardwareLooks = {
  horn: { color: '#2e2219', roughness: 0.32, metalness: 0, clearcoat: 0.6 },
  brass: { color: '#b07a45', roughness: 0.32, metalness: 1 },
  silver: { color: '#c8c8c8', roughness: 0.22, metalness: 1 },
}

export function createHardwareMaterial(kind) {
  const look = hardwareLooks[kind] ?? hardwareLooks.silver
  return new THREE.MeshPhysicalMaterial({ ...look, clearcoatRoughness: 0.2 })
}
