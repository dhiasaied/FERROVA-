import { useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { scroll } from './scroll'
import { rail } from '../three/railState'
import { useCloset } from '../store/useCloset'

gsap.registerPlugin(ScrollTrigger)

// Camera poses per section: hero → craft close-up → wide collection → low hero shot.
const POSES = {
  craft: { px: 0.55, py: 1.5, pz: 2.5, lx: -0.75, ly: 1.28, lz: 0 },
  collection: { px: -2.2, py: 2.35, pz: 7.6, lx: 0.9, ly: 1.15, lz: 0 },
  outro: { px: 0, py: 0.75, pz: 3.9, lx: 0, ly: 1.55, lz: 0 },
}

export function useSmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 })
    scroll.lenis = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    lenis.stop()

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: 'power1.inOut', duration: 1 },
        scrollTrigger: { trigger: '#scroll-root', start: 'top top', end: 'bottom bottom', scrub: 1.1 },
      })
      tl.to(rail.cam, POSES.craft).to(rail.cam, POSES.collection).to(rail.cam, POSES.outro)

      for (const id of ['hero', 'craft', 'collection', 'outro']) {
        ScrollTrigger.create({
          trigger: `#${id}`,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (self) => self.isActive && useCloset.getState().setSection(id),
        })
      }
    })

    // Unlock scrolling as soon as the site is revealed; keep it locked while a piece is inspected.
    const unsub = useCloset.subscribe((s, prev) => {
      if (s.ready && !prev.ready && s.selected === null) lenis.start()
      if (s.selected !== prev.selected) {
        if (s.selected !== null) lenis.stop()
        else if (s.ready) lenis.start()
      }
    })

    return () => {
      unsub()
      ctx.revert()
      gsap.ticker.remove(tick)
      lenis.destroy()
      scroll.lenis = null
    }
  }, [])
}
