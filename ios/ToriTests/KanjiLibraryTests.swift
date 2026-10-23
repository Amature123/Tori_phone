import XCTest
@testable import Tori

@MainActor
final class KanjiLibraryTests: XCTestCase {
    private func loadedLibrary() async throws -> KanjiLibrary {
        let data = DataStore()
        await data.load()
        let lib = KanjiLibrary()
        await lib.load(chapters: data.kanjiChapters(.all))
        XCTAssertTrue(lib.ready)
        return lib
    }

    func testLoadsRadicalsAndRecords() async throws {
        let lib = try await loadedLibrary()
        XCTAssertEqual(lib.radicals.count, 214)
        XCTAssertGreaterThan(lib.records.count, 1000)
        XCTAssertEqual(lib.order.count, lib.records.count)
        XCTAssertNotNil(lib.record("日")?.anchor, "textbook anchors carry their group")
    }

    func testSearchByKanjiHanVietKanaAndMeaning() async throws {
        let lib = try await loadedLibrary()
        XCTAssertEqual(lib.search("日").first?.char, "日")
        XCTAssertTrue(lib.search("nhat").contains { $0.char == "日" }, "tone-insensitive Han Viet")
        XCTAssertTrue(lib.search("Nhật").contains { $0.char == "日" })
        XCTAssertTrue(lib.search("ニチ").contains { $0.char == "日" }, "katakana query matches readings")
        XCTAssertTrue(lib.search("にち").contains { $0.char == "日" })
        XCTAssertTrue(lib.search("xyzzy-nothing").isEmpty)
    }

    func testCleanReadingsStripsBoundFormMarkersAndDedupes() {
        XCTAssertEqual(KanjiText.cleanReadings(["-あ.がり", "うわ-", "うわ"]), ["あ.がり", "うわ"])
        XCTAssertEqual(KanjiText.stripTone("Đức Hán"), "duc han")
        XCTAssertEqual(KanjiText.katakanaToHiragana("ニチ"), "にち")
    }
}
