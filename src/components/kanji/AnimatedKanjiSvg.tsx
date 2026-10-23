import { useLayoutEffect, useRef } from "react"

interface AnimatedKanjiSvgProps {
  strokes: string[]
  viewBox: string
  replayKey: number
  strokeMs?: number
  className?: string
  /** Defaults reproduce the fixed white practice-sheet look (KanjiDrawer).
   *  Pass "transparent" + theme tokens to blend into a themed page instead. */
  background?: string
  guideColor?: string
  strokeColor?: string
  /** Guide layer opacity. The guide renders instantly (unanimated) behind
   *  the animated ink layer - if the two colors ever end up the same (e.g.
   *  `--color-structural` *is* full ink in the light themes, not a muted
   *  tone), a guideColor/strokeColor pair alone can't guarantee contrast, so
   *  this dims the guide independently and actually guarantees the draw-in
   *  reads as an animation instead of a static, already-finished glyph. */
  guideOpacity?: number
  /** Optional per-stroke ink color (index-aligned with `strokes`), used to
   *  tint each component's strokes. A missing/undefined entry falls back to
   *  `strokeColor`. Pure paint: never retriggers the draw-in animation. */
  strokeColors?: Array<string | undefined>
  /** Print each stroke's order number at its starting point, fading in as the
   *  stroke starts drawing. */
  showNumbers?: boolean
}

const GUIDE_COLOR = "#627d9a"
const STROKE_COLOR = "#2e3257"
const NUMBER_COLOR = "#be4327"

// KanjiVG stroke paths always begin with an absolute moveto ("M x,y" or "M x y").
function strokeStart(d: string): [number, number] | null {
  const m = d.match(/^M\s*(-?[\d.]+)[\s,]+(-?[\d.]+)/)
  return m ? [Number(m[1]), Number(m[2])] : null
}

// Draws each stroke path via a stroke-dasharray/dashoffset reveal, timed
// sequentially (stroke i starts once stroke i-1 finishes). Re-runs whenever
// `strokes` (new kanji) or `replayKey` (Replay button) changes. Refs stay
// stable across replays - paths are never remounted - so the "hide, then
// reveal on the next frame" reset never flashes the fully-drawn kanji first.
export function AnimatedKanjiSvg({
  strokes,
  viewBox,
  replayKey,
  strokeMs = 500,
  className = "",
  background = "rgb(255,255,255)",
  guideColor = GUIDE_COLOR,
  strokeColor = STROKE_COLOR,
  guideOpacity = 1,
  strokeColors,
  showNumbers = false,
}: AnimatedKanjiSvgProps) {
  const pathRefs = useRef<Array<SVGPathElement | null>>([])
  const numberRefs = useRef<Array<SVGTextElement | null>>([])

  useLayoutEffect(() => {
    const paths = pathRefs.current.filter((p): p is SVGPathElement => p !== null)
    if (paths.length === 0) return

    for (const path of paths) {
      const length = path.getTotalLength()
      path.style.transition = "none"
      path.style.strokeDasharray = `${length}`
      path.style.strokeDashoffset = `${length}`
    }
    for (const text of numberRefs.current) {
      if (!text) continue
      text.style.transition = "none"
      text.style.opacity = "0"
    }

    const raf = requestAnimationFrame(() => {
      paths.forEach((path, i) => {
        path.style.transition = `stroke-dashoffset ${strokeMs}ms ease-in-out ${i * strokeMs}ms`
        path.style.strokeDashoffset = "0"
      })
      numberRefs.current.forEach((text, i) => {
        if (!text) return
        text.style.transition = `opacity 150ms ease-out ${i * strokeMs}ms`
        text.style.opacity = "1"
      })
    })
    return () => cancelAnimationFrame(raf)
  }, [strokes, replayKey, strokeMs, showNumbers])

  return (
    <svg viewBox={viewBox} className={className} style={{ backgroundColor: background }}>
      <g fill="none" stroke={guideColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={guideOpacity}>
        {strokes.map((d, i) => (
          <path key={`guide-${i}`} d={d} />
        ))}
      </g>
      <g fill="none" stroke={strokeColor} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        {strokes.map((d, i) => (
          <path
            key={`stroke-${i}`}
            ref={el => {
              pathRefs.current[i] = el
            }}
            d={d}
            stroke={strokeColors?.[i]}
          />
        ))}
      </g>
      {showNumbers && (
        <g fontSize={8} fontWeight={700} fill={NUMBER_COLOR} stroke="white" strokeWidth={2.5} paintOrder="stroke" textAnchor="middle" style={{ pointerEvents: "none" }}>
          {strokes.map((d, i) => {
            const start = strokeStart(d)
            if (!start) return null
            return (
              <text
                key={`num-${i}`}
                ref={el => {
                  numberRefs.current[i] = el
                }}
                x={start[0] - 4}
                y={start[1] - 3}
              >
                {i + 1}
              </text>
            )
          })}
        </g>
      )}
    </svg>
  )
}
