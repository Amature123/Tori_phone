import SwiftUI

@main
struct ToriApp: App {
    @State private var data = DataStore()
    @State private var settings: SettingsStore
    @State private var progress: ProgressStore
    @State private var speaker = Speaker()
    @State private var kanjiVG = KanjiVGStore()
    @State private var library = KanjiLibrary()

    init() {
        // UI tests launch with `-uitest` so they start from a clean, in-memory state.
        let isUITest = ProcessInfo.processInfo.arguments.contains("-uitest")
        _settings = State(initialValue: SettingsStore(defaults: isUITest ? nil : .standard))
        _progress = State(initialValue: ProgressStore(fileURL: isUITest ? nil : ProgressStore.defaultURL))
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(data)
                .environment(settings)
                .environment(progress)
                .environment(speaker)
                .environment(kanjiVG)
                .environment(library)
                .task {
                    await data.load()
                    await library.load(chapters: data.kanjiChapters(.all))
                    // The stroke data is ~2 MB of JSON; decode it now so the first kanji tap does not wait.
                    await kanjiVG.loadIfNeeded()
                }
        }
    }
}
