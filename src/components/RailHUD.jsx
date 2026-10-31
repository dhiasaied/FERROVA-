import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useCloset } from '../store/useCloset'
import { garments, formatPrice } from '../data/garments'
import { stepRail } from '../three/railState'

export default function RailHUD() {
  const root = useRef()
  const active = useCloset((s) => s.active)
  const ready = useCloset((s) => s.ready)
  const hidden = useCloset((s) => s.selected !== null || s.section === 'outro' || s.section === 'collection' || !!s.sceneError)
  const item = garments[active]

  useGSAP(
    () => {
      gsap.fromTo('.hud__swap', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.6, ease: 'expo.out', stagger: 0.04 })
    },
    { scope: root, dependencies: [active] },
  )

  return (
    <div className={`hud ${ready && !hidden ? 'is-visible' : ''}`} ref={root}>
      <button className="hud__arrow" onClick={() => stepRail(-1)} aria-label="Previous piece">
        <svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <button className="hud__info" onClick={() => useCloset.getState().select(active)} aria-label={`Inspect ${item.name}`}>
        <span className="hud__index">
          <span className="hud__swap">{String(active + 1).padStart(2, '0')}</span>
          <span className="hud__total"> / {String(garments.length).padStart(2, '0')}</span>
        </span>
        <span className="hud__text">
          <span className="hud__name hud__swap">{item.name}</span>
          <span className="hud__meta hud__swap">
            {item.category} · {formatPrice(item.price)}
          </span>
        </span>
        <span className="hud__view">View</span>
      </button>
      <button className="hud__arrow" onClick={() => stepRail(1)} aria-label="Next piece">
        <svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg>
      </button>
      <div className="hud__dots" aria-hidden="true">
        {garments.map((g, i) => (
          <span key={g.id} className={i === active ? 'is-active' : ''} />
        ))}
      </div>
      <p className="hud__hint" aria-hidden="true">
        <span className="hud__hint-line" /> Drag or swipe the rail
      </p>
    </div>
  )
}
