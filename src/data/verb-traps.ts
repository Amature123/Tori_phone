// Curated verb lists for the "easy to confuse" section of the Verb Forms page
// and for the group checker's fallback rules. Verified against several
// learner references (see the final notes in handoff.md); every entry here is
// a real, common-or-classic example, not exhaustive.
export interface TrapVerb {
  kanji: string
  kana: string
  meaning: { vi: string; en: string }
  /** Less common words are tucked behind a "show more". */
  rare?: boolean
}

// Dictionary form ends in -iru / -eru, so it LOOKS like group 2, but it is
// group 1 (godan): the ます form is る → り + ます, not "drop る".
export const GODAN_LOOKING_ICHIDAN: TrapVerb[] = [
  { kanji: "帰る", kana: "かえる", meaning: { vi: "về", en: "to return home" } },
  { kanji: "入る", kana: "はいる", meaning: { vi: "vào", en: "to enter" } },
  { kanji: "走る", kana: "はしる", meaning: { vi: "chạy", en: "to run" } },
  { kanji: "知る", kana: "しる", meaning: { vi: "biết", en: "to know" } },
  { kanji: "切る", kana: "きる", meaning: { vi: "cắt", en: "to cut" } },
  { kanji: "要る", kana: "いる", meaning: { vi: "cần", en: "to need" } },
  { kanji: "減る", kana: "へる", meaning: { vi: "giảm", en: "to decrease" } },
  { kanji: "限る", kana: "かぎる", meaning: { vi: "giới hạn", en: "to limit" } },
  { kanji: "参る", kana: "まいる", meaning: { vi: "đến, đi (khiêm nhường)", en: "to go / come (humble)" } },
  { kanji: "散る", kana: "ちる", meaning: { vi: "rơi, tàn", en: "to fall (petals)" } },
  { kanji: "握る", kana: "にぎる", meaning: { vi: "nắm", en: "to grip" } },
  { kanji: "蹴る", kana: "ける", meaning: { vi: "đá", en: "to kick" } },
  { kanji: "喋る", kana: "しゃべる", meaning: { vi: "nói chuyện, tán gẫu", en: "to chat" } },
  { kanji: "滑る", kana: "すべる", meaning: { vi: "trượt", en: "to slip, slide" } },
  { kanji: "焦る", kana: "あせる", meaning: { vi: "sốt ruột, cuống", en: "to be impatient" } },
  { kanji: "練る", kana: "ねる", meaning: { vi: "nhào, luyện, trau chuốt", en: "to knead, refine" }, rare: true },
  { kanji: "照る", kana: "てる", meaning: { vi: "chiếu sáng (nắng)", en: "to shine" }, rare: true },
  { kanji: "湿る", kana: "しめる", meaning: { vi: "ẩm", en: "to be damp" }, rare: true },
  { kanji: "茂る", kana: "しげる", meaning: { vi: "mọc rậm", en: "to grow thick" }, rare: true },
  { kanji: "返る", kana: "かえる", meaning: { vi: "trở lại, được trả lại", en: "to return (come back)" }, rare: true },
  { kanji: "遮る", kana: "さえぎる", meaning: { vi: "chắn, ngắt lời", en: "to block, interrupt" }, rare: true },
  { kanji: "陥る", kana: "おちいる", meaning: { vi: "rơi vào (tình huống xấu)", en: "to fall into" }, rare: true },
  { kanji: "蘇る", kana: "よみがえる", meaning: { vi: "sống lại, hồi sinh", en: "to revive" }, rare: true },
  { kanji: "翻る", kana: "ひるがえる", meaning: { vi: "tung bay, đổi ý", en: "to flutter" }, rare: true },
  { kanji: "覆る", kana: "くつがえる", meaning: { vi: "bị lật ngược", en: "to be overturned" }, rare: true },
]

// Group 2 (ichidan) whose ます stem ends in an い-row sound, so 〜ます looks
// exactly like a group 1 verb (行きます, 書きます). Only the dictionary form
// (or knowing the verb) tells them apart.
export const ICHIDAN_LOOKING_GODAN: TrapVerb[] = [
  { kanji: "見る", kana: "みる", meaning: { vi: "xem, nhìn", en: "to see, watch" } },
  { kanji: "着る", kana: "きる", meaning: { vi: "mặc", en: "to wear" } },
  { kanji: "起きる", kana: "おきる", meaning: { vi: "thức dậy", en: "to wake up" } },
  { kanji: "借りる", kana: "かりる", meaning: { vi: "mượn", en: "to borrow" } },
  { kanji: "降りる", kana: "おりる", meaning: { vi: "xuống (xe, núi)", en: "to get off" } },
  { kanji: "浴びる", kana: "あびる", meaning: { vi: "tắm (vòi sen)", en: "to bathe in" } },
  { kanji: "足りる", kana: "たりる", meaning: { vi: "đủ", en: "to be enough" } },
  { kanji: "できる", kana: "できる", meaning: { vi: "có thể, làm được", en: "to be able" } },
  { kanji: "いる", kana: "いる", meaning: { vi: "có, ở (người, vật sống)", en: "to exist (animate)" } },
  { kanji: "生きる", kana: "いきる", meaning: { vi: "sống", en: "to live" } },
  { kanji: "落ちる", kana: "おちる", meaning: { vi: "rơi, trượt (thi)", en: "to fall" } },
  { kanji: "過ぎる", kana: "すぎる", meaning: { vi: "quá, trôi qua", en: "to pass, exceed" } },
  { kanji: "信じる", kana: "しんじる", meaning: { vi: "tin", en: "to believe" } },
  { kanji: "閉じる", kana: "とじる", meaning: { vi: "đóng, nhắm", en: "to close" } },
  { kanji: "感じる", kana: "かんじる", meaning: { vi: "cảm thấy", en: "to feel" } },
  { kanji: "似る", kana: "にる", meaning: { vi: "giống", en: "to resemble" } },
  { kanji: "煮る", kana: "にる", meaning: { vi: "nấu, hầm", en: "to simmer" } },
  { kanji: "飽きる", kana: "あきる", meaning: { vi: "chán", en: "to get tired of" }, rare: true },
  { kanji: "尽きる", kana: "つきる", meaning: { vi: "cạn, hết", en: "to run out" }, rare: true },
  { kanji: "恥じる", kana: "はじる", meaning: { vi: "xấu hổ", en: "to be ashamed" }, rare: true },
  { kanji: "用いる", kana: "もちいる", meaning: { vi: "dùng (văn viết)", en: "to use (formal)" }, rare: true },
]

// Same reading, different group: the pair that trips people up most.
export interface ConfusingPair {
  kana: string
  ichidan: { kanji: string; meaning: { vi: string; en: string } }
  godan: { kanji: string; meaning: { vi: string; en: string } }
}
export const CONFUSING_PAIRS: ConfusingPair[] = [
  { kana: "きる", ichidan: { kanji: "着る", meaning: { vi: "mặc", en: "to wear" } }, godan: { kanji: "切る", meaning: { vi: "cắt", en: "to cut" } } },
  { kana: "いる", ichidan: { kanji: "居る", meaning: { vi: "có, ở (người)", en: "to be (animate)" } }, godan: { kanji: "要る", meaning: { vi: "cần", en: "to need" } } },
  { kana: "かえる", ichidan: { kanji: "変える", meaning: { vi: "thay đổi (tha động từ)", en: "to change (something)" } }, godan: { kanji: "帰る", meaning: { vi: "về nhà", en: "to go home" } } },
  { kana: "へる", ichidan: { kanji: "経る", meaning: { vi: "trải qua", en: "to pass through" } }, godan: { kanji: "減る", meaning: { vi: "giảm", en: "to decrease" } } },
  { kana: "ねる", ichidan: { kanji: "寝る", meaning: { vi: "ngủ", en: "to sleep" } }, godan: { kanji: "練る", meaning: { vi: "nhào, luyện", en: "to knead, refine" } } },
]
