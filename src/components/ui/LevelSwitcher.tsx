import { useSettingsStore, type Level } from "@/store/settings-store"

const OPTIONS: { value: Level; label: string }[] = [
  { value: 'N5', label: 'N5' },
  { value: 'N4', label: 'N4' },
  { value: 'all', label: 'N5+N4' },
]

export function LevelSwitcher() {
  const { level, setLevel } = useSettingsStore()

  return (
    <div role="group" aria-label="JLPT level" className="inline-flex p-0.5 gap-0.5 rounded-full bg-surface">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={level === value}
          onClick={() => setLevel(value)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[background-color,color,box-shadow] ${
            level === value ? 'glass-strong text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
