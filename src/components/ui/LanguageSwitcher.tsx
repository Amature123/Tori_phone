import { useTranslation } from "@/lib/useTranslation"
import type { Locale } from "@/lib/i18n"

const OPTIONS: { value: Locale; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'vi', label: 'VI' },
]

export function LanguageSwitcher() {
  const { lang, setLang } = useTranslation()

  return (
    <div role="group" aria-label="Language" className="inline-flex p-0.5 gap-0.5 rounded-full bg-surface">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          aria-pressed={lang === value}
          onClick={() => setLang(value)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[background-color,color,box-shadow] ${
            lang === value ? 'glass-strong text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
