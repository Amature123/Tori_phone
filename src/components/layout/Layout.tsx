import { useEffect, useMemo, useState } from "react"
import { Outlet, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { TabBar } from "./TabBar"
import { Furigana } from "@/components/ui/Furigana"
import { cancelSpeech } from "@/lib/speech"

export function Layout() {
  const location = useLocation()
  const [navOpen, setNavOpen] = useState(false)

  // Close the mobile drawer whenever the route changes (covers back/forward
  // nav and any navigation that doesn't go through Sidebar's own onClose).
  // Also stops any in-flight pronunciation - without this, tapping a
  // SpeakButton and then switching tabs mid-utterance leaves the voice
  // reading a word from the screen you just left.
  useEffect(() => {
    setNavOpen(false)
    cancelSpeech()
  }, [location.pathname])

  // The routed page is memoized on the pathname: toggling the drawer
  // re-renders this component, but React bails out of an unchanged element,
  // so opening the drawer never re-reconciles a list-heavy page (that used to
  // drop frames during the drawer's slide-in).
  const page = useMemo(() => (
    <main
      className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0"
      style={{
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        // Clear the floating tab bar on phones (it is hidden at lg+).
        scrollPaddingBottom: '6rem',
      }}
    >
      <div key={location.pathname} className="view-enter h-full">
        <Outlet />
      </div>
    </main>
  ), [location.pathname])

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      {/* Mobile top bar: hamburger + wordmark. Sits in normal flow (not
          fixed) so the row below gets the exact remaining height via flex,
          rather than pages having to guess a header height to pad around.
          Hidden at lg+ where the sidebar is always visible. */}
      <header
        className="glass-strong lg:hidden flex items-center gap-3 rounded-b-[24px] border-t-0 pb-2.5 shrink-0 z-20"
        style={{
          paddingTop: "max(0.625rem, env(safe-area-inset-top))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        <button
          type="button"
          onClick={() => setNavOpen(true)}
          aria-label="Open menu"
          aria-expanded={navOpen}
          className="flex flex-col justify-center gap-1 w-10 h-10 rounded-full bg-surface shrink-0 cursor-pointer"
        >
          <span className="block h-0.5 w-5 mx-auto bg-current" />
          <span className="block h-0.5 w-5 mx-auto bg-current" />
          <span className="block h-0.5 w-5 mx-auto bg-current" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-display tracking-tighter leading-none">
            <Furigana kanji="鳥" kana="とり" />
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-widest text-muted whitespace-nowrap">
            TORI
          </span>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Backdrop, mobile only, shown while the drawer is open */}
        {navOpen && (
          <div
            className="lg:hidden fixed inset-0 z-30 bg-ink/30 backdrop-blur-sm"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}

        <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />

        {page}
      </div>

      <TabBar onMore={() => setNavOpen(true)} />
    </div>
  )
}
