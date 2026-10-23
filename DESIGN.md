# TORI: Liquid Glass design spec (web reference for the Swift port)

The web app is the visual reference. Source of truth for every value below is `src/index.css`
(theme blocks at the top, `.glass` / `.glass-strong` utilities near the middle).

## Principles
- **Glass on chrome, solid on lists.** Sidebar/drawer, header, tab bar, modals, the kanji drawer and flashcards
  use blur. Long lists (vocab, grammar index) use plain translucent cards with no blur, for scroll performance.
- **Color lives in the background.** A fixed field of four soft color blobs sits behind everything; controls stay neutral
  with one accent. Persimmon (`hanko`) is reserved for "wrong / again / error".
- **Kanji stays sharp.** Japanese text uses Zen Old Mincho (`.jp`), Latin/Vietnamese uses Be Vietnam Pro.
  SwiftUI: bundle both, or use `.system(design: .default)` for Latin and a Mincho face for kanji.
- Capsule/rounded shapes everywhere; no hard offset shadows, no thick borders.

## Themes (three, same token contract)
| Token | Glass (light) | Graphite (light) | Midnight (dark) |
|---|---|---|---|
| bg | #e9ecf5 | #eceef2 | #080a14 |
| text | #14182a | #15171c | #eef0fb |
| text-muted | #5a6180 | #5b606b | #9aa2c4 |
| accent | #4458f0 | #2f6fed | #8b9bff |
| accent-fg | #fff | #fff | #0b1030 |
| yellow (warn / noun) | #e3a008 | #e3a008 | #ffd26a |
| green (ok / adj) | #22a15a | #22a15a | #52d6a1 |
| red / hanko (wrong) | #ea4f3d | #ea4f3d | #ff7d5c |
| blue (verb) | #4f7cf5 | #3f84f2 | #8fb0ff |
| card fill | white @ 74% | white @ 76% | #1a1e36 @ 72% |
| glass fill | white @ 52% | white @ 52% | #1e223c @ 50% |
| glass-strong fill | white @ 78% | white @ 78% | #282e54 @ 78% |
| glass edge | white @ 75% | white @ 75% | white @ 14% |
| glass top highlight | white @ 90% | white @ 90% | white @ 22% |
| ambient blobs s1..s4 | #b9c4ff #ffd0c2 #bfeede #e8d7ff | #cdd6e6 #e6dccf #cfe3dc #dcd6ea | #2a3580 #6b2f3c #14594a #4a2d80 |

SwiftUI mapping: `.ultraThinMaterial` / `.regularMaterial` for glass / glass-strong, plus a 1pt white-gradient
`strokeBorder` for the edge and a 1pt top highlight. On iOS 26+, prefer the native `glassEffect()`
and keep these tokens for the ambient field and semantic colors.

## Shape, depth, motion
- Radii: card 20, small 14, sidebar/modal 28, pills fully rounded (Capsule).
- Border: 1pt hairline (`rgba(20,24,42,.10)` light, `rgba(255,255,255,.10)` dark).
- Elevation: `0 1 1 black@4%` + `0 10 28 -12 indigo@28%` (hover: `0 16 36 -12 @36%`); dark: black @ 30% / 70%.
- Press: scale 0.97-0.99; hover lift 2pt (not applicable on iOS). Motion curve `cubic-bezier(.2,.7,.2,1)`, 150-420 ms.
- Respect Reduce Motion (web: `prefers-reduced-motion` disables all animation).

## Navigation (maps 1:1 to SwiftUI)
- Phone: floating **capsule tab bar** with 4 tabs (Vocab, Review, Grammar, Kanji) + "More" sheet listing
  all 14 destinations in four groups (Learn, Grammar, Kanji, More). iPad/Mac: sidebar (`NavigationSplitView`).
- Destinations: Home, Vocab, Review, Grammar, Verb forms, Transitivity, Usage, Kanji, Radicals, Lookup,
  Kanji rules, Accent, Counters, Homophones, Settings. Icons: `src/components/layout/icons.tsx` (24pt stroke 1.7,
  suggested SF Symbols: house, book, rectangle.stack, text.alignleft, arrow.left.arrow.right, bubble.left,
  character, magnifyingglass, slider.horizontal.3).
- Segmented controls (level N5/N4/N5+N4, EN/VI, density) are `Picker(.segmented)` look-alikes: track = ink @ 6%,
  selected thumb = glass-strong.

## Components to port
Button (primary = accent fill, secondary = glass, pill), Card, PosTag (pill, filled with the semantic colors above),
LevelSwitcher/LanguageSwitcher, KanjiDrawer (right sheet, 28pt leading corners), KanjiGroupModal (centered glass sheet),
Review flashcard + 4 rating buttons (Quên/Khó/Tốt/Dễ), progress bars (6pt capsule, accent gradient).

## Data
All content lives in `src/data/*` JSON and local state (Dexie/IndexedDB + zustand): vocab/grammar/kanji are static,
SRS card state and settings are the only user data (`src/store/*`, `src/lib/srs.ts`).
