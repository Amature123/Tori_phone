import { getPosLabel } from "@/lib/japanese"

interface PosTagProps {
  pos: string
  verbGroup?: number | null
}

const colors: Record<string, string> = {
  'verb-group1': 'var(--color-blue)',
  'verb-group2': 'var(--color-blue)',
  'verb-group3': 'var(--color-blue)',
  'adj-i': 'var(--color-green)',
  'adj-na': 'var(--color-green)',
  'noun': 'var(--color-yellow)',
  'adverb': 'var(--color-red)',
  'expression': 'var(--color-muted)',
  'conjunction': 'var(--color-muted)',
}

export function PosTag({ pos, verbGroup }: PosTagProps) {
  const bg = colors[pos] ?? 'var(--color-muted)'
  const label = getPosLabel(pos, verbGroup)
  const textColor = pos === 'noun' ? '#3a2a00' : pos === 'expression' || pos === 'conjunction' ? 'var(--color-paper)' : '#fff'
  return (
    <span
      className="font-mono inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
      style={{ backgroundColor: bg, color: textColor }}
    >
      {label}
    </span>
  )
}
