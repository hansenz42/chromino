/**
 * ChrominoLogo — a 1×3 coloured tile used as the project logo.
 * Colors: Red · Green (primary) · Blue
 *
 * Usage:
 *   <ChrominoLogo size={32} />   ← height in px; width scales automatically
 */
export function ChrominoLogo({ size = 32 }: { size?: number }) {
  // Tile geometry (all in viewBox units)
  const CELL = 40;
  const GAP = 5;
  const PAD = 5;
  const RX_TILE = 10;
  const RX_CELL = 7;

  const W = 3 * CELL + 2 * GAP + 2 * PAD;
  const H = CELL + 2 * PAD;

  const colors = ["#E74C3C", "#4ade80", "#3498DB"] as const;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ height: size, width: "auto" }}
      aria-label="Chromino logo"
      role="img"
    >
      {/* tile outline */}
      <rect
        x={0}
        y={0}
        width={W}
        height={H}
        rx={RX_TILE}
        fill="#0f1218"
        stroke="#3a4256"
        strokeWidth={2}
      />
      {/* three colour cells */}
      {colors.map((fill, i) => (
        <rect
          key={i}
          x={PAD + i * (CELL + GAP)}
          y={PAD}
          width={CELL}
          height={CELL}
          rx={RX_CELL}
          fill={fill}
        />
      ))}
    </svg>
  );
}
