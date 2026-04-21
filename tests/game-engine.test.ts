import { describe, expect, it } from "vitest";
import {
  initGame,
  applyPlayMove,
  applyDrawMove,
  hasAnyLegalPlay,
} from "@/lib/game-engine";
import { generateAllTiles } from "@/lib/tile-generator";

const TILES = generateAllTiles();

describe("game engine", () => {
  it("initialises with start tile placed and 8 tiles dealt per player", () => {
    const state = initGame({
      code: "ABCDEF",
      players: [
        { id: "p1", name: "Alice", isAI: false, isHost: true },
        { id: "p2", name: "Bob", isAI: false, isHost: false },
      ],
      seed: "test-seed-1",
    });
    expect(state.phase).toBe("playing");
    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(8);
    expect(state.players[1].hand).toHaveLength(8);
    expect(state.placed).toHaveLength(1);
    expect(state.placed[0].cells[1]).toBe("wild");
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.version).toBe(1);
    // Remaining bag: 80 - 1 start - 2*8 = 63
    expect(state.bag).toHaveLength(63);
  });

  it("rejects out-of-turn plays", () => {
    const state = initGame({
      code: "TURNS1",
      players: [
        { id: "p1", name: "A", isAI: false, isHost: true },
        { id: "p2", name: "B", isAI: false, isHost: false },
      ],
      seed: "turns",
    });
    const firstTile = state.players[1].hand[0];
    const res = applyPlayMove(
      state,
      "p2",
      {
        type: "play",
        tileId: firstTile.id,
        x: 10,
        y: 10,
        orientation: "h",
        flip: false,
      },
      TILES,
    );
    expect(res.ok).toBe(false);
  });

  it("applyDrawMove refuses when a legal play exists", () => {
    const state = initGame({
      code: "DRAWCK",
      players: [
        { id: "p1", name: "A", isAI: false, isHost: true },
        { id: "p2", name: "B", isAI: false, isHost: false },
      ],
      seed: "draw-seed",
    });
    // If there is a legal play, draw must fail.
    if (hasAnyLegalPlay(state, "p1")) {
      const res = applyDrawMove(state, "p1");
      expect(res.ok).toBe(false);
    }
  });

  it("version increments on any successful move", () => {
    const state = initGame({
      code: "VERNUM",
      players: [
        { id: "p1", name: "A", isAI: false, isHost: true },
        { id: "p2", name: "B", isAI: false, isHost: false },
      ],
      seed: "ver",
    });
    const before = state.version;
    if (!hasAnyLegalPlay(state, "p1")) {
      const r = applyDrawMove(state, "p1");
      if (r.ok) expect(r.state.version).toBe(before + 1);
    }
  });
});
