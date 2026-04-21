import type {
  GameState,
  Move,
  PlacedTile,
  PlacementMove,
  Player,
  Tile,
} from "./types";
import { generateAllTiles } from "./tile-generator";
import { mulberry32, shuffle, strSeed } from "./rng";
import {
  applyPlacement,
  cellKey,
  getValidPlacements,
  tileCells,
  tileFootprint,
  validatePlacement,
} from "./placement-validator";

const INITIAL_HAND_SIZE = 8;

export interface InitGameOptions {
  code: string;
  players: Array<Omit<Player, "hand" | "connected">>;
  seed?: string;
  noAssistance?: boolean;
}

/**
 * Initialise a new game: shuffle the 80-tile pool, pick a random wild tile as
 * the starting tile (placed horizontally at origin), deal 8 tiles per player,
 * and set phase to 'playing'.
 */
export function initGame(opts: InitGameOptions): GameState {
  const allTiles = generateAllTiles();
  const seed = opts.seed ?? `${opts.code}:${Date.now()}`;
  const rng = mulberry32(strSeed(seed));

  const wildTiles = allTiles.filter((t) => t.isWild);
  const basicTiles = allTiles.filter((t) => !t.isWild);

  const startWildIndex = Math.floor(rng() * wildTiles.length);
  const startTile = wildTiles[startWildIndex];
  const remainingWilds = wildTiles.filter((_, i) => i !== startWildIndex);

  const bag = shuffle([...basicTiles, ...remainingWilds], rng);

  const players: Player[] = opts.players.map((p) => ({
    ...p,
    connected: true,
    hand: [],
  }));
  for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
    for (const p of players) {
      const t = bag.shift();
      if (!t) break;
      p.hand.push(t);
    }
  }

  const placedStart: PlacedTile = {
    tileId: startTile.id,
    x: 0,
    y: 0,
    orientation: "h",
    cells: startTile.cells,
  };
  const board: Record<string, import("./types").Cell> = {};
  const fp = tileFootprint(0, 0, "h");
  for (let i = 0; i < 3; i++) {
    board[cellKey(fp[i][0], fp[i][1])] = startTile.cells[i];
  }

  return {
    code: opts.code,
    players,
    placed: [placedStart],
    board,
    bag,
    currentPlayerIndex: 0,
    phase: "playing",
    winners: [],
    firstFinishedPlayerId: null,
    finalRoundDone: {},
    version: 1,
    log: ["游戏开始"],
    noAssistance: opts.noAssistance,
  };
}

/** Deep-clone a minimal subset of state so reducers stay pure. */
function cloneState(s: GameState): GameState {
  return {
    ...s,
    players: s.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    placed: s.placed.slice(),
    board: { ...s.board },
    bag: s.bag.slice(),
    winners: s.winners.slice(),
    finalRoundDone: { ...s.finalRoundDone },
    log: s.log.slice(),
  };
}

function currentPlayer(s: GameState): Player {
  return s.players[s.currentPlayerIndex];
}

function advanceTurn(s: GameState): void {
  s.currentPlayerIndex = (s.currentPlayerIndex + 1) % s.players.length;
}

/**
 * Check win/end conditions:
 *  - If a player just emptied their hand, they are first-finisher; others play one more action.
 *  - Game ends once every player has either taken a final-round action or also finished.
 */
function checkEndConditions(s: GameState, justPlayedId: string): void {
  const justPlayed = s.players.find((p) => p.id === justPlayedId)!;
  if (s.firstFinishedPlayerId === null && justPlayed.hand.length === 0) {
    s.firstFinishedPlayerId = justPlayed.id;
    s.winners = [justPlayed.id];
    s.finalRoundDone = { [justPlayed.id]: true };
    s.log.push(`${justPlayed.name} played their last tile; final round!`);
    return;
  }
  if (s.firstFinishedPlayerId !== null) {
    s.finalRoundDone[justPlayedId] = true;
    if (justPlayed.hand.length === 0 && !s.winners.includes(justPlayed.id)) {
      s.winners.push(justPlayed.id);
    }
    const allDone = s.players.every((p) => s.finalRoundDone[p.id]);
    if (allDone) {
      s.phase = "ended";
      s.log.push("Game over");
    }
  }
}

/** Can this player play any tile (considering every rotation + flip)? */
export function hasAnyLegalPlay(state: GameState, playerId: string): boolean {
  const p = state.players.find((pp) => pp.id === playerId);
  if (!p) return false;
  for (const t of p.hand) {
    if (getValidPlacements(state, t).length > 0) return true;
  }
  return false;
}

export interface MoveResult {
  state: GameState;
  ok: true;
}
export interface MoveError {
  ok: false;
  error: string;
}

export function applyPlayMove(
  state: GameState,
  playerId: string,
  move: PlacementMove,
  tilesLookup: Tile[],
): MoveResult | MoveError {
  if (state.phase !== "playing")
    return { ok: false, error: "game not playing" };
  if (currentPlayer(state).id !== playerId)
    return { ok: false, error: "not your turn" };

  const s = cloneState(state);
  const p = s.players[s.currentPlayerIndex];
  const handIdx = p.hand.findIndex((t) => t.id === move.tileId);
  if (handIdx < 0) return { ok: false, error: "tile not in hand" };
  const tile = p.hand[handIdx];

  // Rule: last-tile-wild cannot be played.
  if (p.hand.length === 1 && tile.isWild) {
    return { ok: false, error: "cannot play wild as last tile; must draw" };
  }

  const v = validatePlacement(
    s,
    tile,
    move.x,
    move.y,
    move.orientation,
    move.flip,
  );
  if (!v.valid) return { ok: false, error: v.reason };

  const cells = tileCells(tile, move.flip);
  const placed: PlacedTile = {
    tileId: tile.id,
    x: move.x,
    y: move.y,
    orientation: move.orientation,
    cells,
  };
  s.board = applyPlacement(s.board, placed);
  s.placed.push(placed);
  p.hand.splice(handIdx, 1);
  s.log.push(`${p.name} played a tile`);

  checkEndConditions(s, playerId);
  if (s.phase === "playing") advanceTurn(s);
  s.version++;
  void tilesLookup;
  return { ok: true, state: s };
}

/**
 * Draw one tile from the bag. If the drawn tile has any legal placement, the
 * engine signals via the returned `mustPlay` flag; the caller may choose to
 * auto-play it (AI) or prompt the user (human). The tile is added to hand
 * regardless; calling `applyPlayMove` afterwards commits the play.
 *
 * If the drawn tile has no legal play, the turn advances immediately.
 * If the bag is empty, the player passes.
 */
export function applyDrawMove(
  state: GameState,
  playerId: string,
): MoveResult | MoveError {
  if (state.phase !== "playing")
    return { ok: false, error: "game not playing" };
  if (currentPlayer(state).id !== playerId)
    return { ok: false, error: "not your turn" };
  // May only draw when you cannot play (relaxed in no-assistance mode).
  if (!state.noAssistance && hasAnyLegalPlay(state, playerId)) {
    return { ok: false, error: "you have a legal play; cannot draw" };
  }

  const s = cloneState(state);
  const p = s.players[s.currentPlayerIndex];
  if (s.bag.length === 0) {
    s.log.push(`${p.name} passes (bag empty)`);
    checkEndConditions(s, playerId);
    if (s.phase === "playing") advanceTurn(s);
    s.version++;
    return { ok: true, state: s };
  }
  const drawn = s.bag.shift()!;
  p.hand.push(drawn);
  s.log.push(`${p.name} drew a tile`);

  // In no-assistance mode the player decides when to end their turn.
  if (!state.noAssistance) {
    // If the drawn tile is still unplayable, turn ends automatically.
    if (!hasAnyLegalPlay(s, playerId)) {
      checkEndConditions(s, playerId);
      if (s.phase === "playing") advanceTurn(s);
    }
  }
  s.version++;
  return { ok: true, state: s };
}

export function applyPassMove(
  state: GameState,
  playerId: string,
): MoveResult | MoveError {
  if (state.phase !== "playing")
    return { ok: false, error: "game not playing" };
  if (currentPlayer(state).id !== playerId)
    return { ok: false, error: "not your turn" };
  const s = cloneState(state);
  const p = s.players[s.currentPlayerIndex];
  s.log.push(`${p.name} passes`);
  checkEndConditions(s, playerId);
  if (s.phase === "playing") advanceTurn(s);
  s.version++;
  return { ok: true, state: s };
}

export function applyMove(
  state: GameState,
  playerId: string,
  move: Move,
  tilesLookup: Tile[],
): MoveResult | MoveError {
  switch (move.type) {
    case "play":
      return applyPlayMove(state, playerId, move, tilesLookup);
    case "draw":
      return applyDrawMove(state, playerId);
    case "pass":
      return state.noAssistance
        ? applyPassMove(state, playerId)
        : applyDrawMove(state, playerId);
  }
}

export function getValidPlaysForPlayer(state: GameState, playerId: string) {
  const p = state.players.find((pp) => pp.id === playerId);
  if (!p) return [];
  const out = [] as ReturnType<typeof getValidPlacements>;
  for (const t of p.hand) {
    if (p.hand.length === 1 && t.isWild) continue; // cannot play wild as last tile
    out.push(...getValidPlacements(state, t));
  }
  return out;
}
