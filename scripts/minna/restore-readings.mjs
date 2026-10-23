// build-kanji-readings.mjs rebuilds from scratch and drops entries that earlier
// passes had added by hand (e.g. kanji that are also anchors). Merge the
// previous file back in (previous entries win) and export the characters that
// still need a Vietnamese gloss + Han-Viet.
import fs from "node:fs"
import { execSync } from "node:child_process"
const cur = JSON.parse(fs.readFileSync("src/data/kanji-readings.json", "utf8"))
const old = JSON.parse(execSync("git show HEAD:src/data/kanji-readings.json", { maxBuffer: 1e8 }).toString().replace(/^\uFEFF/, ""))
const merged = { ...old, ...cur, ...old }
fs.writeFileSync("src/data/kanji-readings.json", JSON.stringify(merged, null, 2) + "\n")
const needVi = Object.entries(merged).filter(([k, v]) => !(k in old) && v.meanings.vi === v.meanings.en).map(([k, v]) => ({ char: k, en: v.meanings.en, on: v.on, kun: v.kun }))
console.log({ merged: Object.keys(merged).length, needVi: needVi.length })
fs.writeFileSync("scripts/minna/need-vi.json", JSON.stringify(needVi))
