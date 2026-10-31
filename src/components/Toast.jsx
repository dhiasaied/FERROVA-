import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCloset } from '../store/useCloset'

export default function Toast() {
  const root = useRef()
  const toast = useCloset((s) => s.toast)

  useGSAP(
    () => {
      if (!toast) return
      gsap
        .timeline()
        .fromTo(root.current, { y: -30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out' })
        .to(root.current, { y: -20, autoAlpha: 0, duration: 0.5, ease: 'power2.in', delay: 2.2, onComplete: () => useCloset.getState().clearToast() })
    },
    { dependencies: [toast?.key] },
  )

  return (
    <div className="toast" ref={root} role="status" style={{ visibility: 'hidden' }}>
      <span className="toast__dot" aria-hidden="true" />
      {toast?.text}
    </div>
  )
}
