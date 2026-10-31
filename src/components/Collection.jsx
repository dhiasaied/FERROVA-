import { useRef } from 'react'
import { useReveal } from '../lib/useReveal'
import { garments, formatPrice } from '../data/garments'
import { useCloset } from '../store/useCloset'

export default function Collection() {
  const root = useRef()
  const active = useCloset((s) => s.active)
  const colors = useCloset((s) => s.colors)
  useReveal(root)

  return (
    <section id="collection" className="section collection" ref={root}>
      <div className="panel collection__panel">
        <div className="collection__head" data-reveal>
          <p className="eyebrow">03 — The collection</p>
          <h2 className="display">
            Nine pieces, <em>one rail.</em>
          </h2>
        </div>
        <ol className="list">
          {garments.map((g, i) => {
            const c = g.colors[colors[g.id] ?? 0]
            return (
              <li key={g.id} data-reveal>
                <button className={`list__row ${active === i ? 'is-active' : ''}`} onClick={() => useCloset.getState().select(i)}>
                  <span className="list__n">{String(i + 1).padStart(2, '0')}</span>
                  <span className="list__swatch" style={{ background: c.hex }} aria-hidden="true" />
                  <span className="list__name">
                    {g.name}
                    <small>{g.category}</small>
                  </span>
                  <span className="list__price">{formatPrice(g.price)}</span>
                  <span className="list__go" aria-hidden="true">→</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
