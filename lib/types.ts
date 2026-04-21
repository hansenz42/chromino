// Core domain types for Chromino.

export type Color = "red" | "yellow" | "green" | "blue" | "purple";
export type Cell = Color | "wild";

/** A Chromino tile: three cells in a row. The center of a wild tile is 'wild'. */
export interface Tile {
  id: number;
  cells: [Cell, Cell, Cell];
  isWild: boolean;
}

/** Board orientation: 'h' = horizontal (3 cells along +x), 'v' = vertical (3 cells along +y). */
export type Orientation = "h" | "v";

/** A placed tile on the board. (x, y) is the anchor (left/top) cell coordinate. */
export interface PlacedTile {
  tileId: number;
  x: number;
  y: number;
  orientation: Orientation;
  /** Cell values in board order after flip (anchor→anchor+2). */
  cells: [Cell, Cell, Cell];
}

export interface Player {
  id: string;
  name: string;
  isAI: boolean;
  isHost: boolean;
  connected: boolean;
  hand: Tile[];
}

export type GamePhase = "lobby" | "playing" | "ended";

export interface PlacementMove {
  type: "play";
  tileId: number;
  x: number;
  y: number;
  orientation: Orientation;
  /** If true, the tile is flipped (cells reversed before placing). */
  flip: boolean;
}

export interface DrawMove {
  type: "draw";
}

export interface PassMove {
  type: "pass";
}

export type Move = PlacementMove | DrawMove | PassMove;

export interface GameState {
  code: string;
  players: Player[];
  /** Placed tiles in order of play (first entry is the starting wild). */
  placed: PlacedTile[];
  /** Cell lookup for fast neighbour queries. Key: "x,y", value: Cell. */
  board: Record<string, Cell>;
  bag: Tile[];
  currentPlayerIndex: number;
  phase: GamePhase;
  winners: string[];
  firstFinishedPlayerId: string | null;
  /** Player IDs that have already taken their final-round action after firstFinished. */
  finalRoundDone: Record<string, boolean>;
  /** Monotonic counter used by SSE for change detection. */
  version: number;
  /** Optional log of recent events, useful for debugging and UI feedback. */
  log: string[];
  /** When true, ghost placement hints are hidden and tiles must be placed by drag-and-drop. */
  noAssistance?: boolean;
}

/** Ephemeral drag state for the no-assistance drag-and-drop mode. Lives in the UI store only. */
export interface DragState {
  tileId: number;
  orientation: Orientation;
  flip: boolean;
  /** Center of tile element in Hand at drag start — target for cancel-return animation. */
  originX: number;
  originY: number;
  /** Current cursor position. */
  currentX: number;
  currentY: number;
  /** True while the bounce-back animation is playing after a failed drop. */
  cancelling: boolean;
}

export interface CreateGameConfig {
  hostName: string;
  maxPlayers: number; // 2-4
}
