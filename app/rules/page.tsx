import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "游戏规则 · Chromino",
  description: "Chromino 彩色骨牌游戏完整规则说明，包含放置规则、回合流程、变体玩法等图文说明。",
};

// ─── Color constants ─────────────────────────────────────────────────────────
const C = {
  R: "#E74C3C",
  Y: "#F1C40F",
  G: "#2ECC71",
  B: "#3498DB",
  P: "#9B59B6",
  W: "#FFFFFF", // wild cell fill
} as const;

type ColorKey = keyof typeof C;

// ─── SVG building blocks ──────────────────────────────────────────────────────
const CELL = 40;
const GAP = 4;
const PAD = 4;
const RX_TILE = 9;
const RX_CELL = 5;

function tileWidth(n: number) {
  return n * CELL + (n - 1) * GAP + PAD * 2;
}
function tileHeight() {
  return CELL + PAD * 2;
}

/** A single color cell rendered as a filled rect (+ wild ring if W) */
function Cell({
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

/** A 1×N chromino tile */
function Tile({
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

// ─── Illustration 1: Tile Anatomy ─────────────────────────────────────────────
function TileAnatomy() {
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
      aria-label="骨米诺牌结构示意图"
    >
      {/* tile */}
      <Tile cells={cells} tx={tx} ty={8} />

      {/* labels under each cell */}
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
            色格 {i + 1}
          </text>
        );
      })}

      {/* "1×3 骨米诺" label */}
      <text
        x={tx + w / 2}
        y={8 + h + 42}
        textAnchor="middle"
        fontSize={12}
        fill="#888888"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        1×3 骨米诺（示例配色：红-绿-蓝）
      </text>
    </svg>
  );
}

// ─── Illustration 2: Color Swatches ──────────────────────────────────────────
const COLOR_DEFS: { key: ColorKey; label: string; name: string }[] = [
  { key: "R", label: "红", name: "Red" },
  { key: "Y", label: "黄", name: "Yellow" },
  { key: "G", label: "绿", name: "Green" },
  { key: "B", label: "蓝", name: "Blue" },
  { key: "P", label: "紫", name: "Purple" },
  { key: "W", label: "百搭 ◎", name: "Wild" },
];

function ColorSwatches() {
  const SIZE = 44;
  const HGAP = 14;
  const cols = COLOR_DEFS.length;
  const svgW = cols * SIZE + (cols - 1) * HGAP;
  const svgH = SIZE + 36;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-120"
      aria-label="Chromino 颜色定义"
    >
      {COLOR_DEFS.map(({ key, label }, i) => {
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

// ─── Illustration 3: Placement Examples ──────────────────────────────────────
/**
 * Shows a mini board grid with tiles placed.
 * Valid: new tile is offset so only 2 cells are adjacent, both matching.
 * Invalid: new tile directly below, one adjacent cell mismatches.
 */
function PlacementExamples() {
  // Grid cell = same CELL size
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

  // Existing tile for both panels: R-G-B at cols 1,2,3 row 0
  const existingCells: ColorKey[] = ["R", "G", "B"];
  // Valid new tile: G-B-P at cols 2,3,4 row 1 (G↔G, B↔B match)
  const validCells: ColorKey[] = ["G", "B", "P"];
  // Invalid new tile: Y-G-B at cols 1,2,3 row 1 (Y≠R mismatch, G↔G, B↔B)
  const invalidCells: ColorKey[] = ["Y", "G", "B"];

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-140"
      aria-label="放置规则示例：合法与非法"
    >
      {/* ── Left panel: Valid ─────────────── */}
      <g>
        {/* board bg */}
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
        {/* existing tile (row 0, cols 1-3) */}
        {existingCells.map((c, i) => (
          <Cell
            key={i}
            color={c}
            x={gridX(1 + i)}
            y={gridY(0)}
          />
        ))}
        {/* new tile (row 1, cols 2-4) — highlighted */}
        {validCells.map((c, i) => (
          <Cell
            key={i}
            color={c}
            x={gridX(2 + i)}
            y={gridY(1)}
          />
        ))}
        {/* match indicator lines between G-G and B-B */}
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
        {/* ✅ label */}
        <text
          x={boardW / 2}
          y={LABEL_H - 7}
          textAnchor="middle"
          fontSize={13}
          fontWeight="600"
          fill="#4ade80"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          ✅ 合法放置
        </text>
        {/* annotation */}
        <text
          x={boardW / 2}
          y={LABEL_H + boardH + 20}
          textAnchor="middle"
          fontSize={11}
          fill="#aaaaaa"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          2 个相邻色格颜色一致（绿-绿、蓝-蓝）
        </text>
      </g>

      {/* ── Right panel: Invalid ─────────── */}
      <g transform={`translate(${boardW + PANEL_GAP}, 0)`}>
        {/* board bg */}
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
        {/* existing tile (row 0, cols 1-3) */}
        {existingCells.map((c, i) => (
          <Cell
            key={i}
            color={c}
            x={gridX(1 + i)}
            y={gridY(0)}
          />
        ))}
        {/* new tile (row 1, cols 1-3) — same position */}
        {invalidCells.map((c, i) => (
          <Cell
            key={i}
            color={c}
            x={gridX(1 + i)}
            y={gridY(1)}
          />
        ))}
        {/* mismatch indicator: col 1 (Y≠R) */}
        <line
          x1={gridX(1) + CELL / 2}
          y1={gridY(0) + CELL + 1}
          x2={gridX(1) + CELL / 2}
          y2={gridY(1) - 1}
          stroke="#dc2626"
          strokeWidth={2}
          strokeDasharray="3 2"
        />
        {/* ✗ cross at mismatch */}
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
        {/* match indicators for the two matching cells */}
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
        {/* ✗ label */}
        <text
          x={boardW / 2}
          y={LABEL_H - 7}
          textAnchor="middle"
          fontSize={13}
          fontWeight="600"
          fill="#dc2626"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          ✗ 非法放置
        </text>
        {/* annotation */}
        <text
          x={boardW / 2}
          y={LABEL_H + boardH + 20}
          textAnchor="middle"
          fontSize={11}
          fill="#aaaaaa"
          fontFamily="ui-sans-serif, system-ui, sans-serif"
        >
          黄 ≠ 红，相邻色格不一致
        </text>
      </g>
    </svg>
  );
}

// ─── Illustration 4: Wild Tile ────────────────────────────────────────────────
function WildTileIllustration() {
  // Show: [R] [◎] [B] wild tile adjacent to two different-color tiles
  // Left tile: [P][P][R] pointing its right side to the wild tile's left
  // Right tile: [B][B][G] pointing its left side to the wild tile's right
  // Wild tile center ◎ touches R from left tile and B from right tile... wait
  // Actually the wild tile is W1: B-◎-Y (two end colors B and Y, center is wild)
  // Let's show: how ◎ can touch different colors on both sides

  // Layout: three tiles in a row (horizontal arrangement is tricky)
  // Better: show a simpler case — ◎ in center touching two different-colored cells
  // from neighboring tiles (above and below)

  // Simplified: show just the single wild tile [B][◎][Y] with annotations
  const wildCells: ColorKey[] = ["B", "W", "Y"];
  const w = tileWidth(3);
  const h = tileHeight();

  // Show two neighbor cells adjacent to the ◎:
  const neighborLeft: ColorKey = "R";
  const neighborRight: ColorKey = "G";

  const svgW = w + 140;
  const svgH = h + 80;
  const tx = 70;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-100"
      aria-label="百搭骨米诺示意图"
    >
      {/* main wild tile */}
      <Tile cells={wildCells} tx={tx} ty={8} highlight />

      {/* label: "百搭骨米诺 W1：蓝-◎-黄" */}
      <text
        x={tx + w / 2}
        y={8 + h + 18}
        textAnchor="middle"
        fontSize={11}
        fill="#aaaaaa"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        百搭骨米诺（示例：蓝-◎-黄）
      </text>

      {/* ◎ label pointing to center cell */}
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
              ◎ 可与任意颜色相邻
            </text>
          </>
        );
      })()}

      {/* neighbor tiles above and below the center ◎ — vertical neighbors */}
      {/* Left neighbor cell (above center ◎, color R) */}
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
              红
            </text>
          </>
        );
      })()}
    </svg>
  );
}

// ─── Illustration 5: Turn Flow ────────────────────────────────────────────────
function TurnFlowDiagram() {
  const svgW = 480;
  const svgH = 160;
  const BOX_W = 140;
  const BOX_H = 48;
  const BOX_RX = 8;

  const boxes = [
    { label: "能出牌", sublabel: "打出 1 块骨米诺", x: 20, fill: "#1a2e1f", stroke: "#4ade80", textFill: "#4ade80" },
    { label: "不能出牌", sublabel: "从袋中抽 1 块", x: 170, fill: "#222836", stroke: "#3498DB", textFill: "#3498DB" },
    { label: "袋空 + 不能出", sublabel: "本回合 Pass", x: 320, fill: "#1f1a1a", stroke: "#888888", textFill: "#aaaaaa" },
  ];

  const centerY = svgH / 2;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full max-w-125"
      aria-label="回合行动选项示意图"
    >
      {/* "您的回合" center node */}
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
        您的回合
      </text>

      {/* outcome boxes + arrows */}
      {boxes.map(({ label, sublabel, x, fill, stroke, textFill }) => {
        const boxCenterX = x + BOX_W / 2;
        const boxY = centerY - BOX_H / 2;
        const arrowFromX = svgW / 2 + (boxCenterX < svgW / 2 ? -54 : 54);

        return (
          <g key={label}>
            {/* arrow */}
            <line
              x1={arrowFromX}
              y1={centerY}
              x2={boxCenterX > svgW / 2 ? x : x + BOX_W}
              y2={centerY}
              stroke="#3a4256"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
            {/* box */}
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
        <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
          <path d="M0,0 L0,6 L8,3 z" fill="#3a4256" />
        </marker>
      </defs>
    </svg>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
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

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <li className="text-[14px] text-fg leading-relaxed list-none flex gap-2">
      <span className="text-primary shrink-0 mt-0.5">›</span>
      <span>{children}</span>
    </li>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-[13px] text-muted leading-relaxed">
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RulesPage() {
  return (
    <div className="min-h-dvh bg-bg text-fg">
      {/* ── sticky top bar ─── */}
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-subtle text-[13px] no-underline hover:text-fg transition-colors flex items-center gap-1"
        >
          ← 首页
        </Link>
        <span className="text-border">|</span>
        <h1 className="m-0 text-[15px] font-semibold">游戏规则</h1>
      </header>

      {/* ── content ─── */}
      <main className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-5">

        {/* ── 游戏目标 ── */}
        <Section id="goal" title="一、游戏目标">
          <p className="m-0 text-[14px] text-fg leading-relaxed">
            每位玩家从布袋中随机抽取 <strong>8 块</strong>骨米诺作为手牌，轮流将手牌中的骨米诺放置到棋盘上。
          </p>
          <p className="m-0 text-[14px] text-fg leading-relaxed">
            <strong className="text-primary">第一位打出手中所有骨米诺的玩家获胜。</strong>
          </p>
          <InfoBox>
            适合年龄：6 岁以上 · 游戏人数：1–8 人
          </InfoBox>
        </Section>

        {/* ── 游戏配件 ── */}
        <Section id="components" title="二、游戏配件">
          <div className="flex flex-col gap-2">
            <ul className="m-0 p-0 flex flex-col gap-1.5">
              <Rule><strong>基础骨米诺</strong>：75 块，每块由 3 个色格（1×3 矩形）组成，颜色取自 5 种颜色</Rule>
              <Rule><strong>百搭骨米诺（Chameleon）</strong>：5 块，两端为普通颜色，中间带有 ◎ 标记，可与任意颜色相邻</Rule>
              <Rule><strong>布袋</strong>：1 个，用于存放和随机抽取骨米诺</Rule>
            </ul>
          </div>
          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">骨米诺牌结构</span>
            <TileAnatomy />
          </div>
          <InfoBox>
            每块骨米诺是 1×3 的矩形，包含 3 个相邻色格。放置时可任意旋转（横向或纵向），但不能斜放。
          </InfoBox>
        </Section>

        {/* ── 颜色定义 ── */}
        <Section id="colors" title="三、颜色定义">
          <p className="m-0 text-[14px] text-muted">
            共 5 种普通颜色，加 1 种百搭色格（◎）：
          </p>
          <div className="flex justify-start">
            <ColorSwatches />
          </div>
          <InfoBox>
            百搭色格（◎）：白底加圆环标记，可与<strong>任意颜色</strong>相邻，无需颜色匹配。
          </InfoBox>
        </Section>

        {/* ── 游戏准备 ── */}
        <Section id="setup" title="四、游戏准备">
          <ol className="m-0 p-0 flex flex-col gap-2">
            {[
              "随机取出 1 块百搭骨米诺，颜色面朝上放于桌面中央，作为第一块骨米诺。",
              "将其余所有骨米诺（74 块基础 + 4 块百搭）放入布袋中充分混洗。",
              "每位玩家从袋中盲抽 8 块骨米诺作为手牌，仅自己可见，不可让其他玩家看到。",
              "年纪最小的玩家先行（或随机选定），之后按顺时针方向轮流。",
            ].map((text, i) => (
              <li key={i} className="flex gap-3 text-[14px] text-fg leading-relaxed list-none">
                <span className="shrink-0 w-6 h-6 rounded-full bg-primary-bg border border-primary text-primary text-[12px] flex items-center justify-center font-semibold">
                  {i + 1}
                </span>
                <span className="pt-0.5">{text}</span>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── 放置规则 ── */}
        <Section id="placement" title="五、放置规则（核心）">
          <div className="flex flex-col gap-3">
            <p className="m-0 text-[14px] text-fg leading-relaxed font-semibold">
              放置一块骨米诺时，必须同时满足：
            </p>
            <ul className="m-0 p-0 flex flex-col gap-2">
              <Rule>
                与场上已有骨米诺<strong>至少相邻 2 个色格</strong>
              </Rule>
              <Rule>
                <strong>每一个</strong>相邻的色格颜色必须<strong>完全一致</strong>（百搭 ◎ 除外）
              </Rule>
            </ul>
          </div>

          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">放置示例</span>
            <PlacementExamples />
          </div>

          <InfoBox>
            <strong>方向与旋转</strong>：骨米诺可旋转 0°、90°、180°、270° 后放置，只能横向或纵向，不能斜放。
          </InfoBox>
        </Section>

        {/* ── 百搭骨米诺 ── */}
        <Section id="wild" title="六、百搭骨米诺（Chameleon）">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              百搭骨米诺的<strong>中央色格（◎）</strong>可与任意颜色相邻，甚至可同时与两个不同颜色相邻
            </Rule>
            <Rule>
              百搭骨米诺的<strong>两端色格</strong>为普通颜色，须遵循普通匹配规则
            </Rule>
          </ul>

          <div className="flex flex-col items-start gap-2">
            <span className="text-[12px] text-subtle">百搭骨米诺示意</span>
            <WildTileIllustration />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { id: "W1", cells: "蓝-◎-黄", hex: [C.B, "#fff", C.Y] },
              { id: "W2", cells: "紫-◎-黄", hex: [C.P, "#fff", C.Y] },
              { id: "W3", cells: "蓝-◎-绿", hex: [C.B, "#fff", C.G] },
              { id: "W4", cells: "紫-◎-红", hex: [C.P, "#fff", C.R] },
              { id: "W5", cells: "红-◎-绿", hex: [C.R, "#fff", C.G] },
            ].map(({ id, cells, hex }) => (
              <div
                key={id}
                className="flex items-center gap-3 bg-surface-2 border border-border rounded-xl px-3 py-2.5"
              >
                <span className="text-[11px] text-subtle w-6 shrink-0">{id}</span>
                <div className="flex gap-1">
                  {hex.map((color, i) => (
                    <div
                      key={i}
                      style={{ background: color }}
                      className="w-6 h-6 rounded flex items-center justify-center"
                    >
                      {i === 1 && (
                        <svg viewBox="0 0 24 24" className="w-4 h-4">
                          <circle cx="12" cy="12" r="5" fill="none" stroke="#555" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                  ))}
                </div>
                <span className="text-[12px] text-muted">{cells}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 游戏流程 ── */}
        <Section id="flow" title="七、游戏流程">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">每回合行动（二选一）</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-primary-bg border border-primary/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-primary">情况 A · 能出牌</span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    从手牌中打出<strong className="text-fg"> 恰好 1 块</strong>骨米诺，满足放置规则，回合结束。
                  </span>
                </div>
                <div className="bg-[#1e1e2e] border border-[#3498DB]/40 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-[13px] font-semibold text-[#3498DB]">情况 B · 不能出牌</span>
                  <span className="text-[13px] text-muted leading-relaxed">
                    从袋中<strong className="text-fg">抽 1 块</strong>。若可打出则立即打出；若仍不能，保留该牌，回合结束。
                  </span>
                </div>
              </div>
              <InfoBox>
                若袋中已无骨米诺且无法出牌，本回合<strong>跳过（Pass）</strong>。
              </InfoBox>
            </div>

            <div className="flex justify-start">
              <TurnFlowDiagram />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="m-0 text-[13px] font-semibold text-fg-2">特殊规则</h3>
              <ul className="m-0 p-0 flex flex-col gap-1.5">
                <Rule>
                  手中只剩 <strong>1 块</strong>时，必须<strong>公开展示</strong>该牌，让所有玩家看到
                </Rule>
                <Rule>
                  若最后 1 块恰好是<strong>百搭骨米诺</strong>，则<strong>不能</strong>用它出牌，必须先从袋中再抽 1 块
                </Rule>
              </ul>
            </div>
          </div>
        </Section>

        {/* ── 游戏结束 ── */}
        <Section id="end" title="八、游戏结束">
          <ul className="m-0 p-0 flex flex-col gap-1.5">
            <Rule>
              <strong>第一位打出所有骨米诺</strong>的玩家胜出，游戏不立即停止
            </Rule>
            <Rule>
              其他玩家各再进行<strong>一次行动</strong>
            </Rule>
            <Rule>
              若在最后一轮还有玩家也打完手牌，则<strong>共同获胜</strong>
            </Rule>
          </ul>
        </Section>

        {/* ── 变体规则 ── */}
        <Section id="variants" title="九、变体规则（可选）">
          <div className="flex flex-col gap-4">
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">抽牌变体</h3>
              <div className="flex flex-col gap-2">
                {[
                  { name: "基础（默认）", desc: "无法出牌时抽 1 张；抽到可打出则立即打出，否则保留" },
                  { name: "一直抽", desc: "无法出牌时持续抽牌，直到抽出一张可以打出的骨米诺" },
                  { name: "限量抽", desc: "无法出牌时持续抽牌，最多抽 3–5 张（开局前自定数值）" },
                ].map(({ name, desc }) => (
                  <div key={name} className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5">
                    <span className="font-semibold text-fg shrink-0 w-20">{name}</span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="m-0 mb-2 text-[13px] font-semibold text-fg-2">其他变体</h3>
              <div className="flex flex-col gap-2">
                {[
                  { name: "公开手牌", desc: "所有玩家公开手牌，任何人都可自由查看" },
                  { name: "简单模式", desc: "放置时只需与场上至少 1 个色格相邻且颜色匹配（适合教学或低龄玩家）" },
                ].map(({ name, desc }) => (
                  <div key={name} className="flex gap-3 items-start text-[13px] bg-surface-2 border border-border rounded-xl px-3 py-2.5">
                    <span className="font-semibold text-fg shrink-0 w-20">{name}</span>
                    <span className="text-muted leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 规则速查 ── */}
        <Section id="quickref" title="十、规则速查">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <tbody>
                {[
                  ["手牌初始数量", "每人 8 块"],
                  ["每回合出牌数", "恰好 1 块"],
                  ["放置最少相邻色格数", "2 个（简单模式为 1 个）"],
                  ["相邻色格必须同色", "是（百搭 ◎ 除外）"],
                  ["无法出牌时", "从袋中抽 1 块（基础规则）"],
                  ["最后 1 张须展示", "是"],
                  ["最后 1 张为百搭时", "不能出，必须先再抽 1 块"],
                  ["获胜条件", "率先打完所有手牌"],
                ].map(([key, val], i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-surface-2" : ""}>
                    <td className="px-3 py-2 text-muted rounded-l-md border-b border-border">{key}</td>
                    <td className="px-3 py-2 text-fg font-medium rounded-r-md border-b border-border">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* back to home */}
        <div className="flex justify-center pb-4">
          <Link
            href="/"
            className="text-[13px] text-subtle no-underline hover:text-fg transition-colors"
          >
            ← 返回首页，开始游戏
          </Link>
        </div>
      </main>
    </div>
  );
}
