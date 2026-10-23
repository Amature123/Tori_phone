import { useSyncExternalStore } from "react"
import { ScreenHeader } from "@/components/ui/ScreenHeader"
import { Reveal } from "@/components/ui/Reveal"
import { Card } from "@/components/ui/Card"
import { InkCabinet } from "@/components/ui/InkCabinet"
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher"
import { LevelSwitcher } from "@/components/ui/LevelSwitcher"
import { getJapaneseVoiceName, subscribeVoices } from "@/lib/speech"
import { useTranslation } from "@/lib/useTranslation"

export function Settings() {
  const { t } = useTranslation()
  // Live rather than a one-time read - browsers load their voice list
  // asynchronously, so a snapshot taken at first render can still be empty.
  const voiceName = useSyncExternalStore(subscribeVoices, getJapaneseVoiceName)

  return (
    <div className="max-w-4xl mx-auto px-8 py-4">
      <ScreenHeader
        eyebrowJa="設定"
        eyebrowEn="SETTINGS"
        title={t('nav.settings')}
        description={t('settings.description')}
        watermark="設"
      />

      <div className="flex flex-col gap-6 pb-16">
        <Reveal index={0}>
          <Card className="p-6">
            <h2 className="font-display text-xl mb-1">{t('settings.paperTitle')}</h2>
            <p className="text-sm text-muted mb-6">
              {t('settings.paperDescription')}
            </p>
            <InkCabinet />
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card className="p-6">
            <h2 className="font-display text-xl mb-1">{t('settings.languageTitle')}</h2>
            <p className="text-sm text-muted mb-4">{t('settings.languageDescription')}</p>
            <LanguageSwitcher />
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Card className="p-6">
            <h2 className="font-display text-xl mb-1">{t('settings.levelTitle')}</h2>
            <p className="text-sm text-muted mb-4">{t('settings.levelDescription')}</p>
            <LevelSwitcher />
          </Card>
        </Reveal>

        <Reveal index={3}>
          <Card className="p-6">
            <h2 className="font-display text-xl mb-1">{t('settings.voiceTitle')}</h2>
            <p className="text-sm text-muted mb-4">{t('settings.voiceDescription')}</p>
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className={`w-2 h-2 rounded-full shrink-0 ${voiceName ? "bg-green" : "bg-yellow"}`} aria-hidden="true" />
              {voiceName ? t('settings.voiceStatusFound', { name: voiceName }) : t('settings.voiceStatusDefault')}
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  )
}
