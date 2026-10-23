import SwiftUI

/// Detail for any kanji (textbook anchor or not): readings, meaning, stroke
/// order, parts, and for anchors the related words. Pages through `chars`.
/// Port of the web KanjiDrawer, minus its drawing pad.
struct KanjiDetailSheet: View {
    let chars: [String]
    @State var current: String

    @Environment(SettingsStore.self) private var settings
    @Environment(KanjiLibrary.self) private var library
    @Environment(KanjiVGStore.self) private var kanjiVG
    @Environment(\.palette) private var p
    @Environment(\.dismiss) private var dismiss

    init(char: String, chars: [String]? = nil) {
        self.chars = chars ?? [char]
        _current = State(initialValue: char)
    }

    private var index: Int? { chars.firstIndex(of: current) }

    var body: some View {
        let record = library.record(current)
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                HStack {
                    if let a = record?.anchor {
                        Text("\(a.src.rawValue) · " + settings.t("common.chapterN", ["n": a.chapter]))
                            .font(.caption).foregroundStyle(p.muted)
                    }
                    Spacer()
                    Button { dismiss() } label: {
                        Image(systemName: "xmark").font(.system(size: 14, weight: .bold))
                            .frame(width: 36, height: 36).background(Circle().fill(p.text.opacity(0.08)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(settings.t("common.close"))
                }

                VStack(spacing: 8) {
                    Text(current).jp(96, weight: .medium)
                    if let h = record?.hanviet { Text(h).font(.title3.weight(.bold)) }
                    if let m = record?.meaning, !m.isEmpty { Text(settings.text(m)).font(.subheadline).foregroundStyle(p.muted) }
                    if let r = record, !r.on.isEmpty { readingRow(settings.t("ios.kanji.onyomi"), r.on) }
                    if let r = record, !r.kun.isEmpty { readingRow(settings.t("ios.kanji.kunyomi"), r.kun) }
                }
                .frame(maxWidth: .infinity).padding(20)
                .glass(strong: true, radius: Radius.sheet)

                if let vg = kanjiVG.entry(for: current) {
                    StrokeOrderView(entry: vg).frame(maxWidth: 260).frame(maxWidth: .infinity)
                    let parts = parts(of: vg)
                    if !parts.isEmpty {
                        SectionLabel(text: settings.l("Thành phần", "Components"))
                        FlowLayout(spacing: 8, lineSpacing: 8) {
                            ForEach(parts, id: \.self) { part in
                                Text(part).jp(22)
                                    .frame(minWidth: 44, minHeight: 44)
                                    .solidCard(radius: Radius.small)
                            }
                        }
                    }
                }

                if let group = record?.anchor?.group, !group.words.isEmpty {
                    SectionLabel(text: settings.t("kanji.relatedWords"))
                    ForEach(Array(group.words.enumerated()), id: \.offset) { _, w in
                        HStack(spacing: 12) {
                            FuriganaWord(kanji: w.kanji, kana: w.kana, size: 22).frame(minWidth: 84, alignment: .leading)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(settings.text(w.meaning)).font(.footnote)
                                Text("\(w.hanviet) · \(w.onkun)").font(.caption2).foregroundStyle(p.muted)
                            }
                            Spacer(minLength: 0)
                            SpeakButton(text: w.kana)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .solidCard(radius: Radius.small)
                    }
                }
            }
            .padding(16)
        }
        .id(current)
        .task { await kanjiVG.loadIfNeeded() }
        .safeAreaInset(edge: .bottom) {
            if chars.count > 1, let i = index {
                DetailPager(position: i + 1, total: chars.count,
                            prev: i > 0 ? { current = chars[i - 1] } : nil,
                            next: i < chars.count - 1 ? { current = chars[i + 1] } : nil)
            }
        }
    }

    /// Distinct component glyphs, excluding the kanji itself.
    private func parts(of vg: KanjiVGEntry) -> [String] {
        var seen = Set<String>(), out: [String] = []
        for c in vg.components ?? [] {
            guard let e = c.element, e != current, seen.insert(e).inserted else { continue }
            out.append(e)
        }
        return out
    }

    private func readingRow(_ label: String, _ items: [String]) -> some View {
        HStack(spacing: 8) {
            Text(label).font(.caption.weight(.semibold)).foregroundStyle(p.muted)
            FlowLayout(spacing: 6, lineSpacing: 6) {
                ForEach(items, id: \.self) { r in
                    Text(r).jp(14, weight: .medium)
                        .padding(.horizontal, 10).padding(.vertical, 3)
                        .background(Capsule().fill(p.accent.opacity(0.12)))
                }
            }
        }
    }
}

extension View {
    /// Presents `KanjiDetailSheet` for a kanji, paging through `chars`.
    func kanjiSheet(_ char: Binding<String?>, chars: [String]? = nil) -> some View {
        sheet(item: Binding(get: { char.wrappedValue.map(KanjiPick.init) }, set: { char.wrappedValue = $0?.char })) { pick in
            KanjiDetailSheet(char: pick.char, chars: chars)
                .presentationDetents([.large])
                .presentationCornerRadius(Radius.sheet)
                .toriSheetBackground()
        }
    }
}

struct KanjiPick: Identifiable { let char: String; var id: String { char } }
