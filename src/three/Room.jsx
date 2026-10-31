import { useMemo } from 'react'
import * as THREE from 'three'
import { MeshReflectorMaterial, RoundedBox } from '@react-three/drei'
import { getWeaveTextures } from './materials/fabric'

const WALL_Z = -0.75
const ARCH_XS = [-10.2, -6.8, -3.4, 0, 3.4, 6.8, 10.2]

function archShape(w, h) {
  const r = w / 2
  const s = new THREE.Shape()
  s.moveTo(-r, 0)
  s.lineTo(-r, h - r)
  s.absarc(0, h - r, r, Math.PI, 0, true)
  s.lineTo(r, 0)
  s.closePath()
  return s
}

function useTiled(kind, repeatX, repeatY) {
  return useMemo(() => {
    const { bump, map } = getWeaveTextures(kind)
    const b = bump.clone()
    const m = map.clone()
    for (const t of [b, m]) {
      t.repeat.set(repeatX, repeatY)
      t.needsUpdate = true
    }
    return { bump: b, map: m }
  }, [kind, repeatX, repeatY])
}

function Floor({ reflect }) {
  const stone = useTiled('stone', 24, 12)
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 6]} receiveShadow>
      <planeGeometry args={[60, 30]} />
      {reflect ? (
        <MeshReflectorMaterial
          color="#d3cabd"
          map={stone.map}
          roughness={0.85}
          metalness={0}
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={0.55}
          mirror={0.35}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
        />
      ) : (
        <meshStandardMaterial color="#d3cabd" map={stone.map} roughness={0.9} />
      )}
    </mesh>
  )
}

function Wall() {
  const plaster = useTiled('plaster', 30, 4)
  const arch = useMemo(() => new THREE.ShapeGeometry(archShape(2.1, 2.55), 32), [])
  return (
    <group>
      <mesh position={[0, 4, WALL_Z]} receiveShadow>
        <planeGeometry args={[60, 8]} />
        <meshStandardMaterial color="#e6dfd4" map={plaster.map} bumpMap={plaster.bump} bumpScale={2} roughness={0.95} />
      </mesh>
      {ARCH_XS.map((x) => (
        <mesh key={x} geometry={arch} position={[x, 0, WALL_Z + 0.004]} receiveShadow>
          <meshStandardMaterial color="#d5cab9" roughness={1} />
        </mesh>
      ))}
      {/* Skirting */}
      <mesh position={[0, 0.05, WALL_Z + 0.015]} receiveShadow>
        <boxGeometry args={[60, 0.1, 0.03]} />
        <meshStandardMaterial color="#d8cfc2" roughness={0.8} />
      </mesh>
      {/* Ceiling cove with a warm light strip */}
      <mesh position={[0, 2.82, WALL_Z + 0.3]} castShadow>
        <boxGeometry args={[60, 0.14, 0.6]} />
        <meshStandardMaterial color="#e9e3d9" roughness={0.9} />
      </mesh>
      <mesh position={[0, 2.745, WALL_Z + 0.55]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[60, 0.035]} />
        <meshBasicMaterial color={[2.4, 2.0, 1.55]} toneMapped={false} />
      </mesh>
    </group>
  )
}

const FOLDED = ['#b88a5c', '#2c3a5a', '#d6c6a8', '#6e2a33']

function Bench() {
  const stone = useTiled('stone', 1.5, 1.5)
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#d9ccb6', map: stone.map, bumpMap: stone.bump, bumpScale: 3, roughness: 0.75 }),
    [stone],
  )
  return (
    <group position={[-2.35, 0, 1.25]} rotation={[0, 0.18, 0]}>
      <RoundedBox args={[1.5, 0.08, 0.46]} radius={0.02} position={[0, 0.42, 0]} material={mat} castShadow receiveShadow />
      {[-0.55, 0.55].map((x) => (
        <RoundedBox key={x} args={[0.16, 0.38, 0.4]} radius={0.015} position={[x, 0.19, 0]} material={mat} castShadow receiveShadow />
      ))}
      {/* A stack of folded knits */}
      {FOLDED.map((c, i) => (
        <RoundedBox key={c} args={[0.36, 0.055, 0.28]} radius={0.024} smoothness={4} position={[0.25 + (i % 2) * 0.012, 0.49 + i * 0.056, (i % 2) * 0.01]} rotation={[0, (i - 1.5) * 0.04, 0]} castShadow receiveShadow>
          <meshPhysicalMaterial color={c} roughness={0.95} sheen={1} sheenColor="#ffffff" sheenRoughness={0.6} />
        </RoundedBox>
      ))}
    </group>
  )
}

export default function Room({ reflect }) {
  return (
    <group>
      <Floor reflect={reflect} />
      <Wall />
      <Bench />
    </group>
  )
}
