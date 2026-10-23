// Builds src/data/verb-index.json: every verb in the N5 + N4 vocabulary with
// its dictionary form (辞書形), group and meaning, derived from the ます form
// the textbooks list. The verb-group checker on the Verb Forms page looks
// words up here first and only falls back to rules for unknown verbs.
// Re-run after vocabulary.json changes.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const read = p => JSON.parse(readFileSync(path.join(root, p), "utf8"))
const vocab = [...read("src/data/n5/vocabulary.json"), ...read("src/data/n4/vocabulary.json")]

const I_TO_U = { い: "う", き: "く", ぎ: "ぐ", し: "す", ち: "つ", に: "ぬ", び: "ぶ", み: "む", り: "る" }
const clean = s => s.replace(/[（(][^）)]*[）)]/g, "").replace(/[～〜]/g, "").trim()

// ます form → dictionary form, using the group the vocabulary already records.
function dictionaryForm(masu, group) {
  // Most N4 verbs are already stored in dictionary form.
  if (!masu.endsWith("ます")) return /[うくぐすつぬぶむる]$/.test(masu) ? masu : null
  const stem = masu.slice(0, -2)
  if (group === 2) return stem + "る"
  if (group === 3) {
    if (stem.endsWith("し")) return stem.slice(0, -1) + "する"
    if (stem.endsWith("来") ) return stem + "る"
    if (stem.endsWith("き")) return stem.slice(0, -1) + "くる"
    return null
  }
  const last = stem.slice(-1)
  return I_TO_U[last] ? stem.slice(0, -1) + I_TO_U[last] : null
}

const seen = new Set()
const out = []
for (const v of vocab) {
  if (!String(v.pos).startsWith("verb") || !v.verbGroup) continue
  const kanjiMasu = clean(v.kanji)
  const kanaMasu = clean(v.kana)
  const k = dictionaryForm(kanjiMasu, v.verbGroup)
  const y = dictionaryForm(kanaMasu, v.verbGroup)
  if (!k || !y || seen.has(k + y)) continue
  seen.add(k + y)
  out.push({ k, y, g: v.verbGroup, m: { vi: v.meanings?.vi ?? "", en: v.meanings?.en ?? "" } })
}
out.sort((a, b) => a.y.localeCompare(b.y, "ja"))
writeFileSync(path.join(root, "src/data/verb-index.json"), JSON.stringify(out) + "\n", "utf8")
const g = n => out.filter(x => x.g === n).length
console.log(`Wrote ${out.length} verbs (group1 ${g(1)}, group2 ${g(2)}, group3 ${g(3)})`)
console.log("Group 1 ending いる/える:", out.filter(x => x.g === 1 && /[いえ]る$/.test(x.y)).map(x => x.k + "(" + x.y + ")").join(" "))
console.log("Group 2 ending いる:", out.filter(x => x.g === 2 && /い?る$/.test(x.y) && /い[る]$/.test(x.y)).map(x => x.k + "(" + x.y + ")").join(" "))
