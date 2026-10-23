// Verb group classification and basic conjugation for the Verb Forms page's
// "which group is this verb?" checker.
//
// Order of trust: (1) an exact hit in verb-index.json (every N5/N4 verb the
// app teaches) or in the curated trap lists, (2) rules on the kana. The rules
// are reliable except for the dictionary forms ending in -iru / -eru, which
// is exactly where the curated godan-exception list decides.
import verbIndexJson from "@/data/verb-index.json"
import { GODAN_LOOKING_ICHIDAN, ICHIDAN_LOOKING_GODAN } from "@/data/verb-traps"

export type VerbGroupId = 1 | 2 | 3
export interface Bilingual { vi: string; en: string }

interface IndexedVerb { k: string; y: string; g: VerbGroupId; m: Bilingual }
const INDEX = verbIndexJson as IndexedVerb[]

interface Entry { group: VerbGroupId; kanji: string; kana: string; meaning?: Bilingual }
const KNOWN = new Map<string, Entry[]>()
function addKnown(key: string, value: Entry) {
  const list = KNOWN.get(key) ?? []
  // The same verb arrives from several sources; keep one copy per kanji+kana.
  if (!list.some(e => e.kanji === value.kanji && e.kana === value.kana)) list.push(value)
  KNOWN.set(key, list)
}
function addVerb(e: Entry) {
  addKnown(e.kanji, e)
  addKnown(e.kana, e)
}
for (const v of INDEX) addVerb({ group: v.g, kanji: v.k, kana: v.y, meaning: v.m })
for (const v of GODAN_LOOKING_ICHIDAN) addVerb({ group: 1, kanji: v.kanji, kana: v.kana, meaning: v.meaning })
for (const v of ICHIDAN_LOOKING_GODAN) addVerb({ group: 2, kanji: v.kanji, kana: v.kana, meaning: v.meaning })

// Hiragana rows.
const A_ROW = "あかがさざただなはばぱまやらわ"
const I_ROW = "いきぎしじちぢにひびぴみり"
const E_ROW = "えけげせぜてでねへべぺめれ"
const O_ROW = "おこごそぞとどのほぼぽもよろを"
const U_ROW = "うくぐすつぬぶむる"
const U_TO_I: Record<string, string> = { う: "い", く: "き", ぐ: "ぎ", す: "し", つ: "ち", ぬ: "に", ぶ: "び", む: "み", る: "り" }
const I_TO_U: Record<string, string> = Object.fromEntries(Object.entries(U_TO_I).map(([u, i]) => [i, u]))

export const isKana = (ch: string | undefined) => !!ch && /[ぁ-ゖー]/.test(ch)

export interface CheckResult {
  status: "known" | "rule" | "ambiguous" | "unknown"
  group?: VerbGroupId
  /** Dictionary form to conjugate (kanji if the input had kanji). */
  dict?: string
  /** Why this group, in both languages. */
  reason: Bilingual
  meaning?: Bilingual
  /** For ambiguous ます input: the two dictionary forms it could be. */
  candidates?: { group: VerbGroupId; dict: string; meaning?: Bilingual }[]
}

const normalize = (s: string) => s.replace(/[～〜\s]/g, "").replace(/[ァ-ヶ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60))

function ruleForDictionary(dict: string): CheckResult {
  if (dict.endsWith("する") || dict === "くる" || dict.endsWith("来る")) {
    return { status: "rule", group: 3, dict, reason: { vi: "する hoặc 来る: nhóm 3 (bất quy tắc).", en: "する or 来る: group 3 (irregular)." } }
  }
  const last = dict.slice(-1)
  if (last !== "る" && U_ROW.includes(last)) {
    return { status: "rule", group: 1, dict, reason: { vi: `Đuôi 「${last}」 (không phải る): luôn là nhóm 1.`, en: `Ends in 「${last}」 (not る): always group 1.` } }
  }
  if (last === "る") {
    const before = dict.slice(-2, -1)
    if (isKana(before)) {
      if (A_ROW.includes(before) || "うくぐすつぬぶむる".includes(before) || O_ROW.includes(before)) {
        return { status: "rule", group: 1, dict, reason: { vi: `Trước る là 「${before}」 (hàng あ / う / お): nhóm 1.`, en: `The sound before る is 「${before}」 (a / u / o row): group 1.` } }
      }
      if (I_ROW.includes(before) || E_ROW.includes(before)) {
        return { status: "rule", group: 2, dict, reason: { vi: `Trước る là 「${before}」 (hàng い / え) và không nằm trong danh sách ngoại lệ: nhóm 2.`, en: `The sound before る is 「${before}」 (i / e row) and it is not on the exception list: group 2.` } }
      }
    }
    return { status: "unknown", dict, reason: { vi: "Có chữ Hán ngay trước る nên không đoán được hàng âm. Hãy gõ bằng kana (ví dụ みる).", en: "A kanji sits right before る, so the vowel row is unknown. Try typing it in kana (e.g. みる)." } }
  }
  return { status: "unknown", dict, reason: { vi: "Không nhận ra đây là dạng từ điển của một động từ.", en: "This does not look like a verb dictionary form." } }
}

const KANJI = /[一-鿿]/

function fromEntries(entries: Entry[], input: string): CheckResult {
  const groups = new Set(entries.map(e => e.group))
  if (groups.size === 1) {
    const e = entries[0]
    return {
      status: "known", group: e.group, dict: KANJI.test(input) ? e.kanji : e.kana, meaning: e.meaning,
      reason: { vi: `Từ này có trong danh sách động từ của app: nhóm ${e.group}.`, en: `This verb is in the app's verb list: group ${e.group}.` },
    }
  }
  // Same reading, different verbs, different groups (きる = 着る / 切る ...).
  return {
    status: "ambiguous",
    reason: {
      vi: "Cùng cách đọc nhưng là các động từ khác nhau, thuộc nhóm khác nhau. Phải biết chữ Hán / nghĩa để chọn đúng.",
      en: "Same reading, but different verbs in different groups. You need the kanji / meaning to choose.",
    },
    candidates: entries.map(e => ({ group: e.group, dict: e.kanji, meaning: e.meaning })),
  }
}

export function checkVerb(raw: string): CheckResult | null {
  const input = normalize(raw)
  if (!input) return null

  const direct = KNOWN.get(input)
  if (direct) return fromEntries(direct, input)

  if (input.endsWith("ます")) {
    const stem = input.slice(0, -2)
    if (stem === "来" || stem === "き") {
      return { status: "known", group: 3, dict: stem === "来" ? "来る" : "くる", reason: { vi: "来ます / きます: nhóm 3.", en: "来ます / きます: group 3." } }
    }
    const last = stem.slice(-1)
    const lastTwo = stem.slice(-2)

    // 〜します: a する verb (group 3) or a verb ending in す (group 1).
    if (last === "し") {
      const suru = KNOWN.get(stem.slice(0, -1) + "する")
      const su = KNOWN.get(stem.slice(0, -1) + "す")
      if (suru || su) return fromEntries([...(suru ?? []), ...(su ?? [])], input)
      if (/^[一-鿿]{2,}し$/.test(lastTwo.length === 2 ? stem.match(/[一-鿿]+し$/)?.[0] ?? "" : "")) {
        return { status: "rule", group: 3, dict: stem.slice(0, -1) + "する", reason: { vi: "Từ ghép chữ Hán + します (như 勉強します): động từ する, nhóm 3.", en: "Kanji compound + します (like 勉強します): a する verb, group 3." } }
      }
      return {
        status: "ambiguous",
        reason: { vi: "〜します có thể là động từ する (nhóm 3, như 勉強します) hoặc động từ đuôi す (nhóm 1, như 話します). Hãy gõ dạng từ điển.", en: "〜します can be a する verb (group 3, like 勉強します) or a verb ending in す (group 1, like 話します). Type the dictionary form instead." },
        candidates: [{ group: 3, dict: stem.slice(0, -1) + "する" }, { group: 1, dict: stem.slice(0, -1) + "す" }],
      }
    }

    if (E_ROW.includes(last)) {
      return { status: "rule", group: 2, dict: stem + "る", reason: { vi: `Trước ます là 「${last}」 (hàng え): chắc chắn nhóm 2, vì không có động từ nhóm 1 nào cho ra 〜えます.`, en: `The sound before ます is 「${last}」 (e row): definitely group 2, because no group 1 verb gives a 〜えます form.` } }
    }
    if (I_ROW.includes(last)) {
      const g1 = stem.slice(0, -1) + I_TO_U[last]
      const g2 = stem + "る"
      const found = [...(KNOWN.get(g1) ?? []), ...(KNOWN.get(g2) ?? [])]
      const asMasu = found.filter(e => (e.group === 1 && (e.kana === g1 || e.kanji === g1)) || (e.group === 2 && (e.kana === g2 || e.kanji === g2)))
      if (asMasu.length > 0) {
        const res = fromEntries(asMasu, input)
        if (res.status === "known") return res
        return { ...res, reason: { vi: "Cùng viết ます nhưng có thể là nhóm 1 hoặc nhóm 2. Hãy xem nghĩa và dạng từ điển bên dưới.", en: "The same ます spelling can be group 1 or group 2. Check the meaning and dictionary form below." } }
      }
      return {
        status: "ambiguous",
        reason: {
          vi: `〜${last}ます (hàng い) có thể là nhóm 1 (${g1}) hoặc nhóm 2 (${g2}). Chỉ nhìn ます thì không phân biệt được: hãy nhớ dạng từ điển.`,
          en: `〜${last}ます (i row) can be group 1 (${g1}) or group 2 (${g2}). The ます form alone cannot tell you: you have to know the dictionary form.`,
        },
        candidates: [{ group: 1, dict: g1 }, { group: 2, dict: g2 }],
      }
    }
    return { status: "unknown", reason: { vi: "Không nhận ra dạng ます này.", en: "Could not read this ます form." } }
  }

  return ruleForDictionary(input)
}

export interface Conjugation { masu: string; nai: string; te: string; ta: string; ba: string; volitional: string; potential: string }

const TE_TA: Record<string, [string, string]> = {
  う: ["って", "った"], つ: ["って", "った"], る: ["って", "った"],
  む: ["んで", "んだ"], ぶ: ["んで", "んだ"], ぬ: ["んで", "んだ"],
  く: ["いて", "いた"], ぐ: ["いで", "いだ"], す: ["して", "した"],
}
const U_TO_A: Record<string, string> = { う: "わ", く: "か", ぐ: "が", す: "さ", つ: "た", ぬ: "な", ぶ: "ば", む: "ま", る: "ら" }
const U_TO_E: Record<string, string> = { う: "え", く: "け", ぐ: "げ", す: "せ", つ: "て", ぬ: "ね", ぶ: "べ", む: "め", る: "れ" }
const U_TO_O: Record<string, string> = { う: "お", く: "こ", ぐ: "ご", す: "そ", つ: "と", ぬ: "の", ぶ: "ぼ", む: "も", る: "ろ" }

export function conjugate(dict: string, group: VerbGroupId): Conjugation | null {
  if (group === 3) {
    if (dict.endsWith("する")) {
      const s = dict.slice(0, -2)
      return { masu: s + "します", nai: s + "しない", te: s + "して", ta: s + "した", ba: s + "すれば", volitional: s + "しよう", potential: s + "できる" }
    }
    if (dict.endsWith("来る")) {
      const s = dict.slice(0, -2)
      return { masu: s + "来ます", nai: s + "来ない", te: s + "来て", ta: s + "来た", ba: s + "来れば", volitional: s + "来よう", potential: s + "来られる" }
    }
    if (dict.endsWith("くる")) {
      const s = dict.slice(0, -2)
      return { masu: s + "きます", nai: s + "こない", te: s + "きて", ta: s + "きた", ba: s + "くれば", volitional: s + "こよう", potential: s + "こられる" }
    }
    return null
  }
  const last = dict.slice(-1)
  if (group === 2) {
    if (last !== "る") return null
    const s = dict.slice(0, -1)
    return { masu: s + "ます", nai: s + "ない", te: s + "て", ta: s + "た", ba: s + "れば", volitional: s + "よう", potential: s + "られる" }
  }
  if (!U_ROW.includes(last)) return null
  const s = dict.slice(0, -1)
  let [te, ta] = TE_TA[last]
  // 行く is the one godan く verb whose て / た forms are 行って / 行った.
  if (/(行く|いく)$/.test(dict) && !/ゆく$/.test(dict)) { te = "って"; ta = "った" }
  const nai = dict === "ある" || dict === "有る" ? "ない" : s + U_TO_A[last] + "ない"
  return {
    masu: s + U_TO_I[last] + "ます",
    nai, te: s + te, ta: s + ta,
    ba: s + U_TO_E[last] + "ば",
    volitional: s + U_TO_O[last] + "う",
    potential: s + U_TO_E[last] + "る",
  }
}
