// Headless accuracy test for src/lib/kanji-recognizer.ts.
// Run: node scripts/test-recognizer.ts [--seed=N] [--noise=1.0]
// For every kanji in kanjivg.json it synthesizes a hand-drawn version
// (wobble, aspect/shear/rotation, truncated stroke ends, sparse mouse-like
// sampling) and checks how often the original comes back in the top 1 / top 5.
import { readFileSync } from "node:fs"
import { buildCandidatesUncached, flattenPath, recognize, resample, type Pt, type Stroke } from "../src/lib/kanji-recognizer.ts"

const data = JSON.parse(readFileSync(new URL("../src/data/kanjivg.json", import.meta.url), "utf8"))
const arg = (name: string, def: number) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`))
  return a ? Number(a.split("=")[1]) : def
}
const NOISE = arg("noise", 1)
const HUMAN = arg("human", 0) === 1
let seed = arg("seed", 1)
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-9)) * Math.cos(2 * Math.PI * rnd())

// Real hands: strokes merged (口 drawn in one go), split in two, written out
// of order, drawn backwards, and each stroke wanders on its own.
function humanize(strokes: Stroke[]): Stroke[] {
  let out = strokes.map(st => st.slice())
  for (let i = 0; i < out.length - 1; i++) {
    if (rnd() < 0.12) out.splice(i, 2, [...out[i], ...out[i + 1]])
  }
  for (let i = 0; i < out.length; i++) {
    if (out[i].length > 6 && rnd() < 0.08) {
      const k = Math.floor(out[i].length / 2)
      out.splice(i, 1, out[i].slice(0, k + 1), out[i].slice(k))
      i++
    }
  }
  for (let i = 0; i < out.length - 1; i++) if (rnd() < 0.12) [out[i], out[i + 1]] = [out[i + 1], out[i]]
  out = out.map(st => {
    const dx = gauss() * 2.2, dy = gauss() * 2.2, k = 1 + gauss() * 0.06
    const st2 = st.map(([x, y]): Pt => [(x - 54) * k + 54 + dx, (y - 54) * k + 54 + dy])
    return rnd() < 0.05 ? st2.reverse() : st2
  })
  return out
}

function draw(strokesD: string[]): Stroke[] {
  // character-level distortion
  const sx = 1 + (rnd() - 0.5) * 0.3 * NOISE, sy = 1 + (rnd() - 0.5) * 0.3 * NOISE
  const shear = (rnd() - 0.5) * 0.16 * NOISE
  const rot = ((rnd() - 0.5) * 8 * Math.PI) / 180 * NOISE
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const tx = (rnd() - 0.5) * 20, ty = (rnd() - 0.5) * 20
  const drawn = strokesD.map(d => {
    let pts = resample(flattenPath(d), 60)
    // truncate/overshoot ends
    const cutA = Math.floor(rnd() * 5 * NOISE), cutB = Math.floor(rnd() * 5 * NOISE)
    pts = pts.slice(cutA, pts.length - cutB)
    // low-frequency wobble + jitter
    const amp = 1.4 * NOISE, ph = rnd() * 6.28, fr = 1 + rnd() * 2
    pts = pts.map(([x, y], i): Pt => {
      const t = i / pts.length
      const w = Math.sin(ph + t * fr * 6.28) * amp
      return [x + w + gauss() * 0.6 * NOISE, y - w + gauss() * 0.6 * NOISE]
    })
    // sparse sampling like pointer events
    const keep = 8 + Math.floor(rnd() * 14)
    const sparse: Pt[] = []
    for (let i = 0; i < keep; i++) sparse.push(pts[Math.min(pts.length - 1, Math.round((i / (keep - 1)) * (pts.length - 1)))])
    return sparse.map(([x, y]): Pt => {
      const X = (x - 54) * sx + (y - 54) * shear
      const Y = (y - 54) * sy
      return [X * cos - Y * sin + 54 + tx, X * sin + Y * cos + 54 + ty]
    })
  })
  return HUMAN ? humanize(drawn) : drawn
}

const cands = buildCandidatesUncached(data)
const chars = Object.keys(data)
let top1 = 0, top5 = 0
const misses: string[] = []
const t0 = performance.now()
for (const c of chars) {
  const guess = recognize(draw(data[c].strokes), cands, 5)
  if (guess[0] === c) top1++
  if (guess.includes(c)) top5++
  else misses.push(`${c}→${guess[0]}`)
}
const ms = (performance.now() - t0) / chars.length
console.log(`n=${chars.length} noise=${NOISE} top1=${((top1 / chars.length) * 100).toFixed(1)}% top5=${((top5 / chars.length) * 100).toFixed(1)}% (${ms.toFixed(2)} ms/query)`)
console.log("sample misses:", misses.slice(0, 25).join(" "))
for (const c of ["言", "話", "語", "読", "十", "口", "人", "日", "本"]) {
  let ok = 0
  const N = 40
  for (let i = 0; i < N; i++) if (recognize(draw(data[c].strokes), cands, 5)[0] === c) ok++
  process.stdout.write(`${c}:${ok}/${N}  `)
}
console.log()
