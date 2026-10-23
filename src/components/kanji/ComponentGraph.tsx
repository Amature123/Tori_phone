export interface GraphNode {
  element: string
  label: string
  count: number
  color: string
}

interface ComponentGraphProps {
  char: string
  charLabel?: string
  nodes: GraphNode[]
  hovered: string | null
  onHover: (element: string | null) => void
  onSelect: (element: string) => void
}

const W = 360
const H = 200
const NODE_R = 24
const TOP_Y = 66
const CHAR_Y = 156
const CHAR_R = 28
const INK = "#2e3257"
const DIM = "#d4dbe4"

// One level of "chiết tự": each component points into the kanji it builds,
// and every component node is clickable to open that component's own page
// (so 語 → 吾, then 吾 → 五 + 口 ...), the same shape nhaikanji draws.
export function ComponentGraph({ char, charLabel, nodes, hovered, onHover, onSelect }: ComponentGraphProps) {
  const n = nodes.length
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={char}>
      <defs>
        <marker id="cg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="#627d9a" />
        </marker>
      </defs>
      {nodes.map((node, i) => {
        const x = (W * (i + 0.5)) / n
        const dimmed = hovered !== null && hovered !== node.element
        const color = dimmed ? DIM : node.color
        // Unit vector from this node's centre to the kanji's centre; the arrow
        // runs along it, from the node's rim to just outside the kanji's rim.
        const vx = W / 2 - x
        const vy = CHAR_Y - TOP_Y
        const len = Math.hypot(vx, vy)
        const ux = vx / len
        const uy = vy / len
        const x1 = x + ux * NODE_R
        const y1 = TOP_Y + uy * NODE_R
        const x2 = W / 2 - ux * (CHAR_R + 4)
        const y2 = CHAR_Y - uy * (CHAR_R + 4)
        return (
          <g
            key={node.element}
            className="cursor-pointer"
            onMouseEnter={() => onHover(node.element)}
            onMouseLeave={() => onHover(null)}
            onClick={() => onSelect(node.element)}
          >
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={dimmed ? DIM : "#627d9a"} strokeWidth={1.5} markerEnd="url(#cg-arrow)" />
            <circle cx={x} cy={TOP_Y} r={NODE_R} fill="white" stroke={color} strokeWidth={2.5} />
            <text x={x} y={TOP_Y + 8} textAnchor="middle" fontSize={22} fontWeight={700} fill={color} className="jp">
              {node.element}
            </text>
            {node.count > 1 && (
              <text x={x + NODE_R - 2} y={TOP_Y - NODE_R + 6} textAnchor="middle" fontSize={11} fontWeight={900} fill={color}>
                ×{node.count}
              </text>
            )}
            {node.label && (
              <text x={x} y={TOP_Y - NODE_R - 8} textAnchor="middle" fontSize={11} fontWeight={700} fill={color}>
                {node.label}
              </text>
            )}
          </g>
        )
      })}
      <circle cx={W / 2} cy={CHAR_Y} r={CHAR_R} fill={INK} />
      <text x={W / 2} y={CHAR_Y + 10} textAnchor="middle" fontSize={28} fontWeight={700} fill="white" className="jp">
        {char}
      </text>
      {charLabel && (
        <text x={W / 2} y={H - 4} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
          {charLabel}
        </text>
      )}
    </svg>
  )
}
