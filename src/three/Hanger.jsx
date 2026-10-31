import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const woodMaterial = new THREE.MeshPhysicalMaterial({ color: '#a57a52', roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 })
const chromeMaterial = new THREE.MeshStandardMaterial({ color: '#d9d9d9', metalness: 1, roughness: 0.18 })

const curveTube = (pts, r, seg = 40, radial = 10) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, radial, false)

// The hook wraps over the rail in the YZ plane, then drops to the hanger bar.
function hookGeometry(bottomY) {
  return curveTube(
    [
      [0, bottomY, 0],
      [0, -0.06, 0.004],
      [0, -0.025, 0.026],
      [0, 0.014, 0.028],
      [0, 0.032, 0.0],
      [0, 0.016, -0.027],
      [0, -0.016, -0.026],
    ],
    0.0038,
    48,
    8,
  )
}

const cache = new Map()

function build(type, width) {
  const key = `${type}:${width.toFixed(3)}`
  if (cache.has(key)) return cache.get(key)
  let result
  if (type === 'clip') {
    const bar = curveTube([[-width / 2, -0.13, 0], [width / 2, -0.13, 0]], 0.006, 4, 12)
    const clips = [-0.15, 0.15].map((x) => {
      const g = new THREE.BoxGeometry(0.032, 0.05, 0.022)
      g.translate(x, -0.152, 0)
      g.deleteAttribute('uv')
      return g
    })
    const hook = hookGeometry(-0.13)
    hook.deleteAttribute('uv')
    bar.deleteAttribute('uv')
    result = { metal: mergeGeometries([hook, bar, ...clips]), wood: null }
  } else {
    const w = width / 2
    const bar = curveTube(
      [[-w, -0.205, 0], [-w * 0.55, -0.172, 0], [0, -0.148, 0], [w * 0.55, -0.172, 0], [w, -0.205, 0]],
      0.011,
      48,
      12,
    )
    const caps = [-1, 1].map((s) => {
      const g = new THREE.SphereGeometry(0.011, 12, 8)
      g.translate(s * w, -0.205, 0)
      return g
    })
    result = { metal: hookGeometry(-0.148), wood: mergeGeometries([bar, ...caps]) }
  }
  cache.set(key, result)
  return result
}

export default function Hanger({ type = 'shoulder', width = 0.5 }) {
  const geo = useMemo(() => build(type, width), [type, width])
  return (
    <group>
      <mesh geometry={geo.metal} material={chromeMaterial} castShadow />
      {geo.wood && <mesh geometry={geo.wood} material={woodMaterial} castShadow />}
    </group>
  )
}
