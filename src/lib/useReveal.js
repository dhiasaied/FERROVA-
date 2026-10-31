import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger, useGSAP)

/** Staggered rise-in for every [data-reveal] element inside `scope` as it scrolls into view. */
export function useReveal(scope) {
  useGSAP(
    () => {
      const items = gsap.utils.toArray('[data-reveal]', scope.current)
      if (!items.length) return
      gsap.from(items, {
        y: 46,
        autoAlpha: 0,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { trigger: scope.current, start: 'top 68%', toggleActions: 'play none none reverse' },
      })
    },
    { scope },
  )
}
