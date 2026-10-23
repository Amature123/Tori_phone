import { useEffect, useState } from "react"
import type { KanjiVgData } from "@/types"

// kanjivg.json (~1MB) is fetched on first use instead of bundled with a page,
// and cached at module level so every consumer shares one load. A failed fetch
// is not cached, so the next caller retries.
let data: KanjiVgData | null = null
let promise: Promise<KanjiVgData> | null = null

export function loadKanjiVg(): Promise<KanjiVgData> {
  promise ??= import("@/data/kanjivg.json")
    .then(m => (data = m.default as KanjiVgData))
    .catch(e => { promise = null; throw e })
  return promise
}

/** The stroke data, or null until it has loaded. */
export function useKanjiVg(): KanjiVgData | null {
  const [vg, setVg] = useState<KanjiVgData | null>(data)
  useEffect(() => {
    if (vg) return
    let cancelled = false
    loadKanjiVg().then(d => { if (!cancelled) setVg(d) }, () => {})
    return () => { cancelled = true }
  }, [vg])
  return vg
}
