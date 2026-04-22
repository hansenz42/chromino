"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { GameState, Move, Tile } from "@/lib/types";
import { cellFill } from "./Tile";
import {
  getValidPlacements,
  tileFootprint,
  validatePlacement,
} from "@/lib/placement-validator";
import { COLOR_HEX, WILD_BG, WILD_STROKE } from "@/lib/colors";
import { useGameStore } from "@/lib/game-store";

const CELL = 48;

const ZOOM_BTN_CLS =
  "inline-flex items-center justify-center rounded-md border border-border-2 " +
  "bg-surface-hover text-fg px-3 min-h-[36px] leading-none cursor-pointer " +
  "touch-manipulation select-none transition-colors " +
  "[&:not(:disabled)]:hover:bg-surface-hover-2";

export interface BoardProps {
  state: GameState;
  tiles: Tile[];
  /** If set, we highlight legal placements and handle click-to-place. */
  selectedTileId: number | null;
  /**
   * If provided, intercepts tile placements (remote mode).
   * When absent the store's `play()` is called directly (local mode).
   */
  onPlay?: (m: Move) => void;
}

export function Board({ state, tiles, selectedTileId, onPlay }: BoardProps) {
  const { selected, play, setBoardZoom, dragging } = useGameStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const hoverAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Touch / pointer tracking for pan + pinch-zoom
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistRef = useRef<number | null>(null);
  const panOriginRef = useRef<{
    px: number;
    py: number;
    panX: number;
    panY: number;
  } | null>(null);
  const hasPannedRef = useRef(false);
  // Tracks which pointers started on the board (not from a tile drag)
  const boardPointerIds = useRef(new Set<number>());
  // Last fit zoom level, used by reset button
  const fitZoomRef = useRef(1);

  const { minX, minY, maxX, maxY } = useMemo(() => {
    const keys = Object.keys(state.board);
    if (keys.length === 0) return { minX: -3, minY: -3, maxX: 3, maxY: 3 };
    let a = Infinity,
      b = Infinity,
      c = -Infinity,
      d = -Infinity;
    for (const k of keys) {
      const [xs, ys] = k.split(",");
      const x = Number(xs);
      const y = Number(ys);
      if (x < a) a = x;
      if (x > c) c = x;
      if (y < b) b = y;
      if (y > d) d = y;
    }
    return { minX: a - 4, minY: b - 4, maxX: c + 4, maxY: d + 4 };
  }, [state.board]);

  const widthCells = maxX - minX + 1;
  const heightCells = maxY - minY + 1;
  const width = widthCells * CELL;
  const height = heightCells * CELL;

  const selectedTile = selectedTileId !== null ? tiles[selectedTileId] : null;
  const candidates = useMemo(() => {
    if (!selectedTile || !selected) return [];
    return getValidPlacements(state, selectedTile).filter(
      (o) => o.orientation === selected.orientation && o.flip === selected.flip,
    );
  }, [state, selectedTile, selected]);

  // Auto-fit board to container on first mount, then center on the first tile
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch || !width || !height) return;
    const fz = Math.max(
      0.3,
      Math.min(1.0, Math.min(cw / width, ch / height) * 0.85),
    );
    fitZoomRef.current = fz;
    setZoom(fz);
    const latest = state.placed.at(-1);
    if (latest) {
      const isH = latest.orientation === "h";
      const wx = (latest.x + (isH ? 1.5 : 0.5)) * CELL - minX * CELL;
      const wy = (latest.y + (isH ? 0.5 : 1.5)) * CELL - minY * CELL;
      const wrapperLeft = Math.max(0, (cw - width) / 2);
      const wrapperTop = Math.max(0, (ch - height) / 2);
      setPan({
        x: cw / 2 - wrapperLeft - width / 2 - (wx - width / 2) * fz,
        y: ch / 2 - wrapperTop - height / 2 - (wy - height / 2) * fz,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the game store in sync so Hand can size the drag ghost correctly
  useEffect(() => {
    setBoardZoom(zoom);
  }, [zoom, setBoardZoom]);

  // Clear hover indicator when drag ends
  useEffect(() => {
    if (!dragging) {
      setHoverAnchor(null);
      hoverAnchorRef.current = null;
    }
  }, [dragging]);

  function onCellClick(cx: number, cy: number) {
    if (!selectedTile || !selected) return;
    const match = candidates.find((c) => c.x === cx && c.y === cy);
    if (!match) return;
    const m: Move = {
      type: "play",
      tileId: selectedTile.id,
      x: cx,
      y: cy,
      orientation: selected.orientation,
      flip: selected.flip,
    };
    if (onPlay) {
      onPlay(m);
    } else {
      play(m);
    }
  }

  // ── Pointer handlers (pan + pinch-zoom, works with mouse and touch) ──────

  function onBoardPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    boardPointerIds.current.add(e.pointerId);
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size === 1) {
      panOriginRef.current = {
        px: e.clientX,
        py: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
      hasPannedRef.current = false;
    } else if (activePointers.current.size === 2) {
      // Second finger down — switch to pinch mode, cancel single-finger pan
      panOriginRef.current = null;
      const pts = [...activePointers.current.values()];
      pinchDistRef.current = Math.hypot(
        pts[0].x - pts[1].x,
        pts[0].y - pts[1].y,
      );
    }
  }

  function onBoardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!boardPointerIds.current.has(e.pointerId)) return;
    activePointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.current.size >= 2 && pinchDistRef.current !== null) {
      // Pinch-to-zoom: ratio of new distance vs last distance
      const pts = [...activePointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDistRef.current > 0) {
        const ratio = dist / pinchDistRef.current;
        setZoom((z) => Math.max(0.3, Math.min(2.5, z * ratio)));
      }
      pinchDistRef.current = dist;
    } else if (activePointers.current.size === 1 && panOriginRef.current) {
      const dx = e.clientX - panOriginRef.current.px;
      const dy = e.clientY - panOriginRef.current.py;
      // Only commit to pan after crossing a small threshold (allows taps through)
      if (!hasPannedRef.current && Math.hypot(dx, dy) < 5) return;
      hasPannedRef.current = true;
      setPan({
        x: panOriginRef.current.panX + dx,
        y: panOriginRef.current.panY + dy,
      });
    }
  }

  function cleanupBoardPointer(pointerId: number) {
    boardPointerIds.current.delete(pointerId);
    activePointers.current.delete(pointerId);
    if (activePointers.current.size < 2) pinchDistRef.current = null;
    if (activePointers.current.size === 0) {
      panOriginRef.current = null;
      hasPannedRef.current = false;
    }
  }

  // ── Tile drop handler (no-assistance drag-and-drop) ──────────────────────

  function handleTileDrop(e: React.PointerEvent<HTMLDivElement>) {
    const store = useGameStore.getState();
    const { dragging } = store;
    if (!dragging || dragging.cancelling || !state.noAssistance) return;
    if (!svgRef.current) {
      store.cancelDrag();
      return;
    }
    const svgRect = svgRef.current.getBoundingClientRect();
    if (
      e.clientX < svgRect.left ||
      e.clientX > svgRect.right ||
      e.clientY < svgRect.top ||
      e.clientY > svgRect.bottom
    )
      return; // outside board — Hand's window.pointerup will cancel
    const tile = tiles[dragging.tileId];
    if (!tile) {
      store.cancelDrag();
      return;
    }
    const pixX = e.clientX - svgRect.left;
    const pixY = e.clientY - svgRect.top;
    const viewX = (pixX / svgRect.width) * width + minX * CELL;
    const viewY = (pixY / svgRect.height) * height + minY * CELL;
    const gridX = Math.floor(viewX / CELL);
    const gridY = Math.floor(viewY / CELL);
    const anchors: [number, number][] =
      dragging.orientation === "h"
        ? [
            [gridX - 1, gridY],
            [gridX, gridY],
            [gridX - 2, gridY],
          ]
        : [
            [gridX, gridY - 1],
            [gridX, gridY],
            [gridX, gridY - 2],
          ];
    for (const [ax, ay] of anchors) {
      if (
        validatePlacement(
          state,
          tile,
          ax,
          ay,
          dragging.orientation,
          dragging.flip,
        ).valid
      ) {
        if (onPlay) {
          onPlay({
            type: "play",
            tileId: dragging.tileId,
            x: ax,
            y: ay,
            orientation: dragging.orientation,
            flip: dragging.flip,
          });
          store.clearDrag();
          return;
        }
        const res = play({
          type: "play",
          tileId: dragging.tileId,
          x: ax,
          y: ay,
          orientation: dragging.orientation,
          flip: dragging.flip,
        });
        if (res.ok) {
          store.clearDrag();
          return;
        }
      }
    }
    store.cancelDrag();
  }

  // ── Drag hover indicator (no-assistance mode) ──────────────────────────

  function handleDragHover(e: React.PointerEvent<HTMLDivElement>) {
    if (!state.noAssistance || !dragging || dragging.cancelling) return;
    if (!svgRef.current) return;
    const svgRect = svgRef.current.getBoundingClientRect();
    if (
      e.clientX < svgRect.left ||
      e.clientX > svgRect.right ||
      e.clientY < svgRect.top ||
      e.clientY > svgRect.bottom
    ) {
      if (hoverAnchorRef.current !== null) {
        hoverAnchorRef.current = null;
        setHoverAnchor(null);
      }
      return;
    }
    const tile = tiles[dragging.tileId];
    if (!tile) return;
    const pixX = e.clientX - svgRect.left;
    const pixY = e.clientY - svgRect.top;
    const viewX = (pixX / svgRect.width) * width + minX * CELL;
    const viewY = (pixY / svgRect.height) * height + minY * CELL;
    const gridX = Math.floor(viewX / CELL);
    const gridY = Math.floor(viewY / CELL);
    const anchors: [number, number][] =
      dragging.orientation === "h"
        ? [
            [gridX - 1, gridY],
            [gridX, gridY],
            [gridX - 2, gridY],
          ]
        : [
            [gridX, gridY - 1],
            [gridX, gridY],
            [gridX, gridY - 2],
          ];
    // Use first valid anchor, or fall back to center-aligned grid position
    let targetX = dragging.orientation === "h" ? gridX - 1 : gridX;
    let targetY = dragging.orientation === "h" ? gridY : gridY - 1;
    for (const [ax, ay] of anchors) {
      if (
        validatePlacement(
          state,
          tile,
          ax,
          ay,
          dragging.orientation,
          dragging.flip,
        ).valid
      ) {
        targetX = ax;
        targetY = ay;
        break;
      }
    }
    if (
      hoverAnchorRef.current?.x !== targetX ||
      hoverAnchorRef.current?.y !== targetY
    ) {
      hoverAnchorRef.current = { x: targetX, y: targetY };
      setHoverAnchor({ x: targetX, y: targetY });
    }
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(2.5, z * delta)));
  }

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-surface-2 touch-none relative"
      onPointerDown={onBoardPointerDown}
      onPointerMove={(e) => {
        onBoardPointerMove(e);
        handleDragHover(e);
      }}
      onPointerLeave={() => {
        if (hoverAnchorRef.current !== null) {
          hoverAnchorRef.current = null;
          setHoverAnchor(null);
        }
      }}
      onPointerUp={(e) => {
        handleTileDrop(e);
        cleanupBoardPointer(e.pointerId);
      }}
      onPointerCancel={(e) => cleanupBoardPointer(e.pointerId)}
      onWheel={onWheel}
    >
      <div
        className="mx-auto origin-center"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          width,
          height,
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`${minX * CELL} ${minY * CELL} ${width} ${height}`}
        >
          <defs>
            <filter
              id="latest-tile-glow"
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation="6"
                result="blur"
              />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {state.placed.map((pt) => {
              const isH = pt.orientation === "h";
              return (
                <clipPath key={`cp-${pt.tileId}`} id={`cp-${pt.tileId}`}>
                  <rect
                    x={pt.x * CELL}
                    y={pt.y * CELL}
                    width={(isH ? 3 : 1) * CELL}
                    height={(isH ? 1 : 3) * CELL}
                    rx={6}
                  />
                </clipPath>
              );
            })}
          </defs>

          {/* Grid */}
          {Array.from({ length: widthCells + 1 }, (_, i) => (
            <line
              key={`vx${i}`}
              x1={(minX + i) * CELL}
              y1={minY * CELL}
              x2={(minX + i) * CELL}
              y2={(maxY + 1) * CELL}
              stroke="#222a36"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: heightCells + 1 }, (_, i) => (
            <line
              key={`hy${i}`}
              x1={minX * CELL}
              y1={(minY + i) * CELL}
              x2={(maxX + 1) * CELL}
              y2={(minY + i) * CELL}
              stroke="#222a36"
              strokeWidth={1}
            />
          ))}

          {/* Placed tiles — cells clipped to rounded tile shape, with outline */}
          {state.placed.map((pt, idx) => {
            const isLatest = idx === state.placed.length - 1;
            const isH = pt.orientation === "h";
            return (
              <g key={`tile-${pt.tileId}`}>
                <g clipPath={`url(#cp-${pt.tileId})`}>
                  {pt.cells.map((cell, i) => {
                    const cx = pt.x + (isH ? i : 0);
                    const cy = pt.y + (isH ? 0 : i);
                    return (
                      <g key={i}>
                        <rect
                          x={cx * CELL}
                          y={cy * CELL}
                          width={CELL}
                          height={CELL}
                          fill={cellFill(cell)}
                          stroke={cell === "wild" ? WILD_STROKE : "#111"}
                          strokeWidth={1}
                        />
                        {cell === "wild" && (
                          <circle
                            cx={cx * CELL + CELL / 2}
                            cy={cy * CELL + CELL / 2}
                            r={CELL * 0.22}
                            fill="none"
                            stroke={WILD_STROKE}
                            strokeWidth={2}
                          />
                        )}
                      </g>
                    );
                  })}
                </g>
                <rect
                  x={pt.x * CELL + 1}
                  y={pt.y * CELL + 1}
                  width={(isH ? 3 : 1) * CELL - 2}
                  height={(isH ? 1 : 3) * CELL - 2}
                  rx={6}
                  fill="none"
                  stroke={isLatest ? "#ffffff" : "rgba(255,255,255,0.45)"}
                  strokeWidth={isLatest ? 5 : 2}
                  filter={isLatest ? "url(#latest-tile-glow)" : undefined}
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* Candidate ghosts — hidden in no-assistance mode */}
          {!state.noAssistance &&
            candidates.map((c, idx) => {
              const fp = tileFootprint(c.x, c.y, c.orientation);
              return (
                <g key={`cand-${idx}`}>
                  {fp.map(([fx, fy], i) => (
                    <rect
                      key={i}
                      x={fx * CELL}
                      y={fy * CELL}
                      width={CELL}
                      height={CELL}
                      fill="#ffffff22"
                      stroke="#ffffff88"
                      strokeDasharray="4 3"
                      onClick={() => onCellClick(c.x, c.y)}
                      className="cursor-pointer"
                    />
                  ))}
                </g>
              );
            })}

          {/* Drag drop target indicator — no-assistance mode */}
          {state.noAssistance &&
            dragging &&
            !dragging.cancelling &&
            hoverAnchor &&
            (() => {
              const fp = tileFootprint(
                hoverAnchor.x,
                hoverAnchor.y,
                dragging.orientation,
              );
              return (
                <g pointerEvents="none">
                  {fp.map(([fx, fy], i) => (
                    <rect
                      key={i}
                      x={fx * CELL}
                      y={fy * CELL}
                      width={CELL}
                      height={CELL}
                      fill="rgba(255,255,255,0.08)"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                  ))}
                </g>
              );
            })()}
        </svg>
      </div>

      {/* Zoom controls — compact for mobile */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5">
        <button
          className={ZOOM_BTN_CLS + " text-lg"}
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.2))}
        >
          +
        </button>
        <button
          className={ZOOM_BTN_CLS + " text-lg"}
          onClick={() => setZoom((z) => Math.max(0.3, z / 1.2))}
        >
          −
        </button>
        <button
          className={ZOOM_BTN_CLS + " text-[13px] !px-2.5"}
          title="Reset view"
          onClick={() => {
            const z = fitZoomRef.current;
            const latest = state.placed.at(-1);
            if (!latest || !containerRef.current) {
              setZoom(z);
              setPan({ x: 0, y: 0 });
              return;
            }
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const isH = latest.orientation === "h";
            // Tile center in wrapper-local pixels
            const wx = (latest.x + (isH ? 1.5 : 0.5)) * CELL - minX * CELL;
            const wy = (latest.y + (isH ? 0.5 : 1.5)) * CELL - minY * CELL;
            // CSS `margin: 0 auto` resolves margin-left to 0 when wrapper > container.
            // wrapperLeft is 0 when overflowing, (cw-width)/2 when smaller.
            const wrapperLeft = Math.max(0, (cw - width) / 2);
            const wrapperTop = Math.max(0, (ch - height) / 2);
            // screen_x = wrapperLeft + width/2 + panX + (wx - width/2) * z  => solve for panX:
            setZoom(z);
            setPan({
              x: cw / 2 - wrapperLeft - width / 2 - (wx - width / 2) * z,
              y: ch / 2 - wrapperTop - height / 2 - (wy - height / 2) * z,
            });
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="4" />
            <line x1="12" y1="2" x2="12" y2="6" />
            <line x1="12" y1="18" x2="12" y2="22" />
            <line x1="2" y1="12" x2="6" y2="12" />
            <line x1="18" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
// used in Tile.tsx only — re-export for convenience
export const BOARD_CELL_SIZE = CELL;
void COLOR_HEX;
void WILD_BG;
