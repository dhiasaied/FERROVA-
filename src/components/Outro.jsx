import { useRef } from 'react'
import { useReveal } from '../lib/useReveal'
import { scrollToId } from '../lib/scroll'

export default function Outro() {
  const root = useRef()
  useReveal(root)
  return (
    <section id="outro" className="section outro" ref={root}>
      <div className="outro__copy">
        <p className="eyebrow" data-reveal>04 — Visit</p>
        <h2 className="display display--xl" data-reveal>
          Every piece, <em>in your hands.</em>
        </h2>
        <div className="outro__cta" data-reveal>
          <button className="btn btn--solid" onClick={() => scrollToId('hero')}>Back to the rail</button>
        </div>
      </div>
      <footer className="footer" data-reveal>
        <span>© 2026 FERROVA</span>
        <span>React · Three.js · R3F · GSAP</span>
        <span>Drag · Tap · Arrow keys · Esc</span>
      </footer>
    </section>
  )
}
