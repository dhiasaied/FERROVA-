import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCloset } from '../store/useCloset'
import { waitForFonts, STAGES } from '../lib/preload'

// Long enough for the wordmark to land, short enough to never feel like waiting.
const MIN_DISPLAY = 900
// Whatever happens, the site is revealed after this long.
const MAX_WAIT = 12000

export default function Loader() {
  const root = useRef()
  const count = useRef()
  const bar = useRef()

  useGSAP(
    () => {
      const shown = { v: 0 }
      const render = () => {
        count.current.textContent = String(Math.round(shown.v)).padStart(3, '0')
        bar.current.style.transform = `scaleX(${shown.v / 100})`
      }
      // Counter eases towards real progress; it holds at 99 until the exit begins.
      const follow = (p) =>
        gsap.to(shown, { v: Math.min(p * 100, 99), duration: 0.6, ease: 'power2.out', overwrite: true, onUpdate: render })

      gsap.from('.loader__word', { yPercent: 110, duration: 1, ease: 'expo.out' })
      follow(useCloset.getState().progress)
      const unsubProgress = useCloset.subscribe((s, prev) => s.progress !== prev.progress && follow(s.progress))

      let finished = false
      const finish = () => {
        if (finished) return
        finished = true
        unsubProgress()
        const el = root.current
        const hide = () => {
          el.style.display = 'none'
        }
        gsap
          .timeline()
          .to(shown, { v: 100, duration: 0.35, ease: 'power2.inOut', overwrite: true, onUpdate: render })
          .to('.loader__inner', { yPercent: -30, autoAlpha: 0, duration: 0.55, ease: 'expo.in' })
          .to(el, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1, ease: 'expo.inOut' }, '-=0.2')
          .add(hide)
        // Timers, not the timeline, own the outcome: if animation frames are paused
        // (background tab, hidden or zero-size window) the site still becomes usable.
        setTimeout(() => useCloset.getState().setReady(), 750)
        setTimeout(hide, 2200)
      }

      const started = performance.now()
      const sceneReady = new Promise((resolve) => {
        if (useCloset.getState().sceneReady) return resolve()
        const unsub = useCloset.subscribe((s) => {
          if (s.sceneReady) {
            unsub()
            resolve()
          }
        })
      })
      const fonts = waitForFonts().then(() => {
        performance.mark('ferrova:fonts')
        useCloset.getState().setProgress(STAGES.fonts)
      })

      let cancelled = false
      // Plain timers, not the GSAP ticker, so the safety net works even if animation frames stall.
      const safety = setTimeout(() => {
        if (cancelled || finished) return
        console.warn('[FERROVA] Loading took too long, revealing the site anyway.')
        finish()
      }, MAX_WAIT)

      Promise.all([sceneReady, fonts]).then(() => {
        if (cancelled) return
        const wait = Math.max(0, MIN_DISPLAY - (performance.now() - started))
        setTimeout(() => !cancelled && finish(), wait)
      })

      return () => {
        cancelled = true
        clearTimeout(safety)
        unsubProgress()
      }
    },
    { scope: root },
  )

  return (
    <div className="loader" ref={root} aria-hidden="true">
      <div className="loader__inner">
        <p className="loader__brand">
          <span className="loader__mask"><span className="loader__word">FERROVA</span></span>
        </p>
        <div className="loader__meta">
          <span>Weaving the collection</span>
          <span ref={count} className="loader__count">000</span>
        </div>
        <div className="loader__track"><div ref={bar} className="loader__bar" /></div>
      </div>
    </div>
  )
}
