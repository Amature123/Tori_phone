// Sanity-checks the authored chunks (out-NN.json) before merging.
// Examples: `kana` must be kana-only and contain every kana character of `ja`
// in order (cheap guard against a reading that does not belong to the sentence).
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const chunks = path.join(here, "chunks")
const KANJI = /[一-鿿々]/
const KANA = /[ぁ-ヿ]/
const DASH = /—|--/
const POS = new Set(["noun", "pronoun", "verb-group1", "verb-group2", "verb-group3", "adj-i", "adj-na", "adverb", "conjunction", "interjection", "expression", "suffix", "determiner"])

function subsequence(small, big) {
  let i = 0
  for (const c of big) if (c === small[i]) i++
  return i === small.length
}

const errors = []
let n = 0
for (const f of fs.readdirSync(chunks).filter(f => /^in-\d+\.json$/.test(f)).sort()) {
  const outPath = path.join(chunks, f.replace("in-", "out-"))
  if (!fs.existsSync(outPath)) { errors.push(`${f}: no output yet`); continue }
  const input = JSON.parse(fs.readFileSync(path.join(chunks, f), "utf8"))
  const out = JSON.parse(fs.readFileSync(outPath, "utf8"))
  if (input.length !== out.length) errors.push(`${f}: count ${input.length} vs ${out.length}`)
  input.forEach((e, i) => {
    const a = out[i]
    if (!a || a.key !== e.key) return errors.push(`${f}[${i}]: key mismatch ${e.key}`)
    n++
    if (a.skip) return
    const tag = `${a.key} ${e.kana}`
    if (!a.vi) errors.push(`${tag}: no vi`)
    if (!POS.has(a.pos)) errors.push(`${tag}: bad pos ${a.pos}`)
    if (a.pos.startsWith("verb-group") && String(a.verbGroup) !== a.pos.slice(-1)) errors.push(`${tag}: verbGroup ${a.verbGroup} vs ${a.pos}`)
    if (a.pos === "adj-i" && a.adjType !== "i") errors.push(`${tag}: adjType`)
    if (a.pos === "adj-na" && a.adjType !== "na") errors.push(`${tag}: adjType`)
    if (!a.examples?.length) errors.push(`${tag}: no examples`)
    for (const x of a.examples ?? []) {
      for (const k of ["ja", "kana", "vi", "en"]) if (!x[k]) errors.push(`${tag}: example missing ${k}`)
      if (KANJI.test(x.kana ?? "") || (/\s/.test(x.kana ?? "") && !/\s/.test(x.ja ?? ""))) errors.push(`${tag}: kana not pure: ${x.kana}`)
      const jaKana = [...(x.ja ?? "")].filter(c => KANA.test(c)).join("")
      if (!subsequence(jaKana, x.kana ?? "")) errors.push(`${tag}: kana/ja mismatch: ${x.ja} / ${x.kana}`)
      if ([a.vi, x.vi, x.en].some(s => DASH.test(s ?? ""))) errors.push(`${tag}: dash`)
    }
  })
}
console.log(`checked ${n} entries, ${errors.length} problems`)
console.log(errors.slice(0, 80).join("\n"))
process.exitCode = errors.length ? 1 : 0
