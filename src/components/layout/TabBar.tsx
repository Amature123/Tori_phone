import { NavLink } from "react-router-dom"
import { useTranslation } from "@/lib/useTranslation"
import { prefetchRoute } from "@/lib/routes"
import { NavIcon } from "./icons"

const TABS = [
  { to: "/vocab", key: "vocabulary" },
  { to: "/review", key: "review" },
  { to: "/grammar", key: "grammar" },
  { to: "/kanji", key: "kanji" },
]

/** Floating glass pill tab bar, phones only (the sidebar covers lg+). "More" opens the full drawer. */
export function TabBar({ onMore }: { onMore: () => void }) {
  const { t } = useTranslation()
  const base =
    "flex flex-col items-center justify-center gap-0.5 rounded-full text-[10.5px] font-semibold min-h-[50px] transition-[color,background-color,box-shadow] duration-150 cursor-pointer"

  return (
    <nav
      aria-label="Tabs"
      className="glass-strong lg:hidden fixed z-20 left-4 right-4 grid grid-cols-5 gap-0.5 p-1.5 rounded-full"
      style={{
        bottom: "max(0.75rem, env(safe-area-inset-bottom))",
        marginLeft: "env(safe-area-inset-left)",
        marginRight: "env(safe-area-inset-right)",
      }}
    >
      {TABS.map(({ to, key }) => (
        <NavLink
          key={to}
          to={to}
          onPointerDown={() => prefetchRoute(to)}
          className={({ isActive }) =>
            `${base} ${isActive ? "text-accent bg-card shadow-[inset_0_1px_0_var(--hi),0_2px_8px_-3px_rgba(40,50,110,0.3)]" : "text-muted"}`
          }
        >
          <NavIcon name={key} className="size-[21px]" />
          <span className="truncate max-w-full px-1">{t(`nav.${key}`)}</span>
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={`${base} text-muted`}>
        <NavIcon name="more" className="size-[21px]" />
        <span>{t("nav.groups.more")}</span>
      </button>
    </nav>
  )
}
