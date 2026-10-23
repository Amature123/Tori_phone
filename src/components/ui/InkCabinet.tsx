import { useSettingsStore, type Paper, type Density } from "@/store/settings-store"
import { useTranslation } from "@/lib/useTranslation"

const THEMES: { id: Paper; ja: string; en: string; swatch: [string, string, string] }[] = [
  { id: "washi", ja: "和紙", en: "Glass", swatch: ["#cfd6ff", "#14182a", "#4458f0"] },
  { id: "sumi", ja: "墨", en: "Graphite", swatch: ["#dfe3ec", "#15171c", "#2f6fed"] },
  { id: "gold", ja: "夜", en: "Midnight", swatch: ["#0d1030", "#eef0fb", "#8b9bff"] },
]

const DENSITIES: { id: Density; ja: string; en: string }[] = [
  { id: "compact", ja: "密", en: "Compact" },
  { id: "normal", ja: "並", en: "Normal" },
  { id: "sparse", ja: "疎", en: "Sparse" },
]

/** 3 paper swatches, and (in full mode) density + typeface controls. */
export function InkCabinet({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation()
  const paper = useSettingsStore((s) => s.paper)
  const setPaper = useSettingsStore((s) => s.setPaper)
  const density = useSettingsStore((s) => s.density)
  const setDensity = useSettingsStore((s) => s.setDensity)
  const typeSans = useSettingsStore((s) => s.typeSans)
  const setTypeSans = useSettingsStore((s) => s.setTypeSans)

  return (
    <div className={compact ? "flex flex-col gap-2" : "flex flex-col gap-8"}>
      <div>
        <div className={compact ? "flex gap-1.5" : "grid grid-cols-3 gap-3 max-w-sm"}>
          {THEMES.map((theme) => {
            const active = paper === theme.id
            const [bg, ink, accent] = theme.swatch
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setPaper(theme.id)}
                aria-pressed={active}
                title={`${theme.en} · ${theme.ja}`}
                className={[
                  "relative border rounded-2xl flex items-center justify-center transition-[border-color,box-shadow] cursor-pointer",
                  compact ? "h-7 flex-1" : "flex-col gap-2 p-2 aspect-[4/3]",
                  active ? "border-accent shadow-[0_0_0_3px_var(--tori-accent-soft)]" : "border-ink/15 hover:border-ink/40",
                ].join(" ")}
                style={{ background: bg }}
              >
                {!compact && (
                  <span className="jp text-lg leading-none" style={{ color: ink }}>
                    {theme.ja}
                  </span>
                )}
                <span className="absolute bottom-1 right-1 size-2 rounded-full" style={{ background: accent }} />
              </button>
            )
          })}
        </div>
        {!compact && (
          <p className="text-sm text-muted mt-4">
            {t('settings.inkCabinet.readingInPrefix')}{" "}
            <span className="jp">{THEMES.find((th) => th.id === paper)?.ja}</span> ·{" "}
            {THEMES.find((th) => th.id === paper)?.en}
            {t('settings.inkCabinet.readingInSuffix')}
          </p>
        )}
      </div>

      {!compact && (
        <>
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">
              <span className="jp mr-2 text-sm normal-case">密度</span>{t('settings.inkCabinet.density')}
            </p>
            <div className="inline-flex p-0.5 gap-0.5 rounded-full bg-surface">
              {DENSITIES.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDensity(d.id)}
                  className={[
                    "px-4 py-2 rounded-full text-xs font-semibold cursor-pointer transition-colors",
                    density === d.id ? "glass-strong text-ink" : "text-muted hover:text-ink",
                  ].join(" ")}
                >
                  <span className="jp mr-1.5 normal-case">{d.ja}</span>
                  {d.en}
                </button>
              ))}
            </div>
            <p className="text-sm text-muted mt-3">{t('settings.inkCabinet.densityDescription')}</p>
          </div>

          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-muted mb-3">
              <span className="jp mr-2 text-sm normal-case">書体</span>{t('settings.inkCabinet.typeface')}
            </p>
            <button
              type="button"
              onClick={() => setTypeSans(!typeSans)}
              className="card-lift flex items-center gap-4 border border-structural rounded-2xl bg-card px-5 py-4 w-full text-left cursor-pointer"
            >
              <span className={`relative w-11 h-6 rounded-full border border-structural shrink-0 ${typeSans ? "bg-accent" : "bg-surface"}`}>
                <span
                  className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-[left] duration-200 ${
                    typeSans ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">{t('settings.inkCabinet.typefaceToggle')}</span>
                <span className="block text-xs text-muted mt-0.5">
                  {t('settings.inkCabinet.typefaceDescription')}
                </span>
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
