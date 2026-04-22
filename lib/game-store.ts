import { create } from "zustand";
import type { DragState, GameState, Move, Orientation, Tile } from "./types";
import { applyMove, initGame } from "./game-engine";
import { chooseAIMove } from "./ai-player";
import { mulberry32, strSeed } from "./rng";

// ── Local game persistence ────────────────────────────────────────────────
const LOCAL_STATE_KEY = "chromino_local_state";

function saveLocalGame(state: GameState, selfPlayerId: string | null) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      LOCAL_STATE_KEY,
      JSON.stringify({ state, selfPlayerId }),
    );
  } catch {
    // quota exceeded or private-mode restriction — silently skip
  }
}

function loadLocalGame(): {
  state: GameState;
  selfPlayerId: string | null;
} | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { state: GameState; selfPlayerId: string | null };
  } catch {
    return null;
  }
}

function clearLocalGame() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STATE_KEY);
}

// Loaded once at module initialisation (synchronous, so store starts hydrated)
const _saved = loadLocalGame();
// ─────────────────────────────────────────────────────────────────────────

export type UIMode = "setup" | "local" | "remote-lobby" | "remote-game";

export interface SelectedTileInfo {
  tileId: number;
  flip: boolean;
  orientation: "h" | "v";
}

export type TileOrientation = { orientation: "h" | "v"; flip: boolean };

interface GameStore {
  state: GameState | null;
  tiles: Tile[];
  selfPlayerId: string | null;
  selected: SelectedTileInfo | null;
  dragging: DragState | null;
  tileOrientations: Record<number, TileOrientation>;
  hasDrawnThisTurn: boolean;
  boardZoom: number;
  showPrivacyScreen: boolean;

  setTiles(tiles: Tile[]): void;
  setBoardZoom(zoom: number): void;
  acknowledgePrivacyScreen(): void;
  startLocal(opts: Parameters<typeof initGame>[0], selfId: string): void;
  setState(state: GameState): void;
  setSelf(id: string | null): void;
  select(info: SelectedTileInfo | null): void;
  rotateSelected(): void;
  flipSelected(): void;
  rotateLeft(): void;
  rotateRight(): void;
  play(move: Move): { ok: boolean; error?: string };
  stepAIIfNeeded(): void;
  startDrag(
    tileId: number,
    orientation: Orientation,
    flip: boolean,
    curX: number,
    curY: number,
    originX: number,
    originY: number,
  ): void;
  updateDrag(x: number, y: number): void;
  cancelDrag(): void;
  clearDrag(): void;
  resetGame(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: _saved?.state ?? null,
  tiles: [],
  selfPlayerId: _saved?.selfPlayerId ?? null,
  selected: null,
  dragging: null,
  tileOrientations: {},
  hasDrawnThisTurn: false,
  boardZoom: 1,
  showPrivacyScreen: false,
  setTiles(tiles) {
    set({ tiles });
  },
  setBoardZoom(zoom) {
    set({ boardZoom: zoom });
  },
  acknowledgePrivacyScreen() {
    set({ showPrivacyScreen: false });
  },
  startLocal(opts, selfId) {
    const state = initGame(opts);
    set({
      state,
      selfPlayerId: selfId,
      selected: null,
      tileOrientations: {},
      hasDrawnThisTurn: false,
    });
    saveLocalGame(state, selfId);
  },
  setState(state) {
    set({ state, hasDrawnThisTurn: state.turnHasDrawn ?? false });
  },
  setSelf(id) {
    set({ selfPlayerId: id });
  },
  select(info) {
    if (!info) {
      set({ selected: null });
      return;
    }
    const saved = get().tileOrientations[info.tileId];
    set({
      selected: {
        tileId: info.tileId,
        orientation: saved?.orientation ?? "h",
        flip: saved?.flip ?? false,
      },
    });
  },
  rotateSelected() {
    const { selected } = get();
    if (!selected) return;
    set({
      selected: {
        ...selected,
        orientation: selected.orientation === "h" ? "v" : "h",
      },
    });
  },
  flipSelected() {
    const { selected } = get();
    if (!selected) return;
    set({ selected: { ...selected, flip: !selected.flip } });
  },
  rotateLeft() {
    const { selected, tileOrientations } = get();
    if (!selected) return;
    // 4-state clockwise cycle: h/false → v/false → h/true → v/true
    // rotateLeft steps backward in that cycle
    const CYCLE: Array<{ orientation: "h" | "v"; flip: boolean }> = [
      { orientation: "h", flip: false },
      { orientation: "v", flip: false },
      { orientation: "h", flip: true },
      { orientation: "v", flip: true },
    ];
    const idx = CYCLE.findIndex(
      (s) => s.orientation === selected.orientation && s.flip === selected.flip,
    );
    const next = CYCLE[(idx + 3) % 4];
    const updated = { ...selected, ...next };
    set({
      selected: updated,
      tileOrientations: { ...tileOrientations, [selected.tileId]: next },
    });
  },
  rotateRight() {
    const { selected, tileOrientations } = get();
    if (!selected) return;
    const CYCLE: Array<{ orientation: "h" | "v"; flip: boolean }> = [
      { orientation: "h", flip: false },
      { orientation: "v", flip: false },
      { orientation: "h", flip: true },
      { orientation: "v", flip: true },
    ];
    const idx = CYCLE.findIndex(
      (s) => s.orientation === selected.orientation && s.flip === selected.flip,
    );
    const next = CYCLE[(idx + 1) % 4];
    const updated = { ...selected, ...next };
    set({
      selected: updated,
      tileOrientations: { ...tileOrientations, [selected.tileId]: next },
    });
  },
  play(move) {
    const { state, tiles, selfPlayerId } = get();
    if (!state || !selfPlayerId) return { ok: false, error: "no game" };
    const res = applyMove(state, selfPlayerId, move, tiles);
    if (!res.ok) return { ok: false, error: res.error };
    let hasDrawnThisTurn = false;
    if (move.type === "draw" && state.noAssistance) {
      hasDrawnThisTurn = true;
    }

    // For local pass-and-play: switch selfPlayerId when the turn advances to
    // another human player and show the privacy screen.
    let newSelfId = selfPlayerId;
    let showPrivacyScreen = false;
    if (res.state.code === "LOCAL" && res.state.phase === "playing") {
      const turnAdvanced =
        res.state.currentPlayerIndex !== state.currentPlayerIndex;
      if (turnAdvanced) {
        const newCurrent = res.state.players[res.state.currentPlayerIndex];
        const hasMultipleHumans =
          res.state.players.filter((p) => !p.isAI).length > 1;
        if (!newCurrent.isAI && hasMultipleHumans) {
          newSelfId = newCurrent.id;
          showPrivacyScreen = true;
        }
      }
    }

    set({
      state: res.state,
      selected: null,
      hasDrawnThisTurn,
      selfPlayerId: newSelfId,
      showPrivacyScreen,
    });
    if (res.state.code === "LOCAL") saveLocalGame(res.state, newSelfId);
    return { ok: true };
  },
  stepAIIfNeeded() {
    const { state, tiles, selfPlayerId } = get();
    if (!state || state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (!cur.isAI) return;
    const rng = mulberry32(strSeed(`${state.code}:${state.version}:${cur.id}`));
    const move = chooseAIMove(state, cur.id, rng);
    const res = applyMove(state, cur.id, move, tiles);
    if (res.ok) {
      // For local pass-and-play: if the AI's move advances to a human player,
      // switch selfPlayerId and show the privacy screen.
      let newSelfId = selfPlayerId;
      let showPrivacyScreen = false;
      if (res.state.code === "LOCAL" && res.state.phase === "playing") {
        const turnAdvanced =
          res.state.currentPlayerIndex !== state.currentPlayerIndex;
        if (turnAdvanced) {
          const newCurrent = res.state.players[res.state.currentPlayerIndex];
          const hasMultipleHumans =
            res.state.players.filter((p) => !p.isAI).length > 1;
          if (!newCurrent.isAI && hasMultipleHumans) {
            newSelfId = newCurrent.id;
            showPrivacyScreen = true;
          }
        }
      }
      set({ state: res.state, selfPlayerId: newSelfId, showPrivacyScreen });
      if (res.state.code === "LOCAL") saveLocalGame(res.state, newSelfId);
    }
  },
  startDrag(tileId, orientation, flip, curX, curY, originX, originY) {
    set({
      dragging: {
        tileId,
        orientation,
        flip,
        originX,
        originY,
        currentX: curX,
        currentY: curY,
        cancelling: false,
      },
    });
  },
  updateDrag(x, y) {
    const { dragging } = get();
    if (!dragging || dragging.cancelling) return;
    set({ dragging: { ...dragging, currentX: x, currentY: y } });
  },
  cancelDrag() {
    const { dragging } = get();
    if (!dragging) return;
    set({ dragging: { ...dragging, cancelling: true } });
  },
  clearDrag() {
    set({ dragging: null });
  },
  resetGame() {
    clearLocalGame();
    set({
      state: null,
      selfPlayerId: null,
      selected: null,
      dragging: null,
      tileOrientations: {},
      hasDrawnThisTurn: false,
      showPrivacyScreen: false,
    });
  },
}));
