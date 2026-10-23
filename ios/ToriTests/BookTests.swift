import XCTest
@testable import Tori

@MainActor
final class BookTests: XCTestCase {
    private func loaded() async -> DataStore {
        let data = DataStore()
        await data.load()
        return data
    }

    func testToriIsTheDefaultBook() {
        XCTAssertEqual(SettingsStore(defaults: nil).book, .tori)
        let suite = UserDefaults(suiteName: "tori.tests.book")!
        suite.removePersistentDomain(forName: "tori.tests.book")
        let s = SettingsStore(defaults: suite)
        s.book = .minna
        XCTAssertEqual(SettingsStore(defaults: suite).book, .minna, "the choice persists")
    }

    func testToriBookHidesMinnaOnlyWords() async {
        let data = await loaded()
        let all = data.allVocab(.all)
        let tori = data.vocab(.all, book: .tori)
        XCTAssertFalse(tori.contains { $0.category == Book.minnaOnlyCategory })
        XCTAssertEqual(all.count - tori.count, all.filter { $0.category == Book.minnaOnlyCategory }.count)
        XCTAssertEqual(tori.count, 1800, "Tori's own words: 2865 in total minus 1065 Minna-only")
    }

    func testMinnaBookIsExactlyTheLessonTaggedWords() async {
        let data = await loaded()
        let minna = data.vocab(.all, book: .minna)
        XCTAssertTrue(minna.allSatisfy { $0.minna != nil })
        XCTAssertEqual(minna.count, data.allVocab(.all).filter { $0.minna != nil }.count)
        let lessons = Set(minna.compactMap(\.minna))
        XCTAssertEqual(lessons, Set(1...50), "Minna book covers lessons 1-50")
        XCTAssertTrue(minna.contains { $0.category == Book.minnaOnlyCategory }, "Minna-only words live here")
    }

    func testTheTwoBooksNeverShowTheSameWordTwice() async {
        let data = await loaded()
        for book in Book.allCases {
            let words = data.vocab(.all, book: book)
            XCTAssertEqual(Set(words.map(\.id)).count, words.count, "\(book): ids are unique")
        }
    }

    func testGroupKeyFollowsTheBook() async {
        let data = await loaded()
        let v = data.vocab(.n5, book: .minna).first { $0.chapter != nil && $0.minna != nil }!
        XCTAssertEqual(Japanese.groupKey(v, book: .minna), String(v.minna!))
        XCTAssertEqual(Japanese.groupKey(v, book: .tori), String(v.chapter!))
    }

    func testSearchHonoursTheBookGrouping() async {
        let data = await loaded()
        let minna = data.vocab(.n5, book: .minna)
        let hits = Search.vocab(minna, query: "", group: "1", pos: nil,
                                groupKey: { Japanese.groupKey($0, book: .minna) }) { _ in "" }
        XCTAssertFalse(hits.isEmpty)
        XCTAssertTrue(hits.allSatisfy { $0.minna == 1 })
    }
}
