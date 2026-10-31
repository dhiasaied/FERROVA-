import { garments } from '../data/garments'
import { buildGarment } from '../three/geometry/garmentFactory'
import { getWeaveTextures } from '../three/materials/fabric'
import { useCloset } from '../store/useCloset'

// Progress budget for each loading stage (0 → 1 overall).
export const STAGES = { fonts: 0.1, scene: [0.1, 0.8], compiled: 0.92 }

// setTimeout rather than requestAnimationFrame so preparation keeps going in background tabs.
const yieldToBrowser = () => new Promise((resolve) => setTimeout(resolve, 0))

let pending = null

/**
 * Builds every fabric texture and garment mesh up front, one per task, so the
 * loader keeps animating instead of freezing on a single long render. Results are
 * cached, so the scene's own useMemo calls become instant lookups.
 */
export function prepareScene() {
  if (pending) return pending
  pending = (async () => {
    performance.mark('ferrova:prepare-start')
    const kinds = [...new Set([...garments.map((g) => g.fabric), 'plaster', 'stone'])]
    const jobs = [...kinds.map((k) => () => getWeaveTextures(k)), ...garments.map((g) => () => buildGarment(g))]
    const [from, to] = STAGES.scene
    for (let i = 0; i < jobs.length; i++) {
      jobs[i]()
      useCloset.getState().setProgress(from + ((i + 1) / jobs.length) * (to - from))
      await yieldToBrowser()
    }
    performance.mark('ferrova:prepare-end')
  })()
  return pending
}

/** Resolves when web fonts are ready, or after `timeout` so a slow font CDN never blocks the site. */
export function waitForFonts(timeout = 2500) {
  const fonts = document.fonts?.ready ?? Promise.resolve()
  return Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, timeout))])
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    const gl = window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    // Release the probe context right away; browsers cap how many can be alive.
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return !!gl
  } catch {
    return false
  }
}
