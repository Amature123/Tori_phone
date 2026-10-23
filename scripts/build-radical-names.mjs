// Builds src/data/radical-names.json: Hán Việt names for every unique
// KanjiVG decomposition component that appears in kanjivg.json.
// Three sources, in priority order:
//   1. "pdf"     — the 214 radicals of bothu.pdf (scripts/radical-pdf-table.json,
//      transcribed name + gloss per entry). Authoritative: wins over everything
//      below, including anchor hanviet, because the PDF also names the
//      positional variants (氵 "3 chấm thủy", 亻 "Nhân đứng", ...) that
//      anchors can't. Also keyed under each Japanese-form twin (黑→黒, ...)
//      and each KanjiVG variant glyph (⻌→辶, ...) via radical-aliases.mjs.
//   2. "anchor"  — the component char is itself one of kanji.json's leading
//      kanji, so its hanviet is already textbook-verified.
//   3. "curated" — hand-supplied radical names from radical-names-curated.mjs
//      (flagged for spot-check).
// Components matching neither are omitted; the UI shows the bare character.
// Level-agnostic like kanjivg.json (see fetch-kanjivg.mjs) — a component is
// looked up by character alone, regardless of which level's kanji it came
// from.
// Re-run after fetch-kanjivg.mjs changes the component set.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { curatedRadicalNames } from "./radical-names-curated.mjs"
import { VARIANT_TO_CANONICAL, PDF_TO_JAPANESE_FORM } from "./radical-aliases.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const n5KanjiJsonPath = path.join(root, "src/data/n5/kanji.json")
const n4KanjiJsonPath = path.join(root, "src/data/n4/kanji.json")
const kanjivgJsonPath = path.join(root, "src/data/kanjivg.json")
const outPath = path.join(root, "src/data/radical-names.json")

const n5KanjiData = JSON.parse(readFileSync(n5KanjiJsonPath, "utf8"))
const n4KanjiData = JSON.parse(readFileSync(n4KanjiJsonPath, "utf8"))
const kanjivgData = JSON.parse(readFileSync(kanjivgJsonPath, "utf8"))

const hanvietDictionary = JSON.parse(readFileSync(path.join(root, "src/data/hanviet-dictionary.json"), "utf8"))
const pdfTable = JSON.parse(readFileSync(path.join(__dirname, "radical-pdf-table.json"), "utf8"))
const pdfByGlyph = new Map(pdfTable.map(r => [r.glyph, r]))
for (const [pdfGlyph, jpGlyph] of Object.entries(PDF_TO_JAPANESE_FORM)) pdfByGlyph.set(jpGlyph, pdfByGlyph.get(pdfGlyph))
for (const [variant, canonical] of Object.entries(VARIANT_TO_CANONICAL)) {
  if (pdfByGlyph.has(canonical)) pdfByGlyph.set(variant, pdfByGlyph.get(canonical))
}

const anchorHanviet = new Map()
for (const chapter of [...n5KanjiData.chapters, ...n4KanjiData.chapters]) {
  for (const group of chapter.groups) {
    if (group.anchor && group.hanviet && !anchorHanviet.has(group.anchor)) anchorHanviet.set(group.anchor, group.hanviet)
  }
}

const components = new Set(pdfByGlyph.keys())
for (const char in kanjivgData) {
  for (const comp of kanjivgData[char].components) components.add(comp.element)
}

// Sources disagree on casing ("Nhất" anchor, "ất" curated); display names are
// always sentence-case so chips read uniformly.
const cap = str => str.charAt(0).toLocaleUpperCase("vi") + str.slice(1)

const result = {}
let fromPdf = 0
let fromAnchor = 0
let fromCurated = 0
let missing = []
for (const el of components) {
  if (pdfByGlyph.has(el)) {
    const { hanviet, meaning } = pdfByGlyph.get(el)
    result[el] = { hanviet, ...(meaning ? { meaning } : {}), curated: false }
    fromPdf++
  } else if (anchorHanviet.has(el)) {
    result[el] = { hanviet: cap(anchorHanviet.get(el)), curated: false }
    fromAnchor++
  } else if (hanvietDictionary[el]) {
    result[el] = { hanviet: cap(hanvietDictionary[el]), curated: false }
    fromAnchor++
  } else if (curatedRadicalNames[el]) {
    result[el] = { hanviet: cap(curatedRadicalNames[el]), curated: true }
    fromCurated++
  } else {
    missing.push(el)
  }
}

writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8")
// The radicals page renders the PDF table itself (214 entries, PDF order).
writeFileSync(path.join(root, "src/data/radicals.json"), JSON.stringify(pdfTable) + "\n", "utf8")
console.log(`Wrote ${Object.keys(result).length}/${components.size} radical names to ${path.relative(root, outPath)}`)
console.log(`  from bothu.pdf: ${fromPdf}`)
console.log(`  from anchor hanviet: ${fromAnchor}`)
console.log(`  from hand curation: ${fromCurated}`)
if (missing.length > 0) console.log(`  no name (UI shows bare char): ${missing.join(" ")}`)
