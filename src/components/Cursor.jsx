import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useCloset } from '../store/useCloset'
import { useMediaQuery } from '../lib/useMediaQuery'

/** Follower ring that labels what a click / drag will do over the 3D stage. */
export default function Cursor() {
  const fine = useMediaQuery('(hover: hover) and (pointer: fine)')
  const ring = useRef()
  const [overCanvas, setOverCanvas] = useState(false)
  const [down, setDown] = useState(false)
  const hovered = useCloset((s) => s.hovered)
  const selected = useCloset((s) => s.selected)

  useEffect(() => {
    if (!fine) return
    const x = gsap.quickTo(ring.current, 'x', { duration: 0.35, ease: 'power3' })
    const y = gsap.quickTo(ring.current, 'y', { duration: 0.35, ease: 'power3' })
    const move = (e) => {
      x(e.clientX)
      y(e.clientY)
      setOverCanvas(e.target instanceof HTMLCanvasElement)
    }
    const press = () => setDown(true)
    const release = () => setDown(false)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerdown', press)
    window.addEventListener('pointerup', release)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', press)
      window.removeEventListener('pointerup', release)
    }
  }, [fine])

  if (!fine) return null
  const label = !overCanvas ? '' : selected !== null ? 'Turn' : hovered !== null ? 'View' : 'Drag'

  return (
    <div className={`cursor ${label ? 'has-label' : ''} ${down ? 'is-down' : ''} ${overCanvas ? '' : 'is-hidden'}`} ref={ring} aria-hidden="true">
      <span>{label}</span>
    </div>
  )
}
