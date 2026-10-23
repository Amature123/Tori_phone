import { create } from "zustand"
import { persist } from "zustand/middleware"

// Which grammar points the learner has marked as learned (ids like "g_001").
// Lives in localStorage only, like every other piece of learner state here.
interface GrammarProgressStore {
  learned: Record<string, true>
  toggle: (id: string) => void
  reset: () => void
}

export const useGrammarProgress = create<GrammarProgressStore>()(
  persist(
    (set, get) => ({
      learned: {},
      toggle: id => {
        const next = { ...get().learned }
        if (next[id]) delete next[id]
        else next[id] = true
        set({ learned: next })
      },
      reset: () => set({ learned: {} }),
    }),
    { name: "tori-grammar" }
  )
)
