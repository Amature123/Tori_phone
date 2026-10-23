// Variant → canonical radical glyph. KanjiVG tags the same radical with
// different codepoints depending on position/font (⻌ for 辶, ⺨ for 犭, ...),
// and the app's Japanese kanji forms differ from the traditional glyphs in
// scripts/radical-pdf-table.json (黒/黑, 黄/黃, ...). Both fetch-kanjivg.mjs
// (normalizes component.element) and build-radical-names.mjs (name lookup)
// import this so the two never disagree.
// (𠂉 is deliberately NOT here: it is two strokes (ノ + 一), not the single 丿.)
// (⺦ is U+2EA6 "simplified half tree trunk" = 丬, not 火 -- it is the left
// part of 寝 将 状. 龰 is the bottom form of 止, as in 足 走.)
export const VARIANT_TO_CANONICAL = {
  "⻌": "辶",
  "⻏": "阝",
  "⺨": "犭",
  "⺤": "爫",
  "⺷": "羊",
  "⺕": "彐",
  "⺌": "小",
  "⺍": "小",
  "⺦": "丬",
  "龰": "止",
}

// PDF glyph (traditional) → the Japanese form KanjiVG uses for the same radical.
export const PDF_TO_JAPANESE_FORM = {
  "黑": "黒",
  "黃": "黄",
  "龍": "竜",
  "龜": "亀",
}

export const canonicalElement = el => VARIANT_TO_CANONICAL[el] ?? el
