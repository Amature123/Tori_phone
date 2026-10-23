import { useEffect, useRef } from "react"
import type { Pt, Stroke } from "@/lib/kanji-recognizer"

interface DrawPadProps {
  strokes: Stroke[]
  onChange: (strokes: Stroke[]) => void
  className?: string
}

const SIZE = 320

// Plain pointer-event canvas (mouse, touch and pen alike). The in-progress
// stroke lives in a ref and is painted directly in an animation frame, so
// drawing never waits on a React render; only a finished stroke is lifted into
// `strokes`. Coalesced pointer events supply the points a fast stroke would
// otherwise skip, and segments are joined with quadratic curves through their
// midpoints so a wobbly hand reads as a smooth line instead of a polyline.
export function DrawPad({ strokes, onChange, className = "" }: DrawPadProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const current = useRef<Pt[] | null>(null)
  const frame = useRef(0)

  const trace = (ctx: CanvasRenderingContext2D, s: Pt[]) => {
    ctx.beginPath()
    ctx.moveTo(s[0][0], s[0][1])
    if (s.length === 1) {
      ctx.lineTo(s[0][0] + 0.1, s[0][1])
    } else {
      for (let i = 1; i < s.length - 1; i++) {
        const mx = (s[i][0] + s[i + 1][0]) / 2
        const my = (s[i][1] + s[i + 1][1]) / 2
        ctx.quadraticCurveTo(s[i][0], s[i][1], mx, my)
      }
      const last = s[s.length - 1]
      ctx.lineTo(last[0], last[1])
    }
    ctx.stroke()
  }

  const paint = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, SIZE, SIZE)
    ctx.strokeStyle = "rgba(98,125,154,0.35)"
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(SIZE / 2, 0); ctx.lineTo(SIZE / 2, SIZE)
    ctx.moveTo(0, SIZE / 2); ctx.lineTo(SIZE, SIZE / 2)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.strokeStyle = "#2e3257"
    ctx.lineWidth = 6
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    for (const s of strokes) if (s.length > 0) trace(ctx, s)
    if (current.current && current.current.length > 0) trace(ctx, current.current)
  }

  const schedulePaint = () => {
    if (frame.current) return
    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      paint()
    })
  }

  // Repaint when the committed strokes change (undo / clear / new stroke).
  useEffect(() => { paint() })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  const point = (canvas: HTMLCanvasElement, clientX: number, clientY: number): Pt => {
    const rect = canvas.getBoundingClientRect()
    return [((clientX - rect.left) / rect.width) * SIZE, ((clientY - rect.top) / rect.height) * SIZE]
  }

  return (
    <canvas
      ref={canvasRef}
      width={SIZE}
      height={SIZE}
      className={`touch-none cursor-crosshair border-3 border-structural bg-white ${className}`}
      onPointerDown={e => {
        e.currentTarget.setPointerCapture(e.pointerId)
        current.current = [point(e.currentTarget, e.clientX, e.clientY)]
        schedulePaint()
      }}
      onPointerMove={e => {
        const stroke = current.current
        if (!stroke) return
        const events = e.nativeEvent.getCoalescedEvents?.() ?? []
        const list = events.length > 0 ? events : [e.nativeEvent]
        for (const ev of list) {
          const p = point(e.currentTarget, ev.clientX, ev.clientY)
          const prev = stroke[stroke.length - 1]
          // Skip sub-pixel jitter; it adds noise, not information.
          if (!prev || Math.hypot(p[0] - prev[0], p[1] - prev[1]) >= 1) stroke.push(p)
        }
        schedulePaint()
      }}
      onPointerUp={() => {
        const stroke = current.current
        current.current = null
        if (stroke) onChange([...strokes, stroke])
      }}
      onPointerCancel={() => { current.current = null; schedulePaint() }}
    />
  )
}
