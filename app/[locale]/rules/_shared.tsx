// Shared SVG building blocks and layout components for the Rules page.
// Not a route — the underscore prefix prevents Next.js from treating this as a page.

export const C = {
  R: "#E74C3C",
  Y: "#F1C40F",
  G: "#2ECC71",
  B: "#3498DB",
  P: "#9B59B6",
  W: "#FFFFFF",
} as const;

export type ColorKey = keyof typeof C;

export const CELL = 40;
export const GAP = 4;
export const PAD = 4;
const RX_TILE = 9;
const RX_CELL = 5;

export function tileWidth(n: number) {
  return n * CELL + (n - 1) * GAP + PAD * 2;
}
export function tileHeight() {
  return CELL + PAD * 2;
}

export function Cell({
  color,
  x,
  y,
  size = CELL,
}: {
  color: ColorKey;
  x: number;
  y: number;
  size?: number;
}) {
  const fill = C[color];
  return (
    <>
      <rect x={x} y={y} width={size} height={size} rx={RX_CELL} fill={fill} />
      {color === "W" && (
        <circle
          cx={x + size / 2}
          cy={y + size / 2}
          r={size * 0.3}
          fill="none"
          stroke="#555555"
          strokeWidth={2.5}
        />
      )}
    </>
  );
}

export function Tile({
  cells,
  tx = 0,
  ty = 0,
  highlight = false,
}: {
  cells: ColorKey[];
  tx?: number;
  ty?: number;
  highlight?: boolean;
}) {
  const w = tileWidth(cells.length);
  const h = tileHeight();
  return (
    <g transform={`translate(${tx},${ty})`}>
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={RX_TILE}
        fill="#0f1218"
        stroke={highlight ? "#4ade80" : "#3a4256"}
        strokeWidth={highlight ? 2.5 : 1.5}
      />
      {cells.map((c, i) => (
        <Cell
          key={i}
          color={c}
          x={PAD + i * (CELL + GAP)}
          y={PAD}
          size={CELL}
        />
      ))}
    </g>
  );
}

export function TileAnatomy({
  cellLabel,
  tileLabel,
}: {
  cellLabel: (n: number) => string;
  tileLabel: string;
}) {
  const cells: ColorKey[] = ["R", "G", "B"];
  const w = tileWidth(3);
  const h = tileHeight();
  const svgW = w + 60;
  const svgH = h + 70;
  const tx = 30;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-90"
      aria-label={tileLabel}
    >
      <Tile cells={cells} tx={tx} ty={8} />
      {cells.map((_, i) => {
        const cx = tx + PAD + i * (CELL + GAP) + CELL / 2;
        const cy = 8 + h + 14;
        return (
          <text
            key={i}
            x={cx}
            y={cy}
            textAnchor="middle"
            fontSize={11}
            fill="#aaaaaa"
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {cellLabel(i + 1)}
          </text>
        );
      })}
      <text
        x={tx + w / 2}
        y={8 + h + 42}
        textAnchor="middle"
        fontSize={12}
        fill="#888888"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {tileLabel}
      </text>
    </svg>
  );
}

export function ColorSwatches({
  colorDefs,
  ariaLabel,
}: {
  colorDefs: { key: ColorKey; label: string }[];
  ariaLabel: string;
}) {
  const SIZE = 44;
  const HGAP = 14;
  const cols = colorDefs.length;
  const svgW = cols * SIZE + (cols - 1) * HGAP;
  const svgH = SIZE + 36;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-120"
      aria-label={ariaLabel}
    >
      {colorDefs.map(({ key, label }, i) => {
        const x = i * (SIZE + HGAP);
        return (
          <g key={key}>
            <rect
              x={x}
              y={0}
              width={SIZE}
              height={SIZE}
              rx={8}
              fill={C[key]}
              stroke="#3a4256"
              strokeWidth={1}
            />
            {key === "W" && (
              <circle
                cx={x + SIZE / 2}
                cy={SIZE / 2}
                r={SIZE * 0.28}
                fill="none"
                stroke="#555555"
                strokeWidth={2.5}
              />
            )}
            <text
              x={x + SIZE / 2}
              y={SIZE + 18}
              textAnchor="middle"
              fontSize={11}
              fill="#aaaaaa"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function PlacementExamples({
  ariaLabel,
  validLabel,
  validAnnotation,
  invalidLabel,
  invalidAnnotation,
}: {
  ariaLabel: string;
  validLabel: string;
  validAnnotation: string;
  invalidLabel: string;
  invalidAnnotation: string;
}) {
  const STEP = CELL + GAP;
  const BOARD_COLS = 5;
  const BOARD_ROWS = 2;
  const BOARD_PAD = 10;

  const boardW = BOARD_COLS * STEP - GAP + BOARD_PAD * 2;
  const boardH = BOARD_ROWS * STEP - GAP + BOARD_PAD * 2;

  const PANEL_GAP = 40;
  const LABEL_H = 28;
  const ANNOT_H = 36;

  const svgW = boardW * 2 + PANEL_GAP;
  const svgH = LABEL_H + boardH + ANNOT_H;

  function gridX(col: number) {
    return BOARD_PAD + col * STEP;
  }
  function gridY(row: number) {
    return LABEL_H + BOARD_PAD + row * STEP;
  }

  const existingCells: ColorKey[] = ["R", "G", "B"];
  const validCells: ColorKey[] = ["G", "B", "P"];
  const invalidCells: ColorKey[] = ["Y", "G", "B"];

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-140"
      aria-label={ariaLabel}
    >
      <g>
        <rect
          x={0}
          y={LABEL_H}
          width={boardW}
          height={boardH}
          rx={10}
          fill="#141820"
          stroke="#2a2f3a"
          strokeWidth={1.5}
        />
        {existingCells.map((c, i) => (
          <Cell key={i} color={c} x={gridX(1 + i)} y={gridY(0)} />
        ))}
        {validCells.map((c, i) => (
          <Cell key={i} color={c} x={gridX(2 + i)} y={gridY(1)} />
        ))}
        {[0, 1].map((i) => {
          const cx = gridX(2 + i) + CELL / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={gridY(0) + CELL + 1}
              x2={cx}
              y2={gridY(1) - 1}
              stroke="#4ade80"
              strokeWidth={2}
              strokeDasharray="3 2"
            />
          );
        })}
        <text
          x={boardW / 2}
          y={LABEL_H - 7}
          textAnchor="middle"
          fontSize={13}
          fontWeight="600"
          fill="#4ade80"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {validLabel}
        </text>
        <text
          x={boardW / 2}
          y={LABEL_H + boardH + 20}
          textAnchor="middle"
          fontSize={11}
          fill="#aaaaaa"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {validAnnotation}
        </text>
      </g>
      <g transform={`translate(${boardW + PANEL_GAP}, 0)`}>
        <rect
          x={0}
          y={LABEL_H}
          width={boardW}
          height={boardH}
          rx={10}
          fill="#141820"
          stroke="#2a2f3a"
          strokeWidth={1.5}
        />
        {existingCells.map((c, i) => (
          <Cell key={i} color={c} x={gridX(1 + i)} y={gridY(0)} />
        ))}
        {invalidCells.map((c, i) => (
          <Cell key={i} color={c} x={gridX(1 + i)} y={gridY(1)} />
        ))}
        <line
          x1={gridX(1) + CELL / 2}
          y1={gridY(0) + CELL + 1}
          x2={gridX(1) + CELL / 2}
          y2={gridY(1) - 1}
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        <text
          x={gridX(1) + CELL / 2}
          y={gridY(0) + CELL + 9}
          textAnchor="middle"
          fontSize={13}
          fill="#dc2626"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          ✕
        </text>
        {[1, 2].map((i) => {
          const cx = gridX(1 + i) + CELL / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={gridY(0) + CELL + 1}
              x2={cx}
              y2={gridY(1) - 1}
              stroke="#4ade80"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          );
        })}
        <text
          x={boardW / 2}
          y={LABEL_H - 7}
          textAnchor="middle"
          fontSize={13}
          fontWeight="600"
          fill="#dc2626"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {invalidLabel}
        </text>
        <text
          x={boardW / 2}
          y={LABEL_H + boardH + 20}
          textAnchor="middle"
          fontSize={11}
          fill="#aaaaaa"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          {invalidAnnotation}
        </text>
      </g>
    </svg>
  );
}

export function WildTileIllustration({
  ariaLabel,
  wildLabel,
  wildCellNote,
  neighborLabel,
}: {
  ariaLabel: string;
  wildLabel: string;
  wildCellNote: string;
  neighborLabel: string;
}) {
  const wildCells: ColorKey[] = ["B", "W", "Y"];
  const w = tileWidth(3);
  const h = tileHeight();
  const neighborLeft: ColorKey = "R";

  const svgW = w + 140;
  const svgH = h + 80;
  const tx = 70;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-100"
      aria-label={ariaLabel}
    >
      <Tile cells={wildCells} tx={tx} ty={8} highlight />
      <text
        x={tx + w / 2}
        y={8 + h + 18}
        textAnchor="middle"
        fontSize={11}
        fill="#aaaaaa"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {wildLabel}
      </text>
      {(() => {
        const cellCenterX = tx + PAD + 1 * (CELL + GAP) + CELL / 2;
        return (
          <>
            <line
              x1={cellCenterX}
              y1={8 + h + 30}
              x2={cellCenterX}
              y2={8 + h + 55}
              stroke="#4ade80"
              strokeWidth={1.5}
            />
            <text
              x={cellCenterX}
              y={8 + h + 68}
              textAnchor="middle"
              fontSize={11}
              fill="#4ade80"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {wildCellNote}
            </text>
          </>
        );
      })()}
      {(() => {
        const cellCenterX = tx + PAD + 1 * (CELL + GAP);
        const aboveY = 8 - GAP - CELL;
        if (aboveY < 0) return null;
        return (
          <>
            <Cell color={neighborLeft} x={cellCenterX} y={aboveY} />
            <text
              x={cellCenterX - 24}
              y={aboveY + CELL / 2 + 4}
              textAnchor="middle"
              fontSize={10}
              fill="#888888"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {neighborLabel}
            </text>
          </>
        );
      })()}
    </svg>
  );
}

export function TurnFlowDiagram({
  ariaLabel,
  centerLabel,
  canPlay,
  canPlaySub,
  cantPlay,
  cantPlaySub,
  bagEmpty,
  bagEmptySub,
}: {
  ariaLabel: string;
  centerLabel: string;
  canPlay: string;
  canPlaySub: string;
  cantPlay: string;
  cantPlaySub: string;
  bagEmpty: string;
  bagEmptySub: string;
}) {
  const svgW = 480;
  const svgH = 160;
  const BOX_W = 140;
  const BOX_H = 48;
  const BOX_RX = 8;

  const boxes = [
    {
      label: canPlay,
      sublabel: canPlaySub,
      x: 20,
      fill: "#1a2e1f",
      stroke: "#4ade80",
      textFill: "#4ade80",
    },
    {
      label: cantPlay,
      sublabel: cantPlaySub,
      x: 170,
      fill: "#222836",
      stroke: "#3498DB",
      textFill: "#3498DB",
    },
    {
      label: bagEmpty,
      sublabel: bagEmptySub,
      x: 320,
      fill: "#1f1a1a",
      stroke: "#888888",
      textFill: "#aaaaaa",
    },
  ];

  const centerY = svgH / 2;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-125"
      aria-label={ariaLabel}
    >
      <rect
        x={svgW / 2 - 54}
        y={centerY - 22}
        width={108}
        height={44}
        rx={BOX_RX}
        fill="#1b2028"
        stroke="#3a4256"
        strokeWidth={1.5}
      />
      <text
        x={svgW / 2}
        y={centerY + 6}
        textAnchor="middle"
        fontSize={13}
        fontWeight="600"
        fill="#eaeaea"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        {centerLabel}
      </text>
      {boxes.map(({ label, sublabel, x, fill, stroke, textFill }) => {
        const boxCenterX = x + BOX_W / 2;
        const boxY = centerY - BOX_H / 2;
        const arrowFromX = svgW / 2 + (boxCenterX < svgW / 2 ? -54 : 54);
        return (
          <g key={label}>
            <line
              x1={arrowFromX}
              y1={centerY}
              x2={boxCenterX > svgW / 2 ? x : x + BOX_W}
              y2={centerY}
              stroke="#3a4256"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
            <rect
              x={x}
              y={boxY}
              width={BOX_W}
              height={BOX_H}
              rx={BOX_RX}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
            />
            <text
              x={boxCenterX}
              y={centerY - 6}
              textAnchor="middle"
              fontSize={12}
              fontWeight="600"
              fill={textFill}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {label}
            </text>
            <text
              x={boxCenterX}
              y={centerY + 10}
              textAnchor="middle"
              fontSize={10}
              fill="#888888"
              fontFamily="ui-sans-serif, system-ui, sans-serif"
            >
              {sublabel}
            </text>
          </g>
        );
      })}
      <defs>
        <marker
          id="arrow"
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="#3a4256" />
        </marker>
      </defs>
    </svg>
  );
}

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-surface border border-border rounded-2xl p-5 flex flex-col gap-4"
    >
      <h2 className="m-0 text-[15px] font-semibold text-primary">{title}</h2>
      {children}
    </section>
  );
}

export function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-[14px] text-fg leading-relaxed list-none flex gap-2">
      <span className="text-primary shrink-0 mt-0.5">›</span>
      <span>{children}</span>
    </li>
  );
}

export function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] text-muted leading-relaxed">
      {children}
    </div>
  );
}
