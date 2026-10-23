import { type ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'yellow' | 'red' | 'green' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

const variants: Record<string, string> = {
  primary:   'bg-accent text-accent-fg border-transparent',
  secondary: 'glass text-ink',
  yellow:    'bg-yellow text-paper border-transparent',
  red:       'bg-red text-white border-transparent',
  green:     'bg-green text-white border-transparent',
  ghost:     'bg-transparent text-ink border-transparent shadow-none hover:bg-surface',
}

const sizes: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2',
          'rounded-full border border-structural',
          'font-semibold tracking-wide',
          'shadow-[var(--shadow-brutal)]',
          'transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-150',
          'hover:shadow-[var(--shadow-brutal-hover)] hover:-translate-y-px',
          'active:scale-[0.97] active:shadow-none',
          'cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none',
          variants[variant],
          sizes[size],
          className,
        ].join(' ')}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
