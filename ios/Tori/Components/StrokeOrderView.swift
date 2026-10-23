import SwiftUI

/// Draws a kanji stroke by stroke, like the web app's AnimatedKanjiSvg: a dim
/// guide underneath, ink drawn in order on top, optional stroke numbers.
struct StrokeOrderView: View {
    let entry: KanjiVGEntry
    var strokeDuration: Double = 0.5
    var showNumbers = true
    var showsReplayButton = true

    @Environment(\.palette) private var p
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var strokes: [SVGPathParser.Stroke] = []
    @State private var startedAt = Date()
    @State private var finished = false

    private var total: Double { Double(strokes.count) * strokeDuration }

    var body: some View {
        VStack(spacing: 10) {
            TimelineView(.animation(paused: finished || reduceMotion)) { context in
                let elapsed = reduceMotion ? total : context.date.timeIntervalSince(startedAt)
                Canvas { ctx, size in draw(&ctx, size: size, elapsed: elapsed) }
            }
            .aspectRatio(entry.size.width / entry.size.height, contentMode: .fit)
            .background(RoundedRectangle(cornerRadius: Radius.small, style: .continuous).fill(p.solidCard.opacity(0.6)))
            .overlay(RoundedRectangle(cornerRadius: Radius.small, style: .continuous).strokeBorder(p.hairline, lineWidth: 1))
            .accessibilityElement()
            .accessibilityLabel("Stroke order, \(entry.strokes.count) strokes")

            if showsReplayButton {
                Button { replay() } label: {
                    Label("Replay", systemImage: "arrow.counterclockwise")
                }
                .buttonStyle(.toriGlass)
                .accessibilityIdentifier("strokes.replay")
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { replay() }
        .task(id: entry.strokes) {
            strokes = entry.strokes.compactMap(SVGPathParser.parse)
            replay()
        }
    }

    private func replay() {
        startedAt = Date()
        finished = false
        let wait = total + 0.3
        Task {
            try? await Task.sleep(for: .seconds(wait))
            finished = true
        }
    }

    private func draw(_ ctx: inout GraphicsContext, size: CGSize, elapsed: Double) {
        guard !strokes.isEmpty else { return }
        let vb = entry.size
        let scale = min(size.width / vb.width, size.height / vb.height)
        let dx = (size.width - vb.width * scale) / 2, dy = (size.height - vb.height * scale) / 2
        let t = CGAffineTransform(translationX: dx, y: dy).scaledBy(x: scale, y: scale)
        let guide = StrokeStyle(lineWidth: 2 * scale, lineCap: .round, lineJoin: .round)
        let ink = StrokeStyle(lineWidth: 3 * scale, lineCap: .round, lineJoin: .round)

        for s in strokes { ctx.stroke(s.path.applying(t), with: .color(p.muted.opacity(0.28)), style: guide) }
        for (i, s) in strokes.enumerated() {
            let progress = min(max((elapsed - Double(i) * strokeDuration) / strokeDuration, 0), 1)
            guard progress > 0 else { continue }
            ctx.stroke(s.path.applying(t).trimmedPath(from: 0, to: easeInOut(progress)), with: .color(p.text), style: ink)
            if showNumbers {
                let at = CGPoint(x: (s.start.x - 4) * scale + dx, y: (s.start.y - 3) * scale + dy)
                ctx.draw(Text("\(i + 1)").font(.system(size: 8 * scale, weight: .bold)).foregroundColor(p.red), at: at)
            }
        }
    }

    private func easeInOut(_ x: Double) -> Double { x * x * (3 - 2 * x) }
}
