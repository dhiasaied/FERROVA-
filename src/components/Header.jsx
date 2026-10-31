import { useCloset } from '../store/useCloset'
import { scrollToId } from '../lib/scroll'

const LINKS = [
  ['hero', 'Rail'],
  ['craft', 'Craft'],
  ['collection', 'Collection'],
  ['outro', 'Visit'],
]

export default function Header() {
  const section = useCloset((s) => s.section)
  const bag = useCloset((s) => s.bag.length)
  const ready = useCloset((s) => s.ready)
  const inspecting = useCloset((s) => s.selected !== null)

  return (
    <header className={`header ${ready ? 'is-ready' : ''} ${inspecting ? 'is-dim' : ''}`}>
      <button className="brand" onClick={() => scrollToId('hero')} aria-label="FERROVA, back to top">
        <span className="brand__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M3 6h18M12 6v3.2M5 18l7-8.4 7 8.4z" /></svg>
        </span>
        FERROVA
      </button>
      <nav className="nav" aria-label="Sections">
        {LINKS.map(([id, label]) => (
          <button key={id} className={section === id ? 'is-active' : ''} onClick={() => scrollToId(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="bag" aria-live="polite">
        Bag <span className="bag__count">{bag}</span>
      </div>
    </header>
  )
}
