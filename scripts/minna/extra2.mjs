// Hand-supplied Vietnamese glosses + Han-Viet for kanji that only occur in example sentences.
import fs from "node:fs"
const vi = { "鉛": "chì", "掲": "treo, đăng, nêu lên", "虹": "cầu vồng", "扇": "quạt", "巾": "khăn, vải", "坂": "dốc, con dốc", "穴": "lỗ, hang", "鹿": "hươu, nai", "卵": "trứng", "幌": "mui, tấm che", "己": "bản thân", "鶴": "con hạc", "焦": "cháy, sốt ruột", "鍋": "nồi", "肌": "da, làn da", "環": "vòng, vòng tròn", "期": "thời kỳ, kỳ hạn", "携": "mang theo, cầm tay", "帯": "dây đai, vùng", "溺": "chết đuối, đắm chìm", "挨": "tiến lại gần, đẩy ra", "拶": "kề sát, đến gần", "芝": "cỏ, bãi cỏ", "肩": "vai", "噛": "nhai, cắn", "沈": "chìm, lắng xuống", "沖": "ngoài khơi", "縄": "dây thừng", "鑑": "mẫu, gương soi, rút kinh nghiệm", "章": "chương, huy hiệu", "昇": "bay lên, thăng" }
const hv = { "鉛": "Duyên", "掲": "Yết", "虹": "Hồng", "扇": "Phiến", "巾": "Cân", "鶴": "Hạc", "焦": "Tiêu", "鍋": "Oa", "肌": "Cơ", "環": "Hoàn", "期": "Kỳ", "携": "Huề", "帯": "Đới", "溺": "Nịch", "挨": "Ai", "拶": "Tạt", "芝": "Chi", "肩": "Kiên" }
const p = new URL("./kanji-vi.json", import.meta.url)
fs.writeFileSync(p, JSON.stringify({ ...JSON.parse(fs.readFileSync(p, "utf8")), ...vi }))
fs.writeFileSync(new URL("./hanviet-extra.json", import.meta.url), JSON.stringify(hv))
