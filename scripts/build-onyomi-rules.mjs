// Builds src/data/onyomi-rules.json: how a kanji's Hán Việt syllable predicts
// its on'yomi. Hán Việt and on'yomi both descend from Middle Chinese, so the
// final consonant (and a few initials) map onto the Japanese reading with
// regular tendencies -- e.g. Hán Việt -c/-ch → -ku/-ki (学 Học ガク, 石 Thạch
// セキ), -ng/-nh → long vowel (明 Minh メイ, 東 Đông トウ).
// The rules are tendencies, not laws, so every rule here is *measured* against
// the app's own kanji (Hán Việt dictionary × on'yomi from kanji.json anchors /
// kanji-readings.json): the output carries the hit rate, real examples and
// real exceptions, and `kanjiRules` records, per character, which rules it
// obeys (so the UI never re-derives them). A rule that holds for fewer than
// MIN_RATE of its kanji is dropped rather than shipped as a "rule".
// Re-run after hanviet-dictionary.json / kanji-readings.json change.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const read = p => JSON.parse(readFileSync(path.join(root, p), "utf8"))

const MIN_RATE = 0.6
const hanviet = read("src/data/hanviet-dictionary.json")
const readings = read("src/data/kanji-readings.json")
const kanjivg = read("src/data/kanjivg.json")

// on'yomi per character: textbook anchors first, kanjiapi readings otherwise.
const on = {}
for (const lvl of ["n5", "n4"]) {
  for (const ch of read(`src/data/${lvl}/kanji.json`).chapters) {
    for (const g of ch.groups) if (g.onyomi?.length && !on[g.anchor]) on[g.anchor] = g.onyomi
  }
}
for (const [c, r] of Object.entries(readings)) if (!on[c] && r.on?.length) on[c] = r.on

const stripTone = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase()
const hv = c => hanviet[c] ? stripTone(hanviet[c]).split(/\s+/)[0] : null
const clean = r => r.replace(/[-.\s]/g, "")
const endsWith = (readingsList, re) => readingsList.some(r => re.test(clean(r)))
const startsWith = (readingsList, re) => readingsList.some(r => re.test(clean(r)))

// Each rule: `when(hv)` selects the kanji it talks about, `then(readings)` is
// the on'yomi pattern it predicts.
const RULES = [
  { id: "final-c", group: "final", vi: "-c / -ch", ja: "-ク / -キ", when: s => /(c|ch)$/.test(s), then: r => endsWith(r, /[クキ]$/) },
  { id: "final-t", group: "final", vi: "-t", ja: "-ツ / -チ", when: s => /t$/.test(s), then: r => endsWith(r, /[ツチ]$/) },
  { id: "final-nm", group: "final", vi: "-n / -m", ja: "-ン", when: s => /[nm]$/.test(s) && !/(ng|nh)$/.test(s), then: r => endsWith(r, /ン$/) },
  { id: "final-ng", group: "final", vi: "-ng / -nh", ja: "-ウ / -イ (âm kéo dài)", when: s => /(ng|nh)$/.test(s), then: r => endsWith(r, /[ウイ]$/) },
  { id: "final-p", group: "final", vi: "-p", ja: "-ウ / -ツ", when: s => /p$/.test(s), then: r => endsWith(r, /[ウツ]$/) },
  { id: "init-ng", group: "initial", vi: "ng- / ngh-", ja: "ガ行 (ga gi gu ge go)", when: s => /^ngh?/.test(s), then: r => startsWith(r, /^[ガギグゲゴ]/) },
  { id: "init-nh", group: "initial", vi: "nh-", ja: "ナ行 / ジ", when: s => /^nh/.test(s), then: r => startsWith(r, /^[ナニヌネノジ]/) },
  { id: "init-ph", group: "initial", vi: "ph-", ja: "ハ行 / パ行 / バ行", when: s => /^ph/.test(s), then: r => startsWith(r, /^[ハヒフヘホパピプペポバビブベボ]/) },
  { id: "init-kh", group: "initial", vi: "kh-", ja: "カ行", when: s => /^kh/.test(s), then: r => startsWith(r, /^[カキクケコ]/) },
]

const chars = Object.keys(kanjivg).filter(c => on[c] && hv(c))
const rules = []
const kanjiRules = {}
for (const rule of RULES) {
  const subjects = chars.filter(c => rule.when(hv(c)))
  const hits = subjects.filter(c => rule.then(on[c]))
  const rate = subjects.length ? hits.length / subjects.length : 0
  if (subjects.length < 8 || rate < MIN_RATE) {
    console.log(`drop ${rule.id}: ${hits.length}/${subjects.length} (${Math.round(rate * 100)}%)`)
    continue
  }
  const card = c => ({ kanji: c, hanviet: hanviet[c], on: on[c].slice(0, 3) })
  rules.push({
    id: rule.id, group: rule.group, vi: rule.vi, ja: rule.ja,
    total: subjects.length, matched: hits.length, rate: Math.round(rate * 100),
    examples: hits.slice(0, 8).map(card),
    exceptions: subjects.filter(c => !hits.includes(c)).slice(0, 5).map(card),
  })
  for (const c of hits) (kanjiRules[c] ??= []).push(rule.id)
  console.log(`keep ${rule.id}: ${hits.length}/${subjects.length} (${Math.round(rate * 100)}%)`)
}

writeFileSync(path.join(root, "src/data/onyomi-rules.json"), JSON.stringify({ rules, kanjiRules }) + "\n", "utf8")
console.log(`Wrote ${rules.length} rules, ${Object.keys(kanjiRules).length} kanji tagged`)
