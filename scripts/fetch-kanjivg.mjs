// Fetches KanjiVG stroke-order SVGs for every kanji character that appears
// anywhere in the app's data — n5/vocabulary.json + n4/vocabulary.json
// entries, n5/kanji.json + n4/kanji.json's leading-kanji anchors and member
// words — and distills each into: ordered
// stroke path data (document order == stroke order) + a recursive
// radical/component decomposition (walks the full <g> nesting so repeated
// components hidden behind an intermediate sub-group — e.g. 森's three 木 —
// aren't lost; see collectComponents below for the expand-vs-leaf rule).
// Components may repeat in the output array; grouping/counting duplicates
// for display (e.g. "木 ×3") is a UI concern.
// Source: https://github.com/KanjiVG/kanjivg (CC BY-SA 3.0, Ulrich Apel).
// The output is level-agnostic (src/data/kanjivg.json, not n5/ or n4/): a
// kanji is looked up by character alone everywhere in the app (see
// Furigana.tsx's onKanjiClick), and most characters appear in both levels'
// data anyway, so there's no clean per-level split to make.
// Merges into the existing kanjivg.json rather than overwriting it — already
// -fetched characters are skipped. Re-run after vocabulary.json or
// kanji.json gain new kanji.
import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { canonicalElement } from "./radical-aliases.mjs"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, "..")
const n5KanjiJsonPath = path.join(root, "src/data/n5/kanji.json")
const n4KanjiJsonPath = path.join(root, "src/data/n4/kanji.json")
const vocabJsonPath = path.join(root, "src/data/n5/vocabulary.json")
const n4VocabJsonPath = path.join(root, "src/data/n4/vocabulary.json")
const outPath = path.join(root, "src/data/kanjivg.json")

// Same CJK ranges Furigana.tsx uses to decide what's clickable, so the
// fetched data always covers exactly what the UI can ask for.
const KANJI_RE = /[一-鿿㐀-䶿々]/

const KANJIVG_BASE = "https://raw.githubusercontent.com/KanjiVG/kanjivg/master/kanji"
const CONCURRENCY = 8

function codepointHex(char) {
  return char.codePointAt(0).toString(16).padStart(5, "0")
}

// Stroke order == document order of <path> elements inside the
// kvg:StrokePaths_* group. A plain regex over `d="..."` preserves that order
// exactly (an object/DOM parser risks reordering or deduping siblings); it
// also can't match the `<!ATTLIST path ...>` line in the DOCTYPE since that
// has no `d=` attribute.
function extractStrokes(svg) {
  const strokesBlockMatch = svg.match(/<g id="kvg:StrokePaths_[^"]*"[^>]*>([\s\S]*?)<\/g>\s*<g id="kvg:StrokeNumbers/)
  const block = strokesBlockMatch ? strokesBlockMatch[1] : svg
  const paths = []
  const pathRe = /<path\b[^>]*\bd="([^"]+)"/g
  let m
  while ((m = pathRe.exec(block))) paths.push(m[1])
  return paths
}

function attrVal(attrs, name) {
  const m = attrs.match(new RegExp(`kvg:${name}="([^"]+)"`))
  return m ? m[1] : null
}

// Full stack-based tag walker building the nested <g> tree under the root
// `kvg:<hex>` group (unlike a depth-1 scan, this doesn't lose components
// hidden behind an intermediate wrapper — e.g. 森's second and third 木 live
// two levels down, inside a `林` sub-group).
function parseGroupTree(svg, hex) {
  const rootOpenRe = new RegExp(`<g id="kvg:${hex}"([^>]*)>`)
  const rootOpen = svg.match(rootOpenRe)
  if (!rootOpen) return null

  const tagRe = /<g\b([^>]*)>|<\/g>|<path\b/g
  tagRe.lastIndex = rootOpen.index + rootOpen[0].length
  const makeNode = attrs => ({
    element: attrVal(attrs, "element"),
    position: attrVal(attrs, "position"),
    isRadical: attrVal(attrs, "radical") !== null,
    hasPart: attrVal(attrs, "part") !== null,
    children: [],
    strokeStart: strokeCount,
    strokeEnd: strokeCount,
  })
  // Stroke index == document order of <path>, same as extractStrokes(); each
  // node covers the half-open range [strokeStart, strokeEnd).
  let strokeCount = 0
  const root = makeNode(rootOpen[1])
  const stack = [root]
  let m
  while ((m = tagRe.exec(svg))) {
    if (m[0] === "</g>") {
      stack.pop().strokeEnd = strokeCount
      if (stack.length === 0) break
    } else if (m[0] === "<path") {
      strokeCount++
    } else {
      const node = makeNode(m[1])
      stack[stack.length - 1].children.push(node)
      stack.push(node)
    }
  }
  return root
}

// `kvg:part` fragments of one split component aren't always adjacent
// siblings — KanjiVG can bury one fragment inside an intervening positional
// wrapper while its other half sits at the parent level (e.g. 午 = [top
// wrapper: 丿 + 干(part1)] + 干(part2)[bottom]). A per-level sibling scan
// would treat those as two unrelated nodes. So: walk the WHOLE tree once
// up front, bucket every kvg:part node by element name regardless of depth,
// and remember which exact node objects are part-fragments — collapsing a
// node's own children into leaves then just skips fragment nodes it meets
// (a global emitted-set stops duplicates) instead of resolving them locally.
function collectPartFragments(node, byElement) {
  for (const child of node.children) {
    if (child.element && child.hasPart) {
      if (!byElement.has(child.element)) byElement.set(child.element, [])
      byElement.get(child.element).push(child)
    }
    collectPartFragments(child, byElement)
  }
}

const strokeRange = node => Array.from({ length: node.strokeEnd - node.strokeStart }, (_, i) => node.strokeStart + i)

// Decides what a set of siblings (a node's children, or the whole kanji's
// top-level children) resolves to. A part-fragment sibling contributes its
// merged (whole-tree) component once, at its first occurrence in document
// order; every other sibling is processed individually via collectComponents,
// which is what surfaces genuine adjacent repetition (e.g. 林 = 木 + 木) as
// separate leaves.
function expandChildren(children, inheritedPosition, results, ctx) {
  for (const child of children) {
    if (child.element && child.hasPart) {
      if (ctx.emitted.has(child.element)) continue
      ctx.emitted.add(child.element)
      const frags = ctx.partsByElement.get(child.element)
      results.push({
        element: canonicalElement(child.element),
        position: frags.find(f => f.position)?.position ?? inheritedPosition,
        isRadical: frags.some(f => f.isRadical),
        strokes: frags.flatMap(strokeRange),
      })
    } else {
      collectComponents(child, results, inheritedPosition, ctx)
    }
  }
}

// Collapses a single node into the component(s) a learner would actually
// recognize. A named node is a leaf at its own name UNLESS its children are
// all the same element (a repetition group, e.g. 森's 林 sub-group = 木 + 木)
// — then it hands off to its children. An unnamed positional wrapper (e.g.
// 品's bottom two 口) always hands off too. Everything else is a leaf, even
// compounds (語's 吾 = 五 + 口) and rare phonetic glyphs (韓's 𠦝, 検's 㑒):
// further splitting isn't a meaningful "radical" for a learner, and nhaikanji
// -- the reference this was checked against -- keeps those as one unit too.
// An earlier version split unrecognizable glyphs into their children; checking
// 韓 and 検 against nhaikanji showed that over-splits (検 → 木 人 一 口 人).
function collectComponents(node, results, inheritedPosition, ctx) {
  const position = node.position ?? inheritedPosition
  const named = node.children.filter(c => c.element)
  const allSameName = named.length >= 2 && named.every(c => c.element === named[0].element)

  if (node.element && !allSameName) {
    results.push({ element: canonicalElement(node.element), position, isRadical: node.isRadical, strokes: strokeRange(node) })
    return
  }
  const before = results.length
  expandChildren(node.children, position, results, ctx)
  // Nothing recognizable underneath either (e.g. only bare stroke paths):
  // keep the node itself so its strokes still belong to some component.
  if (results.length === before && node.element) {
    results.push({ element: canonicalElement(node.element), position, isRadical: node.isRadical, strokes: strokeRange(node) })
  }
}

function extractComponents(svg, char, hex, strokeTotal) {
  const tree = parseGroupTree(svg, hex)
  const whole = { element: char, position: null, isRadical: true, strokes: Array.from({ length: strokeTotal }, (_, i) => i) }
  if (!tree) return [whole]

  const partsByElement = new Map()
  collectPartFragments(tree, partsByElement)
  const ctx = { partsByElement, emitted: new Set() }

  // The root node IS the whole kanji (kvg:element == the character itself);
  // its own name is never a candidate component, so expand straight into
  // its children rather than running it through collectComponents.
  const results = []
  expandChildren(tree.children, null, results, ctx)
  if (results.length === 0) return [whole]
  return partitionStrokes(results, strokeTotal)
}

// KanjiVG sometimes leaves a stroke as a bare <path> directly under a parent
// group (so no component claims it, e.g. 万's/五's extra strokes) and
// occasionally lets two components claim the same one. Make `strokes` an exact
// partition of 0..strokeTotal-1 so the animation can color every stroke by
// its component: first claimant wins, an unclaimed stroke joins the component
// that owns the stroke before it (or the one after, for a leading orphan).
function partitionStrokes(components, strokeTotal) {
  const owner = new Array(strokeTotal).fill(-1)
  components.forEach((c, ci) => {
    for (const i of c.strokes) if (owner[i] === -1) owner[i] = ci
  })
  for (let i = 0; i < strokeTotal; i++) if (owner[i] === -1 && i > 0) owner[i] = owner[i - 1]
  for (let i = strokeTotal - 1; i >= 0; i--) if (owner[i] === -1 && i < strokeTotal - 1) owner[i] = owner[i + 1]
  return components
    .map((c, ci) => ({ ...c, strokes: owner.flatMap((o, i) => (o === ci ? [i] : [])) }))
    .filter(c => c.strokes.length > 0)
}

async function fetchOne(char) {
  const hex = codepointHex(char)
  const url = `${KANJIVG_BASE}/${hex}.svg`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${char} (${hex})`)
  const svg = await res.text()
  const viewBoxMatch = svg.match(/viewBox="([^"]+)"/)
  const strokes = extractStrokes(svg)
  if (strokes.length === 0) throw new Error(`No strokes parsed for ${char} (${hex})`)
  const components = extractComponents(svg, char, hex, strokes.length)
  return {
    viewBox: viewBoxMatch ? viewBoxMatch[1] : "0 0 109 109",
    strokes,
    components,
  }
}

function collectChars(text, set) {
  for (const ch of text || "") if (KANJI_RE.test(ch)) set.add(ch)
}

function main() {
  const n5KanjiData = JSON.parse(readFileSync(n5KanjiJsonPath, "utf8"))
  const n4KanjiData = JSON.parse(readFileSync(n4KanjiJsonPath, "utf8"))
  const vocabData = JSON.parse(readFileSync(vocabJsonPath, "utf8"))
  const n4VocabData = JSON.parse(readFileSync(n4VocabJsonPath, "utf8"))
  const existing = JSON.parse(readFileSync(outPath, "utf8"))

  const chars = new Set()
  for (const v of [...vocabData, ...n4VocabData]) {
    collectChars(v.kanji, chars)
    for (const ex of v.examples ?? []) collectChars(ex.ja, chars)
  }
  for (const kanjiData of [n5KanjiData, n4KanjiData]) {
    for (const chapter of kanjiData.chapters) {
      for (const group of chapter.groups) {
        chars.add(group.anchor)
        for (const word of group.words) collectChars(word.kanji, chars)
      }
    }
  }

  // --force re-fetches everything: the distilled JSON no longer holds the raw
  // <g> tree, so a change to the decomposition rules above only takes effect
  // by re-running every character, not just the ones missing from the file.
  const force = process.argv.includes("--force")
  const list = [...chars].filter(ch => force || !(ch in existing))
  console.log(`${chars.size} unique kanji in app data, ${list.length} not yet in kanjivg.json.`)
  if (list.length === 0) {
    console.log("Nothing to fetch.")
    return
  }
  console.log(`Fetching KanjiVG data for ${list.length} kanji...`)

  return runFetch(list, existing)
}

async function runFetch(list, existing) {
  const result = { ...existing }
  const misses = []
  let i = 0
  async function worker() {
    while (i < list.length) {
      const char = list[i++]
      try {
        result[char] = await fetchOne(char)
      } catch (err) {
        misses.push({ char, error: err.message })
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker))

  writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8")
  console.log(`Wrote ${Object.keys(result).length} total entries (${list.length - misses.length} newly fetched) to ${path.relative(root, outPath)}`)
  if (misses.length > 0) {
    console.log(`\n${misses.length} miss(es):`)
    for (const miss of misses) console.log(`  ${miss.char}: ${miss.error}`)
  }
}

main()
