// Merges the Minna import into the app vocabulary (additive only):
//  - tags every already-present matched entry with `minna: <lesson>`
//  - appends authored new entries (chunks/out-NN.json) with fresh ids
// Existing ids are never renumbered (SRS progress is keyed by id). Re-runnable:
// ids added by a previous run are listed in added-ids.json and replaced.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const data = path.join(here, "../../src/data")
const read = p => JSON.parse(fs.readFileSync(p, "utf8"))
const files = { N5: path.join(data, "n5/vocabulary.json"), N4: path.join(data, "n4/vocabulary.json") }
const vocab = { N5: read(files.N5), N4: read(files.N4) }
const prefix = { N5: "n5_", N4: "n4_" }

// 1. drop entries added by a previous merge run, clear old tags
const manifestPath = path.join(here, "added-ids.json")
const prev = new Set(fs.existsSync(manifestPath) ? read(manifestPath) : [])
for (const lvl of ["N5", "N4"]) {
  vocab[lvl] = vocab[lvl].filter(v => !prev.has(v.id))
  for (const v of vocab[lvl]) delete v.minna
}
const byId = new Map([...vocab.N5, ...vocab.N4].map(v => [v.id, v]))

// 2. tag matched entries with their (lowest) Minna lesson
let tagged = 0
for (const m of read(path.join(here, "matches.json"))) {
  for (const id of m.ids) {
    const v = byId.get(id)
    if (!v) continue
    if (v.minna === undefined) tagged++
    if (v.minna === undefined || m.lesson < v.minna) v.minna = m.lesson
  }
}

// 3. authored new entries
const POS = new Set(["noun", "pronoun", "verb-group1", "verb-group2", "verb-group3", "adj-i", "adj-na", "adverb", "conjunction", "interjection", "expression", "suffix", "determiner"])
const nospace = s => s.replace(/[\s　]+/g, "")
// The source list glosses 放送 (21-19) with the entry for 物価 ("prices").
const EN_FIX = { "21-19": "broadcast" }
const authored = new Map()
for (const f of fs.readdirSync(path.join(here, "chunks")).filter(f => /^out-\d+\.json$/.test(f)).sort())
  for (const a of read(path.join(here, "chunks", f))) authored.set(a.key, a)

const fresh = read(path.join(here, "new-words.json"))
const nextNum = { N5: 0, N4: 0 }
for (const lvl of ["N5", "N4"]) for (const v of vocab[lvl]) nextNum[lvl] = Math.max(nextNum[lvl], Number(v.id.slice(3)))
const seen = new Set([...byId.values()].map(v => nospace(v.kanji) + "|" + nospace(v.kana)))
const added = []
const problems = []
for (const e of fresh) {
  const key = `${e.lesson}-${e.n}`
  const a = authored.get(key)
  if (!a) { problems.push(`${key}: not authored`); continue }
  if (a.skip) continue
  if (!a.vi || !POS.has(a.pos) || !a.examples?.length) { problems.push(`${key}: incomplete`); continue }
  const kana = nospace(e.kana)
  const kanji = nospace(e.kanji ?? e.kana)
  const dupKey = kanji + "|" + kana
  if (seen.has(dupKey)) continue
  seen.add(dupKey)
  const lvl = e.lesson <= 25 ? "N5" : "N4"
  const id = prefix[lvl] + String(++nextNum[lvl]).padStart(4, "0")
  vocab[lvl].push({
    id, kanji, kana,
    meanings: { vi: a.vi, en: EN_FIX[key] ?? e.en },
    pos: a.pos,
    verbGroup: a.pos.startsWith("verb-group") ? Number(a.pos.slice(-1)) : null,
    adjType: a.pos === "adj-i" ? "i" : a.pos === "adj-na" ? "na" : null,
    jlptLevel: lvl,
    // No Tori chapter exists for these; the category keeps them out of the
    // "unknown chapter" bucket in the default VocabBrowser grouping.
    category: "Minna no Nihongo",
    minna: e.lesson,
    tags: [], homophones: [], relatedWords: [],
    examples: a.examples,
  })
  added.push(id)
}

fs.writeFileSync(files.N5, JSON.stringify(vocab.N5, null, 2) + "\n")
fs.writeFileSync(files.N4, JSON.stringify(vocab.N4, null, 2) + "\n")
fs.writeFileSync(manifestPath, JSON.stringify(added))
console.log({ tagged, added: added.length, N5: vocab.N5.length, N4: vocab.N4.length, problems: problems.length })
if (problems.length) console.log(problems.slice(0, 30).join("\n"))
