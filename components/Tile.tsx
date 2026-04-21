"use client";
import type { CSSProperties } from "react";
import type { Cell, Tile } from "@/lib/types";
import { COLOR_HEX, WILD_BG, WILD_STROKE } from "@/lib/colors";

export interface TileProps {
  tile: Tile;
  orientation?: "h" | "v";
  flip?: boolean;
  size?: number;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
}

export function cellFill(cell: Cell): string {
  return cell === "wild" ? WILD_BG : COLOR_HEX[cell];
}

export function TileSvg({
  tile,
  orientation = "h",
  flip = false,
  size = 48,
  selected,
  onClick,
  style,
}: TileProps) {
  const cells = flip
    ? ([...tile.cells].reverse() as typeof tile.cells)
    : tile.cells;
  const w = orientation === "h" ? size * 3 : size;
  const h = orientation === "h" ? size : size * 3;

  const rects = cells.map((c, i) => {
    const x = orientation === "h" ? i * size : 0;
    const y = orientation === "v" ? i * size : 0;
    return (
      <g key={i}>
        <rect
          x={x}
          y={y}
          width={size}
          height={size}
          fill={cellFill(c)}
          stroke={c === "wild" ? WILD_STROKE : "#222"}
          strokeWidth={c === "wild" ? 2 : 1}
        />
        {c === "wild" && (
          <circle
            cx={x + size / 2}
            cy={y + size / 2}
            r={size * 0.22}
            fill="none"
            stroke={WILD_STROKE}
            strokeWidth={2}
          />
        )}
      </g>
    );
  });

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      onClick={onClick}
      style={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: 4,
        overflow: "visible",
        ...style,
      }}
    >
      {selected && (
        <defs>
          <filter
            id={`glow-${tile.id}`}
            x="-30%"
            y="-30%"
            width="160%"
            height="160%"
          >
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 1 1 0 1  1 1 1 0 1  1 1 1 0 1  0 0 0 1 0"
              result="white-blur"
            />
            <feMerge>
              <feMergeNode in="white-blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      )}
      <g filter={selected ? `url(#glow-${tile.id})` : undefined}>{rects}</g>
      {selected && (
        <rect
          x={1}
          y={1}
          width={w - 2}
          height={h - 2}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          rx={3}
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
