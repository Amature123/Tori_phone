// One-off cleanup: removes em dashes (and the " -- " ASCII stand-in for one)
// from app content, and swaps the stiff Vietnamese word "sắc thái" for plain
// wording. Text-level (no JSON re-serialization) so file formatting is kept.
//   JSON / UI strings : " — " and " -- "  ->  ", "        lone "—" -> "-"
//   code comments     : " — " and " -- "  ->  " - "
//   Vietnamese terms  : "sắc thái" -> "cảm giác" (+ a few fixed labels)
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const TARGETS = ["src", "public", "README.md", "index.html", "handoff.md"]
const EXT = new Set([".json", ".ts", ".tsx", ".css", ".md", ".html", ".webmanifest"])

function* walk(p) {
  const st = statSync(p)
  if (st.isDirectory()) {
    for (const f of readdirSync(p)) yield* walk(path.join(p, f))
  } else if (EXT.has(path.extname(p))) yield p
}

const TERMS = [
  ["Cách dùng & Sắc thái", "Cách dùng từ"],
  ["Đồng nghĩa & Sắc thái", "Từ gần nghĩa"],
  ["Bẫy sắc thái", "Dễ hiểu sai ý"],
  ["bẫy sắc thái", "dễ hiểu sai ý"],
  ["Sắc thái cảm xúc", "Cảm xúc đi kèm"],
  ["sắc thái cảm xúc", "cảm xúc"],
  ["Sắc thái", "Cảm giác"],
  ["sắc thái", "cảm giác"],
]

let changedFiles = 0
let dashes = 0
for (const t of TARGETS) {
  const abs = path.join(root, t)
  for (const file of statSync(abs).isDirectory() ? walk(abs) : [abs]) {
    const rel = path.relative(root, file).replace(/\\/g, "/")
    // This script and the rule text it documents mention the characters on purpose.
    if (rel.startsWith("scripts/")) continue
    const original = readFileSync(file, "utf8")
    const eol = original.includes("\r\n") ? "\r\n" : "\n"
    const lines = original.split(/\r?\n/)
    const isCode = /\.(ts|tsx|css)$/.test(file)
    const out = lines.map(line => {
      const comment = isCode && /^\s*(\/\/|\/\*|\*|\{\/\*)/.test(line)
      let s = line
      const before = s
      if (comment) {
        s = s.replace(/ — /g, " - ").replace(/ -- /g, " - ")
      } else {
        s = s.replace(/ — /g, ", ").replace(/ -- /g, ", ")
      }
      s = s.replace(/['"`]—['"`]/g, m => m[0] + "-" + m[2]).replace(/—/g, "-")
      if (s !== before) dashes++
      if (!comment || !isCode) for (const [a, b] of TERMS) s = s.split(a).join(b)
      return s
    })
    const next = out.join(eol)
    if (next !== original) {
      writeFileSync(file, next, "utf8")
      changedFiles++
    }
  }
}
console.log(`edited ${changedFiles} files, ${dashes} lines had dashes`)
