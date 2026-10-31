import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import { rail, garmentBounds, centerTargetFor, snapTarget } from './railState'
import { RAIL_Y, FOCUS_Z } from '../data/garments'
import { useCloset } from '../store/useCloset'

const { damp, degToRad } = THREE.MathUtils
const INTRO_POS = new THREE.Vector3(1.6, 3.4, 11)
const INTRO_LOOK = new THREE.Vector3(0, 1.6, 0)

const pos = new THREE.Vector3()
const look = new THREE.Vector3()
const tmp = new THREE.Vector3()
const iPos = new THREE.Vector3()
const iLook = new THREE.Vector3()
const curLook = new THREE.Vector3(0, 1.4, 0)

/**
 * Blends three camera layers every frame:
 *   scroll pose (GSAP ScrollTrigger timeline) → intro fly-in → inspect close-up.
 * Portrait screens pull the camera back so the rail still reads at a glance.
 */
export default function CameraRig() {
  // Selection side-effects: centre the chosen piece and blend into inspect mode.
  useEffect(
    () =>
      useCloset.subscribe((s, prev) => {
        if (s.selected === prev.selected) return
        if (s.selected !== null) {
          rail.focusIndex = s.selected
          rail.target = centerTargetFor(s.selected)
          if (prev.selected === null) rail.rot.current = rail.rot.target = 0
          rail.lastInteraction = performance.now()
          gsap.to(rail.inspect, { v: 1, duration: 1.3, ease: 'power3.inOut', overwrite: true })
        } else {
          snapTarget()
          rail.rot.target = Math.round(rail.rot.current / (Math.PI * 2)) * Math.PI * 2
          gsap.to(rail.inspect, { v: 0, duration: 1.1, ease: 'power3.inOut', overwrite: true })
        }
      }),
    [],
  )

  // Intro: rail glides in and the camera flies down once the loader has gone.
  useEffect(
    () =>
      useCloset.subscribe((s, prev) => {
        if (s.ready && !prev.ready) {
          rail.target = 0
          gsap.to(rail.intro, { v: 1, duration: 2.6, ease: 'expo.inOut' })
        }
      }),
    [],
  )

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const { camera, size, pointer } = state
    const aspect = size.width / size.height
    // Matches the CSS breakpoint where the detail panel becomes a bottom sheet.
    const sheet = size.width <= 820
    const fac = aspect >= 1.2 ? 1 : Math.min(1.8, Math.pow(1.2 / aspect, 0.62))

    const c = rail.cam
    look.set(c.lx, c.ly, c.lz)
    pos.set(c.px, c.py, c.pz).sub(look).multiplyScalar(fac).add(look)

    const k = rail.intro.v
    if (k < 1) {
      pos.lerpVectors(tmp.copy(INTRO_POS), pos, k)
      look.lerpVectors(tmp.copy(INTRO_LOOK), look, k)
    }

    const iv = rail.inspect.v
    pos.x += pointer.x * 0.2 * (1 - iv) * k
    pos.y += pointer.y * 0.1 * (1 - iv) * k

    if (iv > 0.0005) {
      const b = garmentBounds[rail.focusIndex] ?? { w: 0.7, h: 1, cy: -0.5 }
      const tanH = Math.tan(degToRad(camera.fov) / 2)
      let d
      let offX = 0
      let offY = 0
      if (!sheet) {
        d = Math.max(1.85, b.h / (0.7 * 2 * tanH))
        const visW = 2 * d * tanH * aspect
        const panel = Math.min(470, size.width * 0.42)
        offX = (panel / 2 / size.width) * visW
      } else {
        d = Math.max(b.h / (0.5 * 2 * tanH), (b.w * 1.12) / (2 * tanH * aspect))
        offY = -(2 * d * tanH) * 0.2
      }
      iLook.set(offX, RAIL_Y + 0.06 + b.cy + offY, FOCUS_Z)
      iPos.set(offX, iLook.y + 0.1 - offY * 0.3, FOCUS_Z + d)
      pos.lerp(iPos, iv)
      look.lerp(iLook, iv)
    }

    const lambda = 3.2 + iv * 2
    camera.position.x = damp(camera.position.x, pos.x, lambda, dt)
    camera.position.y = damp(camera.position.y, pos.y, lambda, dt)
    camera.position.z = damp(camera.position.z, pos.z, lambda, dt)
    curLook.x = damp(curLook.x, look.x, lambda, dt)
    curLook.y = damp(curLook.y, look.y, lambda, dt)
    curLook.z = damp(curLook.z, look.z, lambda, dt)
    camera.lookAt(curLook)
  })

  return null
}
