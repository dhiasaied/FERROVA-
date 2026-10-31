import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { rail, activeIndex, snapTarget } from './railState'
import { useCloset } from '../store/useCloset'

const { damp } = THREE.MathUtils

/**
 * Drag / swipe / trackpad input for the rail. Pointer movement maps 1:1 to world
 * units at the rail's depth, release velocity adds inertia, and the rail settles
 * onto the nearest hanger. While a piece is being inspected, dragging spins it.
 */
export default function RailControls() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    const el = gl.domElement
    let lastX = 0
    let lastT = 0
    let vel = 0
    let snapTimer = 0
    let activeId = null

    const inspecting = () => useCloset.getState().selected !== null

    const down = (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      activeId = e.pointerId
      rail.dragging = true
      rail.dragDist = 0
      lastX = e.clientX
      lastT = performance.now()
      vel = 0
      rail.lastInteraction = lastT
    }
    const move = (e) => {
      if (!rail.dragging || e.pointerId !== activeId) return
      const now = performance.now()
      const dx = e.clientX - lastX
      const dt = Math.max(now - lastT, 1) / 1000
      lastX = e.clientX
      lastT = now
      rail.dragDist += Math.abs(dx)
      rail.lastInteraction = now
      if (inspecting()) {
        rail.rot.target += dx * 0.011
      } else {
        rail.target += dx * rail.worldPerPx
        vel = vel * 0.6 + ((dx * rail.worldPerPx) / dt) * 0.4
      }
    }
    const up = (e) => {
      if (!rail.dragging || (e.pointerId !== activeId && e.type !== 'blur')) return
      rail.dragging = false
      activeId = null
      if (!inspecting()) {
        // Ignore stale velocity if the pointer rested before release.
        if (performance.now() - lastT < 80) rail.target += THREE.MathUtils.clamp(vel * 0.32, -4, 4)
        snapTarget()
      }
    }
    const wheel = (e) => {
      if (inspecting()) return
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 1.2) {
        e.preventDefault()
        rail.target -= e.deltaX * rail.worldPerPx
        rail.lastInteraction = performance.now()
        clearTimeout(snapTimer)
        snapTimer = setTimeout(snapTarget, 140)
      }
    }

    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    window.addEventListener('blur', up)
    el.addEventListener('wheel', wheel, { passive: false })
    return () => {
      clearTimeout(snapTimer)
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
      window.removeEventListener('blur', up)
      el.removeEventListener('wheel', wheel)
    }
  }, [gl])

  // Runs before the garments (negative priority) so they read this frame's offset.
  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const { camera, size } = state
    const dist = Math.max(camera.position.z, 1)
    const visH = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)
    rail.worldPerPx = visH / size.height

    const prev = rail.offset
    rail.offset = damp(rail.offset, rail.target, rail.dragging ? 16 : 4.2, dt)
    rail.velocity = damp(rail.velocity, (rail.offset - prev) / Math.max(dt, 1e-4), 10, dt)

    if (useCloset.getState().selected !== null) {
      if (!rail.dragging && performance.now() - rail.lastInteraction > 2500) rail.rot.target += dt * 0.35
    }
    rail.rot.current = damp(rail.rot.current, rail.rot.target, 6, dt)

    useCloset.getState().setActive(activeIndex(rail.target))
  }, -1)

  return null
}
