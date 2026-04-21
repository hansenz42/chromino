import { describe, expect, it } from "vitest";
import { generateAllTiles } from "@/lib/tile-generator";

describe("tile generator", () => {
  const tiles = generateAllTiles();

  it("produces exactly 80 tiles", () => {
    expect(tiles).toHaveLength(80);
  });

  it("produces 75 basic + 5 wild", () => {
    expect(tiles.filter((t) => !t.isWild)).toHaveLength(75);
    expect(tiles.filter((t) => t.isWild)).toHaveLength(5);
  });

  it("assigns sequential ids 0..79", () => {
    tiles.forEach((t, i) => expect(t.id).toBe(i));
  });

  it("has no duplicate basic tiles (up to reflection)", () => {
    const keys = new Set<string>();
    for (const t of tiles.filter((tt) => !tt.isWild)) {
      const [a, b, c] = t.cells as string[];
      const k = [a, c].sort().join("|") + "|" + b;
      expect(keys.has(k)).toBe(false);
      keys.add(k);
    }
    expect(keys.size).toBe(75);
  });

  it("wild tiles have wild in the center", () => {
    for (const t of tiles.filter((tt) => tt.isWild)) {
      expect(t.cells[1]).toBe("wild");
      expect(t.cells[0]).not.toBe("wild");
      expect(t.cells[2]).not.toBe("wild");
    }
  });
});
