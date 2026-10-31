import { useEffect } from 'react'
import { useCloset } from '../store/useCloset'
import { stepRail } from '../three/railState'

export function useKeyboard() {
  useEffect(() => {
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const st = useCloset.getState()
      if (!st.ready) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const dir = e.key === 'ArrowRight' ? 1 : -1
        if (st.selected !== null) st.selectNext(dir)
        else stepRail(dir)
      } else if (e.key === 'Escape' && st.selected !== null) {
        st.close()
      } else if (e.key === 'Enter' && st.selected === null && document.activeElement === document.body) {
        st.select(st.active)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
