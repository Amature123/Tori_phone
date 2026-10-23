// Matches the Minna no Nihongo word list (minna-ed2.json) against the app's
// N5 + N4 vocabulary. Matching is on a normalised key only; stored data is
// never altered. Writes matches.json + the authoring chunks for new words.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const data = path.join(here, "../../src/data")
const read = p => JSON.parse(fs.readFileSync(p, "utf8"))

const app = [...read(path.join(data, "n5/vocabulary.json")), ...read(path.join(data, "n4/vocabulary.json"))]
const minna = read(path.join(here, "minna-ed2.json"))

// Minna-only fictional places/companies/programmes carry no study value.
const FICTIONAL = /fictitious|fictional|fictive/i
const CHUNK = 150

const strip = s => s.replace(/[\s~〜\-。、!?・／]/g, "")
function variants(s) {
  if (!s) return []
  s = s.normalize("NFKC")
  const out = new Set()
  for (const b of [s.replace(/\[[^\]]*\]/g, ""), s.replace(/[[\]]/g, "")]) {
    out.add(b.replace(/\([^)]*\)/g, ""))
    const m = b.match(/\(([^)]*)\)/)
    if (m) out.add(m[1])
  }
  return [...out].flatMap(x => [x, ...(/[／・]/.test(x) ? x.split(/[／・]/) : [])]).map(strip).filter(Boolean)
}

const idx = new Map()
const add = (k, v) => { if (k) (idx.get(k) ?? idx.set(k, []).get(k)).push(v) }
for (const v of app) {
  for (const k of variants(v.kana)) add("k:" + k, v.id)
  for (const k of variants(v.kanji)) add("j:" + k, v.id)
}

const matches = []
const fresh = []
const dropped = []
const perLesson = {}
for (const e of minna) {
  const row = (perLesson[e.lesson] ??= { matched: 0, new: 0, dropped: 0 })
  let hit = null
  for (const k of variants(e.kana)) if (!hit && idx.has("k:" + k)) hit = idx.get("k:" + k)
  if (!hit) for (const k of variants(e.kanji)) if (!hit && idx.has("j:" + k)) hit = idx.get("j:" + k)
  if (hit) { row.matched++; matches.push({ lesson: e.lesson, n: e.n, ids: [...new Set(hit)] }) }
  else if (FICTIONAL.test(e.en)) { row.dropped++; dropped.push(e) }
  else { row.new++; fresh.push(e) }
}

fs.writeFileSync(path.join(here, "matches.json"), JSON.stringify(matches))
fs.writeFileSync(path.join(here, "new-words.json"), JSON.stringify(fresh))
fs.writeFileSync(path.join(here, "dropped.json"), JSON.stringify(dropped, null, 1))
for (const f of fs.readdirSync(path.join(here, "chunks"))) if (f.startsWith("in-")) fs.unlinkSync(path.join(here, "chunks", f))
for (let i = 0; i * CHUNK < fresh.length; i++) {
  const part = fresh.slice(i * CHUNK, (i + 1) * CHUNK).map(e => ({ key: `${e.lesson}-${e.n}`, kanji: e.kanji, kana: e.kana, en: e.en }))
  fs.writeFileSync(path.join(here, "chunks", `in-${String(i + 1).padStart(2, "0")}.json`), JSON.stringify(part, null, 0).replace(/\},\{/g, "},\n{"))
}

console.table(perLesson)
console.log({ total: minna.length, matched: matches.length, new: fresh.length, dropped: dropped.length, chunks: Math.ceil(fresh.length / CHUNK) })
