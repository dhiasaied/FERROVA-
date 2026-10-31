import { create } from 'zustand'
import { garments } from '../data/garments'

const count = garments.length

export const useCloset = create((set, get) => ({
  sceneReady: false,
  sceneError: null,
  progress: 0,
  ready: false,
  active: 0,
  hovered: null,
  selected: null,
  colors: {},
  sizes: {},
  bag: [],
  toast: null,
  section: 'hero',

  setSceneReady: () => {
    if (get().sceneReady) return
    performance.mark('ferrova:scene-ready')
    set({ sceneReady: true, progress: 1 })
  },
  // A failed 3D scene still lets the site load, just without the canvas.
  setSceneError: (error) => !get().sceneError && set({ sceneError: error ?? new Error('3D scene unavailable'), sceneReady: true, progress: 1 }),
  // Loading progress only ever moves forward.
  setProgress: (p) => p > get().progress && set({ progress: Math.min(p, 1) }),
  setReady: () => {
    if (get().ready) return
    performance.mark('ferrova:ready')
    set({ ready: true })
  },
  setActive: (i) => get().active !== i && set({ active: i }),
  setHovered: (i) => get().hovered !== i && set({ hovered: i }),
  setSection: (section) => get().section !== section && set({ section }),

  select: (i) => set({ selected: i, hovered: null }),
  close: () => set({ selected: null }),
  selectNext: (dir) => {
    const { selected } = get()
    if (selected === null) return
    set({ selected: (selected + dir + count) % count })
  },

  setColor: (id, index) => set((s) => ({ colors: { ...s.colors, [id]: index } })),
  setSize: (id, size) => set((s) => ({ sizes: { ...s.sizes, [id]: size } })),

  addToBag: (item) => {
    const { colors, sizes } = get()
    const color = item.colors[colors[item.id] ?? 0].name
    const size = sizes[item.id] ?? item.sizes[Math.floor(item.sizes.length / 2)]
    set((s) => ({
      bag: [...s.bag, { id: item.id, name: item.name, price: item.price, color, size }],
      toast: { key: Date.now(), text: `${item.name} · ${color} · ${size} added to bag` },
    }))
  },
  clearToast: () => set({ toast: null }),
}))
