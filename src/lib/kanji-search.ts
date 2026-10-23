import hanVietDictionary from "@/data/hanviet-dictionary.json"
import kanjiReadingsJson from "@/data/kanji-readings.json"
import { KANJI_INDEX, hanVietForChar, cleanReadings } from "@/lib/kanji"

interface ReadingsFallback { on: string[]; kun: string[]; meanings: { vi: string; en: string } }
const readings = kanjiReadingsJson as Record<string, ReadingsFallback>

export interface KanjiRecord {
  char: string
  hanviet?: string
  meaning: { vi: string; en: string }
  on: string[]
  kun: string[]
  // Pre-normalized search keys (built once).
  hvKey: string
  textKey: string
  kanaKey: string
}

const stripTone = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase()
const katakanaToHiragana = (s: string) => s.replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))
const CJK = /[一-鿿㐀-䶿]/

let records: KanjiRecord[] | null = null

export function kanjiRecords(): KanjiRecord[] {
  if (records) return records
  const chars = new Set<string>([...Object.keys(hanVietDictionary), ...Object.keys(readings), ...KANJI_INDEX.keys()])
  records = [...chars].map(char => {
    const detail = KANJI_INDEX.get(char)
    const fb = readings[char]
    const meaning = detail?.group.meaning ?? fb?.meanings ?? { vi: "", en: "" }
    const on = detail ? cleanReadings(detail.group.onyomi, Infinity).shown : fb ? cleanReadings(fb.on, Infinity).shown : []
    const kun = detail ? cleanReadings(detail.group.kunyomi, Infinity).shown : fb ? cleanReadings(fb.kun, Infinity).shown : []
    const hanviet = hanVietForChar(char)
    return {
      char, hanviet, meaning, on, kun,
      hvKey: hanviet ? stripTone(hanviet) : "",
      textKey: stripTone(`${meaning.vi} ${meaning.en}`),
      kanaKey: katakanaToHiragana([...on, ...kun].map(r => r.replace(/[.-]/g, "")).join(" ")),
    }
  })
  return records
}

/** Kanji typed directly → those kanji; otherwise Hán Việt (with or without
 *  tone marks), then readings (kana), then meaning text. */
export function searchKanji(query: string, limit = 60): KanjiRecord[] {
  const all = kanjiRecords()
  const q = query.trim()
  if (!q) return all.slice(0, limit)
  const typed = [...q].filter(c => CJK.test(c))
  if (typed.length > 0) {
    const byChar = new Map(all.map(r => [r.char, r]))
    return typed.map(c => byChar.get(c)).filter((r): r is KanjiRecord => r !== undefined)
  }
  const plain = stripTone(q)
  const kana = katakanaToHiragana(q)
  const toned = q.toLowerCase()
  const scored: Array<{ r: KanjiRecord; score: number }> = []
  for (const r of all) {
    let score = 0
    if (r.hanviet && r.hanviet.toLowerCase() === toned) score = 100
    else if (r.hvKey === plain) score = 90
    else if (r.hvKey.startsWith(plain)) score = 60
    else if (/[ぁ-ゖ]/.test(kana) && r.kanaKey.split(" ").some(k => k === kana || k.startsWith(kana))) score = 50
    else if (plain.length >= 2 && r.textKey.includes(plain)) score = 30
    if (score > 0) scored.push({ r, score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.r)
}
