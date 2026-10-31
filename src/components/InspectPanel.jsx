import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCloset } from '../store/useCloset'
import { garments, formatPrice } from '../data/garments'

export default function InspectPanel() {
  const root = useRef()
  const selected = useCloset((s) => s.selected)
  const colors = useCloset((s) => s.colors)
  const sizes = useCloset((s) => s.sizes)
  // Keep showing the last piece while the panel animates out.
  const [shown, setShown] = useState(null)
  const open = selected !== null

  useEffect(() => {
    if (selected !== null) setShown(selected)
  }, [selected])

  useGSAP(
    () => {
      const mobile = window.matchMedia('(max-width: 820px)').matches
      const from = mobile ? { yPercent: 105, xPercent: 0 } : { xPercent: 105, yPercent: 0 }
      if (open) {
        gsap.set(root.current, { visibility: 'visible' })
        gsap.fromTo(root.current, from, { xPercent: 0, yPercent: 0, duration: 1.1, ease: 'expo.out', delay: 0.25, overwrite: true })
      } else {
        gsap.to(root.current, { ...from, duration: 0.7, ease: 'expo.in', overwrite: true, onComplete: () => gsap.set(root.current, { visibility: 'hidden' }) })
      }
    },
    { dependencies: [open] },
  )

  useGSAP(
    () => {
      if (selected === null) return
      gsap.fromTo('[data-stagger]', { y: 28, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.05, delay: 0.35 })
    },
    { scope: root, dependencies: [selected] },
  )

  const item = shown !== null ? garments[shown] : garments[0]
  const colorIndex = colors[item.id] ?? 0
  const size = sizes[item.id] ?? item.sizes[Math.floor(item.sizes.length / 2)]
  const st = useCloset.getState

  return (
    <aside className="inspect" ref={root} aria-hidden={!open} aria-label="Piece details" style={{ visibility: 'hidden' }}>
      <div className="inspect__bar" data-stagger>
        <span className="inspect__count">
          {String(shown + 1).padStart(2, '0')} <span>/ {String(garments.length).padStart(2, '0')}</span>
        </span>
        <div className="inspect__nav">
          <button onClick={() => st().selectNext(-1)} aria-label="Previous piece">
            <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <button onClick={() => st().selectNext(1)} aria-label="Next piece">
            <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
          </button>
          <button className="inspect__close" onClick={() => st().close()} aria-label="Back to the rail">
            <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>

      <div className="inspect__scroll" data-lenis-prevent>
        <p className="eyebrow" data-stagger>{item.category}</p>
        <h2 className="inspect__name" data-stagger>{item.name}</h2>
        <p className="inspect__price" data-stagger>{formatPrice(item.price)}</p>
        <p className="inspect__desc" data-stagger>{item.description}</p>

        <div className="inspect__group" data-stagger>
          <p className="label">
            Colour <span>{item.colors[colorIndex].name}</span>
          </p>
          <div className="swatches">
            {item.colors.map((c, i) => (
              <button
                key={c.name}
                className={`swatch ${i === colorIndex ? 'is-active' : ''}`}
                style={{ '--c': c.hex }}
                onClick={() => st().setColor(item.id, i)}
                aria-label={c.name}
                aria-pressed={i === colorIndex}
              />
            ))}
          </div>
        </div>

        <div className="inspect__group" data-stagger>
          <p className="label">Size</p>
          <div className="sizes">
            {item.sizes.map((s) => (
              <button key={s} className={`size ${s === size ? 'is-active' : ''}`} onClick={() => st().setSize(item.id, s)} aria-pressed={s === size}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <button className="btn btn--solid btn--wide" data-stagger onClick={() => st().addToBag(item)}>
          Add to bag · {formatPrice(item.price)}
        </button>

        <dl className="specs" data-stagger>
          {Object.entries(item.specs).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p className="inspect__hint" data-stagger>Drag the piece to turn it · Esc to return</p>
      </div>
    </aside>
  )
}
