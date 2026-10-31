// Holds the Lenis instance so UI components can lock / drive smooth scrolling.
export const scroll = { lenis: null }

export function scrollToId(id) {
  const el = document.getElementById(id)
  if (!el) return
  if (scroll.lenis) scroll.lenis.scrollTo(el, { duration: 1.6 })
  else el.scrollIntoView({ behavior: 'smooth' })
}
