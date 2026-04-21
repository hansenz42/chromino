import type { Cell, GameState, Orientation, PlacedTile, Tile } from "./types";

export interface PlacementOption {
  tileId: number;
  x: number;
  y: number;
  orientation: Orientation;
  flip: boolean;
  /** Number of adjacent matching cells (≥ 2 for basic rule). */
  adjacentCount: number;
}

/** Cells produced when a tile is placed at (x, y) with given orientation + flip. */
export function tileCells(tile: Tile, flip: boolean): [Cell, Cell, Cell] {
  const [a, b, c] = tile.cells;
  return flip ? [c, b, a] : [a, b, c];
}

/** The three (x, y) coordinates a placed tile occupies. */
export function tileFootprint(
  x: number,
  y: number,
  orientation: Orientation,
): Array<[number, number]> {
  if (orientation === "h") {
    return [
      [x, y],
      [x + 1, y],
      [x + 2, y],
    ];
  }
  return [
    [x, y],
    [x, y + 1],
    [x, y + 2],
  ];
}

export function cellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * Two Chromino cells "match" when:
 *  - both are the same concrete color, OR
 *  - at least one of them is 'wild'
 */
export function cellsMatch(a: Cell, b: Cell): boolean {
  if (a === "wild" || b === "wild") return true;
  return a === b;
}

/**
 * Validate a placement. A placement is legal when:
 *  1. All 3 target cells are empty.
 *  2. Every cell of the new tile that has any existing neighbour (up/down/left/right)
 *     must match that neighbour's color (wild always matches).
 *  3. The total number of adjacent matching cells (between the new tile's cells
 *     and existing board cells) is at least 2.
 *
 * Note: "adjacent" in rule 3 counts a cell of the new tile as contributing for each
 * side that touches an existing cell. A new cell touching two existing cells of
 * matching color contributes 2.
 *
 * Returns { valid: true, adjacentCount } or { valid: false, reason }.
 */
export function validatePlacement(
  state: GameState,
  tile: Tile,
  x: number,
  y: number,
  orientation: Orientation,
  flip: boolean,
): { valid: true; adjacentCount: number } | { valid: false; reason: string } {
  const placed = tileCells(tile, flip);
  const footprint = tileFootprint(x, y, orientation);

  // 1. Footprint must be empty.
  for (const [cx, cy] of footprint) {
    if (state.board[cellKey(cx, cy)] !== undefined) {
      return { valid: false, reason: "cells occupied" };
    }
  }

  let adjacentCount = 0;
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];

  for (let i = 0; i < 3; i++) {
    const [cx, cy] = footprint[i];
    const self = placed[i];
    for (const [dx, dy] of dirs) {
      const nx = cx + dx;
      const ny = cy + dy;
      // Skip cells that belong to the same placement (internal edges).
      if (footprint.some(([fx, fy]) => fx === nx && fy === ny)) continue;
      const neighbour = state.board[cellKey(nx, ny)];
      if (neighbour === undefined) continue;
      if (!cellsMatch(self, neighbour)) {
        return {
          valid: false,
          reason: `color mismatch at (${nx},${ny}): ${self} vs ${neighbour}`,
        };
      }
      adjacentCount++;
    }
  }

  if (adjacentCount < 2) {
    return { valid: false, reason: "needs at least 2 adjacent matching cells" };
  }

  return { valid: true, adjacentCount };
}

/**
 * Enumerate all legal placements for a tile on the current board.
 * Search is bounded to the rectangle around currently placed cells
 * (expanded by 3 cells in every direction), which is tight enough to
 * contain every valid placement.
 */
export function getValidPlacements(
  state: GameState,
  tile: Tile,
): PlacementOption[] {
  const options: PlacementOption[] = [];
  const keys = Object.keys(state.board);
  if (keys.length === 0) return options;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const k of keys) {
    const [xs, ys] = k.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const pad = 3;
  const lo_x = minX - pad;
  const hi_x = maxX + pad;
  const lo_y = minY - pad;
  const hi_y = maxY + pad;

  const orientations: Orientation[] = ["h", "v"];
  const flipOptions = tile.cells[0] === tile.cells[2] ? [false] : [false, true];

  for (let y = lo_y; y <= hi_y; y++) {
    for (let x = lo_x; x <= hi_x; x++) {
      for (const orientation of orientations) {
        for (const flip of flipOptions) {
          const res = validatePlacement(state, tile, x, y, orientation, flip);
          if (res.valid) {
            options.push({
              tileId: tile.id,
              x,
              y,
              orientation,
              flip,
              adjacentCount: res.adjacentCount,
            });
          }
        }
      }
    }
  }
  return options;
}

/** Apply a validated placement to mutate a board copy. */
export function applyPlacement(
  board: Record<string, Cell>,
  placed: PlacedTile,
): Record<string, Cell> {
  const next = { ...board };
  const footprint = tileFootprint(placed.x, placed.y, placed.orientation);
  for (let i = 0; i < 3; i++) {
    const [cx, cy] = footprint[i];
    next[cellKey(cx, cy)] = placed.cells[i];
  }
  return next;
}
