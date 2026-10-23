// Fills the kanji gaps opened by the Minna vocabulary import:
//  - hanviet-dictionary.json: Han-Viet for new kanji (hanviet-from-saroma.json,
//    taken from the 2136-Jouyou table in scripts/saroma-map.json, plus a few hand-supplied)
//  - kanji-readings.json: Vietnamese glosses (kanji-vi.json) for entries whose
//    meanings.vi still equals the English fallback
// Additive and idempotent.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const data = path.join(here, "../../src/data")
const read = p => JSON.parse(fs.readFileSync(p, "utf8"))
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

// Not in the Jouyou table (kokuji / hyogai); standard Sino-Vietnamese readings.
const HAND = { "祇": "Kỳ", "幌": "Hoảng", "葛": "Cát", "噛": "Niết", "牡": "Mẫu" }

const hvPath = path.join(data, "hanviet-dictionary.json")
const hv = read(hvPath)
let hvAdded = 0
const extra = path.join(here, "hanviet-extra.json")
const fromFiles = { ...read(path.join(here, "hanviet-from-saroma.json")), ...(fs.existsSync(extra) ? read(extra) : {}) }
for (const [c, v] of Object.entries({ ...fromFiles, ...HAND })) {
  if (hv[c]) continue
  hv[c] = cap(v)
  hvAdded++
}
fs.writeFileSync(hvPath, JSON.stringify(hv, null, 2) + "\n")

const rdPath = path.join(data, "kanji-readings.json")
const rd = read(rdPath)
const viPath = path.join(here, "kanji-vi.json")
let viSet = 0
if (fs.existsSync(viPath)) {
  for (const [c, vi] of Object.entries(read(viPath))) {
    if (rd[c] && rd[c].meanings.vi === rd[c].meanings.en && vi) { rd[c].meanings.vi = vi; viSet++ }
  }
  fs.writeFileSync(rdPath, JSON.stringify(rd, null, 2) + "\n")
}
console.log({ hvAdded, viSet, hanviet: Object.keys(hv).length, readings: Object.keys(rd).length })
