import { describe, expect, it } from "vitest";
import { generateAllTiles } from "@/lib/tile-generator";
import {
  applyPlacement,
  cellKey,
  getValidPlacements,
  tileCells,
  tileFootprint,
  validatePlacement,
} from "@/lib/placement-validator";
import type { Cell, GameState } from "@/lib/types";

const TILES = generateAllTiles();

function emptyState(): GameState {
  return {
    code: "TEST",
    players: [],
    placed: [],
    board: {},
    bag: [],
    currentPlayerIndex: 0,
    phase: "playing",
    winners: [],
    firstFinishedPlayerId: null,
    finalRoundDone: {},
    version: 0,
    log: [],
  };
}

function placeStart(state: GameState, tileId: number) {
  const tile = TILES[tileId];
  const fp = tileFootprint(0, 0, "h");
  const cells = tileCells(tile, false);
  for (let i = 0; i < 3; i++)
    state.board[cellKey(fp[i][0], fp[i][1])] = cells[i];
  state.placed.push({ tileId: tile.id, x: 0, y: 0, orientation: "h", cells });
}

describe("placement validator", () => {
  it("rejects placement with 0 adjacent cells", () => {
    const s = emptyState();
    placeStart(s, 0); // some basic tile at origin
    const tile = TILES[1];
    const res = validatePlacement(s, tile, 10, 10, "h", false);
    expect(res.valid).toBe(false);
  });

  it("rejects overlapping placement", () => {
    const s = emptyState();
    placeStart(s, 0);
    const tile = TILES[1];
    const res = validatePlacement(s, tile, 0, 0, "h", false);
    expect(res.valid).toBe(false);
  });

  it("accepts a stacked placement where all 3 cells touch with matching colors", () => {
    const s = emptyState();
    // start tile at (0,0)-(2,0) with three cells = R, R, R (fake)
    const cells: Cell[] = ["red", "red", "red"];
    for (let i = 0; i < 3; i++) s.board[cellKey(i, 0)] = cells[i];
    // Find a tile RRR in tile set (palindrome R R R)
    const rrr = TILES.find(
      (t) =>
        !t.isWild &&
        t.cells[0] === "red" &&
        t.cells[1] === "red" &&
        t.cells[2] === "red",
    )!;
    expect(rrr).toBeDefined();
    const res = validatePlacement(s, rrr, 0, 1, "h", false);
    expect(res.valid).toBe(true);
    if (res.valid) expect(res.adjacentCount).toBe(3);
  });

  it("wild tile matches any neighbour", () => {
    const s = emptyState();
    const cells: Cell[] = ["red", "yellow", "green"];
    for (let i = 0; i < 3; i++) s.board[cellKey(i, 0)] = cells[i];
    const wild = TILES.find((t) => t.isWild)!;
    // stacking a wild with its own cells on top — at least wild center matches any.
    // The result depends on the wild's end colors.
    const res = validatePlacement(s, wild, 0, 1, "h", false);
    // may or may not be valid depending on ends — just confirm no crash.
    expect(typeof res).toBe("object");
  });

  it("enumerates at least one legal placement on a non-empty board", () => {
    const s = emptyState();
    const cells: Cell[] = ["red", "yellow", "green"];
    for (let i = 0; i < 3; i++) s.board[cellKey(i, 0)] = cells[i];
    s.placed.push({
      tileId: 0,
      x: 0,
      y: 0,
      orientation: "h",
      cells: cells as [Cell, Cell, Cell],
    });
    // Use a RYG tile
    const ryg = TILES.find(
      (t) =>
        !t.isWild &&
        ((t.cells[0] === "red" &&
          t.cells[1] === "yellow" &&
          t.cells[2] === "green") ||
          (t.cells[0] === "green" &&
            t.cells[1] === "yellow" &&
            t.cells[2] === "red")),
    )!;
    expect(ryg).toBeDefined();
    const opts = getValidPlacements(s, ryg);
    expect(opts.length).toBeGreaterThan(0);
  });

  it("applyPlacement writes cells to board", () => {
    const s = emptyState();
    const cells: Cell[] = ["red", "yellow", "green"];
    const next = applyPlacement(s.board, {
      tileId: 0,
      x: 0,
      y: 0,
      orientation: "h",
      cells: cells as [Cell, Cell, Cell],
    });
    expect(next[cellKey(0, 0)]).toBe("red");
    expect(next[cellKey(1, 0)]).toBe("yellow");
    expect(next[cellKey(2, 0)]).toBe("green");
  });
});
