interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  accent?: 'yellow' | 'red' | 'green' | 'blue' | null
  /** float-up hover + soft-shadow-to-hard-accent-border transition (Tori's .card-lift) */
  lift?: boolean
}

const ACCENT_COLORS: Record<string, string> = {
  yellow: 'var(--color-yellow)',
  red: 'var(--color-red)',
  green: 'var(--color-green)',
  blue: 'var(--color-blue)',
}

export function Card({ children, className = '', onClick, accent, lift = false }: CardProps) {
  const borderColor = accent
    ? `color-mix(in srgb, ${ACCENT_COLORS[accent]} 45%, transparent)`
    : 'var(--edge)'
  // Accent cards get a tinted shadow (40% of the accent color) instead of
  // the default ink-tinted --shadow-brutal, so the card reads as "colored"
  // without the shadow going full-opacity accent.
  const shadow = accent
    ? `0 10px 28px -12px color-mix(in srgb, ${borderColor} 45%, transparent)`
    : 'var(--shadow-brutal)'
  const shadowHover = accent
    ? `0 16px 36px -12px color-mix(in srgb, ${borderColor} 55%, transparent)`
    : 'var(--shadow-brutal-hover)'

  return (
    <div
      className={[
        'bg-card border-3 transition-[border-color,background-color,box-shadow,transform] duration-150',
        accent ? 'tilt-card hover:rotate-0' : '',
        lift ? 'card-lift' : 'card-shadow',
        onClick ? 'card-shadow-hover cursor-pointer hover:-translate-y-0.5 active:scale-[0.99]' : '',
        className,
      ].join(' ')}
      style={{
        borderColor,
        '--card-shadow': shadow,
        '--card-shadow-hover': shadowHover,
        // .card-lift owns its own shadow states; keep the inline one it always had.
        ...(lift ? { boxShadow: shadow } : {}),
      } as React.CSSProperties}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
