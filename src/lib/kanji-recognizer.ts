// Handwriting → kanji lookup, fully offline: the drawn strokes are compared
// with the KanjiVG stroke paths the app already ships (kanjivg.json).
//
// Everything here is pure math (no DOM), so it can be sampled in a few ms on
// the main thread and tested headlessly (scripts/test-recognizer.mjs measures
// top-1 / top-5 accuracy on synthetic, noisy drawings of every kanji).
//
// Pipeline: each stroke is resampled to a fixed number of points; the whole
// character is normalized (centroid + RMS radius, so one overshooting stroke
// can't squash the others); candidates are shortlisted by stroke count and
// ranked by a stroke-by-stroke shape cost plus a stroke-order-tolerant
// matching cost, so a wrong stroke order or a stroke drawn as two pieces
// still finds the right kanji. It is a "which of these ~960 kanji did I
// mean" ranker, not general OCR: only kanji present in kanjivg.json can be
// found.
import type { KanjiVgData } from "@/types"

export type Pt = [number, number]
export type Stroke = Pt[]

const SAMPLES = 16

// ---------------------------------------------------------------------------
// SVG path → polyline (KanjiVG uses absolute/relative M, C, S, and the odd L).
// ---------------------------------------------------------------------------
function tokenize(d: string): Array<string | number> {
  const out: Array<string | number> = []
  const re = /([MmCcSsLlHhVvZz])|(-?\d*\.?\d+(?:e-?\d+)?)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(d))) out.push(m[1] ?? Number(m[2]))
  return out
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, steps: number, into: Pt[]) {
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    const u = 1 - t
    const a = u * u * u
    const b = 3 * u * u * t
    const c = 3 * u * t * t
    const e = t * t * t
    into.push([a * p0[0] + b * p1[0] + c * p2[0] + e * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + e * p3[1]])
  }
}

/** Flattens an SVG path into a dense polyline. */
export function flattenPath(d: string): Pt[] {
  const tk = tokenize(d)
  const pts: Pt[] = []
  let i = 0
  let cur: Pt = [0, 0]
  let lastCtrl: Pt | null = null
  let cmd = ""
  const num = () => tk[i++] as number
  while (i < tk.length) {
    if (typeof tk[i] === "string") cmd = tk[i++] as string
    const rel = cmd === cmd.toLowerCase()
    const up = cmd.toUpperCase()
    if (up === "M") {
      const x = num(), y = num()
      cur = rel ? [cur[0] + x, cur[1] + y] : [x, y]
      pts.push(cur)
      lastCtrl = null
      cmd = rel ? "l" : "L" // further pairs after a moveto are linetos
    } else if (up === "L") {
      const x = num(), y = num()
      cur = rel ? [cur[0] + x, cur[1] + y] : [x, y]
      pts.push(cur)
      lastCtrl = null
    } else if (up === "H") {
      const x = num()
      cur = [rel ? cur[0] + x : x, cur[1]]
      pts.push(cur)
      lastCtrl = null
    } else if (up === "V") {
      const y = num()
      cur = [cur[0], rel ? cur[1] + y : y]
      pts.push(cur)
      lastCtrl = null
    } else if (up === "C") {
      const v = [num(), num(), num(), num(), num(), num()]
      const o = rel ? cur : ([0, 0] as Pt)
      const p1: Pt = [o[0] + v[0], o[1] + v[1]]
      const p2: Pt = [o[0] + v[2], o[1] + v[3]]
      const p3: Pt = [o[0] + v[4], o[1] + v[5]]
      cubic(cur, p1, p2, p3, 12, pts)
      cur = p3
      lastCtrl = p2
    } else if (up === "S") {
      const v = [num(), num(), num(), num()]
      const o = rel ? cur : ([0, 0] as Pt)
      const p1: Pt = lastCtrl ? [2 * cur[0] - lastCtrl[0], 2 * cur[1] - lastCtrl[1]] : cur
      const p2: Pt = [o[0] + v[0], o[1] + v[1]]
      const p3: Pt = [o[0] + v[2], o[1] + v[3]]
      cubic(cur, p1, p2, p3, 12, pts)
      cur = p3
      lastCtrl = p2
    } else if (up === "Z") {
      lastCtrl = null
    } else {
      i++ // unknown token; skip so we never loop forever
    }
  }
  return pts
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
export function resample(points: Pt[], n = SAMPLES): Pt[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: n }, () => points[0])
  const cum = [0]
  for (let i = 1; i < points.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  }
  const total = cum[cum.length - 1]
  if (total === 0) return Array.from({ length: n }, () => points[0])
  const out: Pt[] = []
  let seg = 1
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1)
    while (seg < cum.length - 1 && cum[seg] < target) seg++
    const span = cum[seg] - cum[seg - 1] || 1
    const f = (target - cum[seg - 1]) / span
    out.push([
      points[seg - 1][0] + (points[seg][0] - points[seg - 1][0]) * f,
      points[seg - 1][1] + (points[seg][1] - points[seg - 1][1]) * f,
    ])
  }
  return out
}

/** Centre on the centroid and scale by the RMS radius, so the glyph's "mass"
 *  (not its extreme corners) sets the size. Returns unit-ish coordinates. */
function normalize(strokes: Stroke[]): Stroke[] {
  let sx = 0, sy = 0, n = 0
  for (const s of strokes) for (const [x, y] of s) { sx += x; sy += y; n++ }
  if (n === 0) return strokes
  const cx = sx / n, cy = sy / n
  let r2 = 0
  for (const s of strokes) for (const [x, y] of s) r2 += (x - cx) ** 2 + (y - cy) ** 2
  const r = Math.sqrt(r2 / n) || 1
  return strokes.map(s => s.map(([x, y]): Pt => [(x - cx) / r, (y - cy) / r]))
}

function strokeDist(a: Stroke, b: Stroke): number {
  let d = 0
  for (let k = 0; k < SAMPLES; k++) d += Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1])
  d /= SAMPLES
  // Endpoints say where a stroke starts and stops; weight them extra so a
  // short stroke can't hide behind a long matching middle.
  const ends = Math.hypot(a[0][0] - b[0][0], a[0][1] - b[0][1]) + Math.hypot(a[SAMPLES - 1][0] - b[SAMPLES - 1][0], a[SAMPLES - 1][1] - b[SAMPLES - 1][1])
  return d + 0.25 * ends
}

// ---------------------------------------------------------------------------
// Directional ink features (order- and stroke-count-independent)
// ---------------------------------------------------------------------------
// The classic handwritten-kanji feature: lay the ink on a small grid and, per
// cell, record how much of it runs horizontally, vertically or along either
// diagonal (lines are direction-less here, so a stroke drawn backwards looks
// the same). Two drawings of the same kanji give similar maps even when a
// stroke was split, merged, reordered or wobbled, which is exactly where a
// stroke-by-stroke comparison falls apart.
const GRID = 22
const BLUR_PASSES = 2
const ORI = 4
const FEATURE_LEN = GRID * GRID * ORI

function inkFeatures(strokes: Stroke[]): Float32Array {
  // Dense polylines, then fit the glyph's bounding box into the grid keeping
  // its aspect ratio (so a wide 一 stays wide).
  const dense = strokes.map(s => (s.length === 1 ? [s[0], s[0]] : s))
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const st of dense) for (const [x, y] of st) {
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  const size = Math.max(maxX - minX, maxY - minY, 1e-6)
  const span = GRID - 3
  const ox = (maxX + minX) / 2, oy = (maxY + minY) / 2
  const f = new Float32Array(FEATURE_LEN)
  const put = (gx: number, gy: number, o: number, w: number) => {
    const x0 = Math.floor(gx), y0 = Math.floor(gy)
    const fx = gx - x0, fy = gy - y0
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const x = x0 + dx, y = y0 + dy
      if (x < 0 || y < 0 || x >= GRID || y >= GRID) continue
      f[(y * GRID + x) * ORI + o] += w * (dx ? fx : 1 - fx) * (dy ? fy : 1 - fy)
    }
  }
  for (const st of dense) {
    for (let i = 1; i < st.length; i++) {
      const dx = st[i][0] - st[i - 1][0], dy = st[i][1] - st[i - 1][1]
      const len = Math.hypot(dx, dy)
      if (len === 0) continue
      // Orientation in [0, π) mapped to ORI bins, split between neighbours.
      let ang = Math.atan2(dy, dx)
      if (ang < 0) ang += Math.PI
      if (ang >= Math.PI) ang -= Math.PI
      const pos = (ang / Math.PI) * ORI
      const o0 = Math.floor(pos) % ORI
      const frac = pos - Math.floor(pos)
      // Spread the segment along its length so long strokes cover the cells they cross.
      const steps = Math.max(1, Math.ceil((len / size) * span * 2))
      for (let k = 0; k < steps; k++) {
        const t = (k + 0.5) / steps
        const gx = ((st[i - 1][0] + dx * t - ox) / size) * span + GRID / 2
        const gy = ((st[i - 1][1] + dy * t - oy) / size) * span + GRID / 2
        const w = (len / size) / steps
        put(gx, gy, o0, w * (1 - frac))
        put(gx, gy, (o0 + 1) % ORI, w * frac)
      }
    }
  }
  // Blur (two passes of [1 2 1]) so near-misses overlap, then L2-normalize.
  const tmp = new Float32Array(FEATURE_LEN)
  for (let pass = 0; pass < BLUR_PASSES; pass++) {
    for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) for (let o = 0; o < ORI; o++) {
      let acc = 0, wsum = 0
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const X = x + dx, Y = y + dy
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue
        const w = (dx === 0 ? 2 : 1) * (dy === 0 ? 2 : 1)
        acc += f[(Y * GRID + X) * ORI + o] * w
        wsum += w
      }
      tmp[(y * GRID + x) * ORI + o] = acc / wsum
    }
    f.set(tmp)
  }
  let norm = 0
  for (let i = 0; i < FEATURE_LEN; i++) norm += f[i] * f[i]
  norm = Math.sqrt(norm) || 1
  for (let i = 0; i < FEATURE_LEN; i++) f[i] /= norm
  return f
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0
  for (let i = 0; i < FEATURE_LEN; i++) s += a[i] * b[i]
  return s
}

// ---------------------------------------------------------------------------
// Candidates
// ---------------------------------------------------------------------------
export interface Candidate { char: string; strokes: Stroke[]; features: Float32Array }
let candidates: Candidate[] | null = null

function makeCandidates(data: KanjiVgData): Candidate[] {
  return Object.entries(data).map(([char, entry]) => {
    const raw = entry.strokes.map(d => flattenPath(d))
    return { char, strokes: normalize(raw.map(p => resample(p))), features: inkFeatures(raw) }
  })
}

/** Samples every KanjiVG stroke once (cached for the session). */
export function buildCandidates(data: KanjiVgData): Candidate[] {
  candidates ??= makeCandidates(data)
  return candidates
}

let pending: Promise<Candidate[]> | null = null

/** Same result as buildCandidates, but in small slices with a yield between
 *  them, so building ~960 feature maps never freezes the page (the first tap
 *  on the drawing pad used to hitch while this ran in one go). */
export function buildCandidatesAsync(data: KanjiVgData): Promise<Candidate[]> {
  if (candidates) return Promise.resolve(candidates)
  pending ??= (async () => {
    const entries = Object.entries(data)
    const built: Candidate[] = []
    for (let i = 0; i < entries.length; i += 60) {
      for (const [char, entry] of entries.slice(i, i + 60)) {
        const raw = entry.strokes.map(d => flattenPath(d))
        built.push({ char, strokes: normalize(raw.map(p => resample(p))), features: inkFeatures(raw) })
      }
      await new Promise<void>(resolve => setTimeout(resolve, 0))
    }
    candidates = built
    return built
  })()
  return pending
}

/** Test hook: build candidates without touching the module cache. */
export function buildCandidatesUncached(data: KanjiVgData): Candidate[] {
  return makeCandidates(data)
}

// Cost of matching drawn strokes to a candidate's strokes in order.
function orderedCost(user: Stroke[], cand: Stroke[]): number {
  const m = Math.min(user.length, cand.length)
  let sum = 0
  for (let i = 0; i < m; i++) sum += strokeDist(user[i], cand[i])
  return sum / m
}

/** Pixels per dense point: drawn strokes arrive with sparse pointer samples,
 *  so densify before measuring direction. */
function densify(points: Pt[], step: number): Pt[] {
  const out: Pt[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i]
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / step))
    for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n])
  }
  return out
}

const SHORTLIST = 60
const COUNT_PENALTY = 0.015
const SHAPE_WEIGHT = 0.05

export function recognize(drawn: Stroke[], cands: Candidate[], limit = 12): string[] {
  const usable = drawn.filter(s => s.length > 0)
  if (usable.length === 0) return []
  // Light smoothing of mouse jitter: resample each stroke to a calm polyline.
  const calm = usable.map(s => (s.length < 2 ? s : resample(densify(s, 1), 40)))
  const feat = inkFeatures(calm)
  const first = cands
    .map(c => ({ c, sim: dot(feat, c.features) }))
    .sort((a, b) => b.sim - a.sim)
    .slice(0, SHORTLIST)
  const user = normalize(usable.map(s => resample(s)))
  return first
    .map(({ c, sim }) => {
      const diff = Math.abs(c.strokes.length - user.length)
      const shape = diff <= 1 ? orderedCost(user, c.strokes) : 1.5
      return { char: c.char, score: -sim + COUNT_PENALTY * diff + SHAPE_WEIGHT * shape }
    })
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map(s => s.char)
}
