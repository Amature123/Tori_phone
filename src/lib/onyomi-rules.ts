import data from "@/data/onyomi-rules.json"

export interface OnyomiExample { kanji: string; hanviet: string; on: string[] }
export interface OnyomiRule {
  id: string
  group: "final" | "initial"
  vi: string
  ja: string
  total: number
  matched: number
  rate: number
  examples: OnyomiExample[]
  exceptions: OnyomiExample[]
}

export const ONYOMI_RULES = data.rules as OnyomiRule[]
const byId = new Map(ONYOMI_RULES.map(r => [r.id, r]))
const kanjiRules = data.kanjiRules as Record<string, string[]>

/** Rules (measured in scripts/build-onyomi-rules.mjs) that this kanji's Hán Việt → on'yomi follows. */
export function rulesForKanji(char: string): OnyomiRule[] {
  return (kanjiRules[char] ?? []).map(id => byId.get(id)).filter((r): r is OnyomiRule => r !== undefined)
}
