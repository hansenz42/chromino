import type { GameState, Move, Tile } from "./types";
import { getValidPlacements } from "./placement-validator";
import { randInt } from "./rng";

/**
 * Choose the AI's move: enumerate all legal placements across all hand tiles,
 * pick the one with the highest adjacentCount (greedy). If multiple tie,
 * pick randomly among them. If no legal play, draw/pass.
 */
export function chooseAIMove(
  state: GameState,
  playerId: string,
  rng: () => number,
): Move {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error("player not found");

  type Candidate = { tile: Tile } & ReturnType<
    typeof getValidPlacements
  >[number];
  const candidates: Candidate[] = [];

  for (const tile of player.hand) {
    if (player.hand.length === 1 && tile.isWild) continue;
    for (const option of getValidPlacements(state, tile)) {
      candidates.push({ ...option, tile });
    }
  }

  if (candidates.length === 0) {
    return { type: "draw" };
  }

  let best = candidates[0].adjacentCount;
  for (const c of candidates)
    if (c.adjacentCount > best) best = c.adjacentCount;
  const top = candidates.filter((c) => c.adjacentCount === best);
  const pick = top[randInt(rng, top.length)];

  return {
    type: "play",
    tileId: pick.tile.id,
    x: pick.x,
    y: pick.y,
    orientation: pick.orientation,
    flip: pick.flip,
  };
}
