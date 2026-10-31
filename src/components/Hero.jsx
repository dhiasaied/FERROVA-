import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCloset } from '../store/useCloset'
import { scrollToId } from '../lib/scroll'
import { garments } from '../data/garments'

export default function Hero() {
  const root = useRef()
  const ready = useCloset((s) => s.ready)

  useGSAP(
    () => {
      if (!ready) {
        gsap.set('[data-hero]', { autoAlpha: 0, y: 24 })
        gsap.set('.hero__line > span', { yPercent: 115 })
        return
      }
      gsap
        .timeline({ delay: 0.5 })
        .to('.hero__line > span', { yPercent: 0, duration: 1.4, ease: 'expo.out', stagger: 0.1 })
        .to('[data-hero]', { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '-=1.1')
    },
    { scope: root, dependencies: [ready] },
  )

  const pull = () => {
    const st = useCloset.getState()
    st.select(st.active)
  }

  return (
    <section id="hero" className="section hero" ref={root}>
      <div className="hero__top" data-hero>
        <span>FW—26 · Interactive collection</span>
        <span>{String(garments.length).padStart(2, '0')} pieces · Real-time 3D</span>
      </div>
      <div className="hero__copy">
        <h1 className="hero__title">
          <span className="hero__line"><span>The Digital</span></span>
          <span className="hero__line"><span><em>Closet</em></span></span>
        </h1>
        <p className="hero__lede" data-hero>
          Browse a wardrobe the way you would in the atelier. Slide pieces along the rail, pull one off and turn it in
          the light.
        </p>
        <div className="hero__cta" data-hero>
          <button className="btn btn--solid" onClick={pull}>Pull a piece</button>
          <button className="btn btn--ghost" onClick={() => scrollToId('craft')}>
            Scroll to explore <span aria-hidden="true">↓</span>
          </button>
        </div>
      </div>
    </section>
  )
}
