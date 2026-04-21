import type { Cell, Color, Tile } from "./types";
import { COLORS } from "./colors";

/**
 * The 5 wild (Chameleon) tiles, from the physical game photo.
 * Order: [endA, wild, endB].
 */
const WILD_TILES: Array<[Color, Color]> = [
  ["blue", "yellow"],
  ["purple", "yellow"],
  ["blue", "green"],
  ["purple", "red"],
  ["red", "green"],
];

/**
 * Generate the canonical full 80-tile Chromino set:
 * - 75 basic tiles (each unique up to reflection)
 * - 5 wild tiles
 *
 * IDs are stable: 0..74 for basic tiles, 75..79 for wild tiles.
 */
export function generateAllTiles(): Tile[] {
  const tiles: Tile[] = [];
  const seen = new Set<string>();
  const order = new Map<Color, number>(COLORS.map((c, i) => [c, i]));

  for (const a of COLORS) {
    for (const b of COLORS) {
      for (const c of COLORS) {
        // Canonical form: smaller end first (palindromes map to themselves).
        const [l, m, r] =
          order.get(a)! <= order.get(c)! ? [a, b, c] : [c, b, a];
        const key = `${l}-${m}-${r}`;
        if (seen.has(key)) continue;
        seen.add(key);
        tiles.push({
          id: tiles.length,
          cells: [l, m, r] as [Cell, Cell, Cell],
          isWild: false,
        });
      }
    }
  }

  // 5 wild tiles, center = 'wild'.
  for (const [endA, endB] of WILD_TILES) {
    tiles.push({
      id: tiles.length,
      cells: [endA, "wild", endB] as [Cell, Cell, Cell],
      isWild: true,
    });
  }

  return tiles;
}

/** Retrieve a tile by its id from a tile list. Throws if not found. */
export function getTile(tiles: Tile[], id: number): Tile {
  const t = tiles[id];
  if (!t || t.id !== id) {
    throw new Error(`Tile id ${id} not found`);
  }
  return t;
}
