/** Stroke icons for the nav, keyed by the nav item `key`. 24px grid, drawn to inherit currentColor. */
const PATHS: Record<string, string> = {
  home: "M4 11l8-7 8 7v9H4z",
  vocabulary: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11",
  review: "M3 8a3 3 0 013-3h12a3 3 0 013 3v8a3 3 0 01-3 3H6a3 3 0 01-3-3zM8 10h8M8 14h5",
  grammar: "M4 6h16M4 12h10M4 18h14",
  verbForms: "M7 7h10M7 17h10M17 7l3 3-3 3M7 17l-3-3 3-3",
  transitivity: "M4 8h13l-3-3M20 16H7l3 3",
  usage: "M4 5h16v11H9l-5 4z",
  kanji: "M12 3v18M4 8h16M6 14h12",
  radicals: "M6 4v16M6 12h8a4 4 0 004-4V4",
  lookup: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
  rules: "M5 4h14v16H5zM9 9h6M9 13h6",
  accent: "M4 10v4M8 7v10M12 4v16M16 8v8M20 10v4",
  counters: "M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z",
  homophones: "M9 9a3 3 0 116 0c0 2-3 2-3 4M12 17.5h.01",
  settings: "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  more: "M5 12h.01M12 12h.01M19 12h.01",
}

export function NavIcon({ name, className = "size-[18px]" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={`${className} shrink-0`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name] ?? PATHS.more} />
    </svg>
  )
}
