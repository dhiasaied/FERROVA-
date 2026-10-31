import Experience from './three/Experience'
import Loader from './components/Loader'
import Header from './components/Header'
import Hero from './components/Hero'
import Craft from './components/Craft'
import Collection from './components/Collection'
import Outro from './components/Outro'
import RailHUD from './components/RailHUD'
import InspectPanel from './components/InspectPanel'
import Toast from './components/Toast'
import Cursor from './components/Cursor'
import { useSmoothScroll } from './lib/useSmoothScroll'
import { useKeyboard } from './lib/useKeyboard'
import { useCloset } from './store/useCloset'

export default function App() {
  useSmoothScroll()
  useKeyboard()
  const inspecting = useCloset((s) => s.selected !== null)

  return (
    <>
      <div className="stage">
        <Experience />
      </div>
      <div className="vignette" aria-hidden="true" />
      <Header />
      <main id="scroll-root" className={inspecting ? 'is-inspecting' : ''}>
        <Hero />
        <Craft />
        <Collection />
        <Outro />
      </main>
      <RailHUD />
      <InspectPanel />
      <Toast />
      <Cursor />
      <Loader />
    </>
  )
}
