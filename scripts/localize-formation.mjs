// Gives every grammar "formation rule" row (the Cách chia / Formation table in
// a grammar point's detail panel) a fully Vietnamese `formVi` and a fully
// English `formEn`. The original `form` strings mix both languages
// ("Plain form", "Masu-stem", "(đối tượng) + を + V (tha động từ)"), so each
// language was reading half-translated labels.
// Idempotent: re-running recomputes both fields from `form`.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

// English phrase -> Vietnamese. Longest phrases first (sorted below).
const EN_TO_VI = [
  ["Dictionary/nai/ta-form", "thể từ điển / ない / た"],
  ["Dictionary/nai-form (non-volitional)", "thể từ điển / ない (không ý chí)"],
  ["Dictionary/nai-form", "thể từ điển / ない"],
  ["Dictionary/nai/ta-form", "thể từ điển / ない / た"],
  ["Potential dictionary form / potential nai-form", "thể khả năng (từ điển / ない)"],
  ["Potential ta-form / potential nakatta-form", "thể khả năng (た / なかった)"],
  ["Same conjugation as the passive form", "Chia giống thể bị động"],
  ["Plain form (dictionary/ない/た)", "Thể thường (từ điển / ない / た)"],
  ["Plain form/quote", "Thể thường hoặc trích dẫn"],
  ["Past plain form", "Thể thường quá khứ"],
  ["Plain form", "Thể thường"],
  ["Dictionary form", "Thể từ điển"],
  ["Dictionary", "Thể từ điển"],
  ["Volitional form", "Thể ý chí"],
  ["Volitional", "Thể ý chí"],
  ["Masu-stem", "Vます bỏ ます"],
  ["Nai-stem", "Vない bỏ い"],
  ["Nai-form", "thể ない"],
  ["ない-form", "thể ない"],
  ["Te-form", "thể て"],
  ["て-form", "thể て"],
  ["Ta-form", "thể た"],
  ["た-form", "thể た"],
  ["ば-form", "thể ば"],
  ["V-te iru", "Vている"],
  ["causative te-form", "thể sai khiến thể て"],
  ["causative form", "thể sai khiến"],
  ["intransitive verb-causative", "động từ tự động (thể sai khiến)"],
  ["transitive verb-causative", "động từ tha (thể sai khiến)"],
  ["causative-passive verb", "động từ sai khiến bị động"],
  ["Group 1: う/つ/る→って, ぬ/ぶ/む→んで, く→いて, ぐ→いで, す→して", "Nhóm 1: う/つ/る→って, ぬ/ぶ/む→んで, く→いて, ぐ→いで, す→して"],
  ["Group 1: -u ending → -aseru (a-row + せる)", "Nhóm 1: đuôi -u → -aseru (hàng あ + せる)"],
  ["Group 2: drop -ru → -saseru", "Nhóm 2: bỏ -ru → -saseru"],
  ["Group 1: -u ending → -asareru", "Nhóm 1: đuôi -u → -asareru"],
  ["Group 2: drop -ru → -saserareru", "Nhóm 2: bỏ -ru → -saserareru"],
  ["Group 1: sound-change + た／だ", "Nhóm 1: biến đổi âm + た／だ"],
  ["Group 3: irregular", "Nhóm 3: bất quy tắc"],
  ["Group 1:", "Nhóm 1:"],
  ["Group 2:", "Nhóm 2:"],
  ["う-row → え-row", "hàng う → hàng え"],
  ["う-row → あ-row", "hàng う → hàng あ"],
  ["う-row → お-row", "hàng う → hàng お"],
  ["drop る", "bỏ る"],
  ["End of any sentence (plain or polite)", "Cuối câu bất kỳ (thể thường hoặc lịch sự)"],
  ["Bare noun (replaces は/が/を)", "Danh từ trơn (thay は/が/を)"],
  ["Bare noun (no だ)", "Danh từ (bỏ だ)"],
  ["Bare noun (drop だ)", "Danh từ (bỏ だ)"],
  ["Bare noun", "Danh từ trơn"],
  ["Bare stem", "Tính từ な bỏ だ"],
  ["Stem (no だ)", "Tính từ な (bỏ だ)"],
  ["Stem (drop だ)", "Tính từ な (bỏ だ)"],
  ["Clause1 (polite/plain)", "Mệnh đề 1 (lịch sự / thường)"],
  ["Clause1 (plain or polite)", "Mệnh đề 1 (thường hoặc lịch sự)"],
  ["Clause1 (reason, plain/polite)", "Mệnh đề 1 (lý do, thường / lịch sự)"],
  ["Clause1 (plain)", "Mệnh đề 1 (thể thường)"],
  ["Clause2 (result)", "Mệnh đề 2 (kết quả)"],
  ["Clause1", "Mệnh đề 1"],
  ["Clause2", "Mệnh đề 2"],
  ["Question word", "Từ để hỏi"],
  ["question word", "từ để hỏi"],
  ["second adjective", "tính từ thứ hai"],
  ["rising intonation (no か)", "lên giọng (không có か)"],
  ["rising intonation (invitation)", "lên giọng (lời mời)"],
  ["rising intonation", "lên giọng"],
  ["falling intonation", "xuống giọng"],
  ["statement, falling intonation", "câu khẳng định, xuống giọng"],
  ["(past negative, plain, any tense)", "(phủ định quá khứ, thể thường, mọi thì)"],
  ["(past negative, plain)", "(phủ định quá khứ, thể thường)"],
  ["(past negative)", "(phủ định quá khứ)"],
  ["(past, plain)", "(quá khứ, thể thường)"],
  ["(past)", "(quá khứ)"],
  ["(present/future negative)", "(phủ định hiện tại/tương lai)"],
  ["(present/future)", "(hiện tại/tương lai)"],
  ["(affirmative/negative)", "(khẳng định/phủ định)"],
  ["(any tense)", "(mọi thì)"],
  ["(non-volitional)", "(không ý chí)"],
  ["(inanimate object)", "(đồ vật)"],
  ["(person/animal)", "(người/động vật)"],
  ["(inviting)", "(rủ rê)"],
  ["(suggesting)", "(đề nghị)"],
  ["(linking)", "(nối câu)"],
  ["(polite/plain)", "(lịch sự / thường)"],
  ["(plain or polite)", "(thường hoặc lịch sự)"],
  ["(plain/polite)", "(thường / lịch sự)"],
  ["(nominalizing)", "(danh từ hóa)"],
  ["(casual)", "(văn nói)"],
  ["(causee)", "(người bị sai khiến)"],
  ["(object)", "(tân ngữ)"],
  ["(subject, forced)", "(chủ thể bị ép)"],
  ["(forcer)", "(người ép)"],
  ["(statement, falling intonation)", "(câu khẳng định, xuống giọng)"],
  ["(in progress)", "(đang diễn ra)"],
  ["(just finished)", "(vừa xong)"],
  ["(round trip: go, do, return)", "(đi làm rồi quay lại)"],
  ["(away from speaker/viewpoint)", "(đi ra xa người nói)"],
  ["(toward speaker/viewpoint)", "(tiến lại gần người nói)"],
  ["(change up to now)", "(thay đổi cho đến nay)"],
  ["(change from now on)", "(thay đổi từ nay về sau)"],
  ["(with もう/全部)", "(đi với もう/全部)"],
  ["(contraction)", "(dạng rút gọn)"],
  ["(received permission)", "(được cho phép)"],
  ["(receiving permission)", "(được cho phép)"],
  ["(desire to let someone do)", "(muốn cho ai làm)"],
  ["(native verb)", "(động từ thuần Nhật)"],
  ["(polite です)", "(です lịch sự)"],
  ["(polite あります)", "(あります lịch sự)"],
  ["(repeated)", "(lặp lại)"],
  ["Contraction", "dạng rút gọn"],
  ["Te-form contraction", "dạng rút gọn của thể て"],
  ["followed by a past-tense discovery", "theo sau là điều phát hiện ở quá khứ"],
  ["Sino-Japanese noun", "danh từ Hán Nhật"],
  ["native verb", "động từ thuần Nhật"],
  ["desire to let someone do", "muốn cho ai làm"],
  ["receiving permission", "được cho phép"],
  ["(direct)", "(trực tiếp)"],
  ["(thay thế)", "(thay thế)"],
  ["causee", "người bị sai khiến"],
  ["forcer", "người ép"],
  ["transitive verb", "động từ tha"],
  ["intransitive verb", "động từ tự động"],
  ["adjective", "tính từ"],
  ["Dictionary form (plain form of ます)", "Thể từ điển (thể thường của ます)"],
  ["plain-form clause", "mệnh đề thể thường"],
  ["plain form of ます", "thể thường của ます"],
  ["masu-stem", "Vます bỏ ます"],
  ["na-adjective", "tính từ な"],
  ["potential form", "thể khả năng"],
  ["ば-clause", "mệnh đề ば"],
  ["final verb", "động từ cuối"],
  ["(+ implied だめ／いけない)", "(+ ngầm hiểu だめ／いけない)"],
  ["(drop い)", "(bỏ い)"],
  ["(plain)", "(thể thường)"],
  ["(in progress)", "(đang diễn ra)"],
  ["Stem", "Tính từ"], // refined by pos below
]

// Vietnamese phrase -> English, for the rows that already carried Vietnamese.
const VI_TO_EN = [
  ["(khoảng thời gian, không に)", "(time span, no に)"],
  ["(khoảng thời gian)", "(time span)"],
  ["(thời gian/địa điểm)", "(time/place)"],
  ["(đối tượng)", "(object)"],
  ["(tiền/thời gian)", "(money/time)"],
  ["(số tiền/thời gian)", "(amount of money/time)"],
  ["(nội dung trích dẫn)", "(quoted content)"],
  ["(âm thanh/mùi/vị/cảm giác)", "(sound/smell/taste/feeling)"],
  ["(tha động từ)", "(transitive verb)"],
  ["(khả năng)", "(potential)"],
  ["tần suất/số lượng", "frequency/amount"],
  ["tha động từ", "transitive verb"],
  ["(thay を/が)", "(replaces を/が)"],
  ["(thay は)", "(replaces は)"],
  ["(thay thế)", "(instead of)"],
  ["(bỏ い)", "(drop い)"],
  ["(với を)", "(with を)"],
  ["(hỏi về tình huống của người nghe)", "(asking about the listener's situation)"],
  ["（hỏi về chủ đề đang nói đến）", "(asking about the topic at hand)"],
  ["(đang xảy ra ngay trước mắt)", "(happening right now)"],
  ["(thói quen lặp lại)", "(repeated habit)"],
  ["(kết quả của một sự thay đổi)", "(result of a change)"],
  ["(hành động kéo dài liên tục)", "(continuous action)"],
  ["(bên trong mệnh đề bổ nghĩa)", "(inside a modifying clause)"],
  ["Mệnh đề bổ nghĩa", "Modifying clause"],
  ["trong một câu phức lớn hơn", "inside a larger complex sentence"],
  ["nội dung trích dẫn", "quoted content"],
  ["(người/vật sống)", "(person/living thing)"],
  ["(người/vật)", "(person/thing)"],
  ["(chủ ngữ được nhấn mạnh)", "(emphasised subject)"],
  ["(hỏi về tình huống trước mắt)", "(asking about the situation at hand)"],
  ["（hỏi về tình huống trước mắt）", "(asking about the situation at hand)"],
  ["Trích dẫn (thể mệnh lệnh/cấm đoán/thường/N)", "Quotation (imperative/prohibition/plain/N)"],
  ["Kết hợp と言う／書いてある／読む／という意味 với mọi thể trích dẫn", "Combines with と言う／書いてある／読む／という意味 for any quotation form"],
  ["B（đối tượng bị tác động）", "B (affected party)"],
  ["A（chủ thể tác động）", "A (agent)"],
  ["B（người bị ảnh hưởng）", "B (affected person)"],
  ["A（chủ thể）", "A (agent)"],
  ["N（vật/khái niệm）", "N (thing/concept)"],
  ["（Aによって）", "(by A)"],
  ["Mệnh đề (thể thường)", "Clause (plain form)"],
  ["(địa điểm)", "(place)"],
  ["(vật)", "(thing)"],
  ["(giờ)", "(time)"],
  ["(người)", "(person)"],
  ["(số lượng)", "(quantity)"],
  ["(phương tiện)", "(means)"],
  ["(chủ thể)", "(subject)"],
  ["(phủ định)", "(negative)"],
  ["(so sánh)", "(comparison)"],
  ["N/số từ", "N/number"],
  ["vị ngữ", "predicate"],
  ["tự động từ", "intransitive verb"],
  ["thể bị động", "passive form"],
  ["Mệnh đề", "Clause"],
]

const sorted = list => [...list].sort((a, b) => b[0].length - a[0].length)
const EN_VI = sorted(EN_TO_VI)
const VI_EN = sorted(VI_TO_EN)

function toVi(form, pos) {
  let out = form
  // "Stem" means different things by part of speech.
  const stem = pos === "i-adj" ? "Tính từ い bỏ い" : "Tính từ な"
  for (const [en, vi] of EN_VI) out = out.split(en).join(en === "Stem" ? stem : vi)
  out = out.replace(/\s{2,}/g, " ").trim()
  return out.charAt(0).toLocaleUpperCase("vi") + out.slice(1)
}

function toEn(form, pos) {
  let out = form
  for (const [vi, en] of VI_EN) out = out.split(vi).join(en)
  const stem = pos === "i-adj" ? "i-adjective (drop い)" : "na-adjective stem"
  out = out.replace(/\bStem\b/g, stem)
  out = out.replace(/\bMasu-stem\b/g, "Masu-stem (V without ます)").replace(/\bNai-stem\b/g, "Nai-stem (V without い)")
  return out
}

const ENGLISH = /(form|stem|plain|dictionary|group|clause|noun|adjective|verb|causative|causee|object|subject|polite|casual|irregular|intonation|drop|row|ending|linking|past|negative|present|future|question|word|bare|potential|volitional|passive|native|sino|japanese|change|speaker|viewpoint|round|trip|progress|finished|contraction|nominalizing|statement|replaces|inviting|suggesting|affirmative|tense|forced|forcer|desire|receiving|permission|discovery|followed|repeated|implied|final|masu|nai)/gi
const leftoverLatin = s => s.match(ENGLISH) ?? []
const leftoverViet = s => /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i.test(s)

let rows = 0
const badVi = new Set(), badEn = new Set()
for (const lvl of ["n5", "n4"]) {
  const file = path.join(root, `src/data/${lvl}/grammar.json`)
  const data = JSON.parse(readFileSync(file, "utf8"))
  for (const point of data) {
    for (const rule of point.formationRules ?? []) {
      rule.formVi = toVi(rule.form, rule.pos)
      rule.formEn = toEn(rule.form, rule.pos)
      rows++
      if (leftoverLatin(rule.formVi).length) badVi.add(`${rule.form}  =>  ${rule.formVi}`)
      if (leftoverViet(rule.formEn)) badEn.add(`${rule.form}  =>  ${rule.formEn}`)
    }
  }
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8")
}
console.log(`localized ${rows} formation rows`)
console.log(`VI rows still containing English words: ${badVi.size}`)
for (const s of badVi) console.log("  " + s)
console.log(`EN rows still containing Vietnamese: ${badEn.size}`)
for (const s of badEn) console.log("  " + s)
