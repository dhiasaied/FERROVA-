import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import Hanger from './Hanger'
import { buildGarment } from './geometry/garmentFactory'
import { createFabricMaterial, createHardwareMaterial } from './materials/fabric'
import { rail, wrapX, garmentBounds } from './railState'
import { SPACING, FOCUS_Z } from '../data/garments'
import { useCloset } from '../store/useCloset'

const { damp, lerp } = THREE.MathUtils
const TAU = Math.PI * 2
const WHITE = new THREE.Color('#ffffff')
const proxyMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false })

export default function Garment({ item, index }) {
  const group = useRef()
  const built = useMemo(() => buildGarment(item), [item])
  const material = useMemo(() => createFabricMaterial(item), [item])
  const hardwareMaterial = useMemo(() => (item.hardware ? createHardwareMaterial(item.hardware) : null), [item])

  const colorIndex = useCloset((s) => s.colors[item.id] ?? 0)
  const isSelected = useCloset((s) => s.selected === index)
  const isHovered = useCloset((s) => s.hovered === index)

  // Per-garment simulation state: pendulum sway, hover, inspect blend and spin.
  const sim = useRef({
    angle: 0,
    angVel: 0,
    twist: 0,
    hover: 0,
    rotY: 0,
    t: { v: 0 },
    // Longer garments swing slower.
    stiffness: 34 / Math.max(built.bounds.h, 0.6),
    phase: index * 1.7,
  })

  useEffect(() => {
    garmentBounds[index] = built.bounds
  }, [built, index])

  useEffect(() => {
    const target = new THREE.Color(item.colors[colorIndex].hex)
    const sheen = target.clone().lerp(WHITE, 0.35)
    gsap.to(material.color, { r: target.r, g: target.g, b: target.b, duration: 0.7, ease: 'power2.out' })
    gsap.to(material.sheenColor, { r: sheen.r, g: sheen.g, b: sheen.b, duration: 0.7, ease: 'power2.out' })
  }, [colorIndex, item, material])

  useEffect(() => {
    const t = sim.current.t
    gsap.killTweensOf(t)
    gsap.to(t, { v: isSelected ? 1 : 0, duration: isSelected ? 1.25 : 1, ease: 'power3.inOut' })
  }, [isSelected])

  useEffect(() => () => {
    material.dispose()
    hardwareMaterial?.dispose()
  }, [material, hardwareMaterial])

  useFrame((state, delta) => {
    const g = group.current
    if (!g) return
    const s = sim.current
    const dt = Math.min(delta, 1 / 30)
    const time = state.clock.elapsedTime
    const e = s.t.v

    const x = wrapX(index * SPACING + rail.offset)

    // Pendulum: the hem trails behind the rail's motion, then settles with a soft overshoot.
    const drive = THREE.MathUtils.clamp(-rail.velocity * 0.045, -0.24, 0.24)
    const idle = Math.sin(time * 0.9 + s.phase) * 0.012
    s.angVel += (s.stiffness * (drive + idle - s.angle) - 2.6 * s.angVel) * dt
    s.angle += s.angVel * dt
    s.twist = damp(s.twist, -rail.velocity * 0.05 + Math.sin(time * 0.6 + s.phase) * 0.03, 3, dt)
    s.hover = damp(s.hover, isHovered && !rail.dragging ? 1 : 0, 7, dt)

    // Inspect spin: follow the shared rotation while selected, otherwise unwind to the nearest full turn.
    if (isSelected) s.rotY = rail.rot.current
    else s.rotY = damp(s.rotY, Math.round(s.rotY / TAU) * TAU, 4, dt)

    const push = isSelected ? 0 : rail.inspect.v * 0.28
    g.position.set(
      lerp(x, 0, e),
      lerp(s.hover * 0.025, 0.06, e),
      lerp(s.hover * 0.14 - push, FOCUS_Z, e),
    )
    g.rotation.set(0, s.rotY + (s.twist + s.hover * 0.18) * (1 - e), s.angle * (1 - e))
  })

  const { bounds } = built
  const onOver = (ev) => {
    ev.stopPropagation()
    if (useCloset.getState().selected === null) useCloset.getState().setHovered(index)
  }
  const onOut = () => {
    if (useCloset.getState().hovered === index) useCloset.getState().setHovered(null)
  }
  const onClick = (ev) => {
    ev.stopPropagation()
    const st = useCloset.getState()
    if (rail.dragDist > 8 || st.selected !== null) return
    st.select(index)
  }

  return (
    <group ref={group}>
      <Hanger type={item.hanger} width={built.hangerWidth} />
      <mesh geometry={built.fabric} material={material} castShadow receiveShadow />
      {built.hardware && <mesh geometry={built.hardware} material={hardwareMaterial} castShadow />}
      {/* Cheap box proxy for pointer events instead of raycasting the dense cloth mesh. */}
      <mesh
        position={[0, (bounds.minY + 0.02) / 2, 0]}
        material={proxyMaterial}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      >
        <boxGeometry args={[Math.min(bounds.w, SPACING * 0.92), bounds.h, 0.25]} />
      </mesh>
    </group>
  )
}
