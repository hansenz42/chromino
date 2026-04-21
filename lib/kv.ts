import { kv } from "@vercel/kv";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // 24h

function gameKey(code: string) {
  return `chromino:game:${code.toUpperCase()}`;
}

export async function saveGame(state: GameState): Promise<void> {
  await kv.set(gameKey(state.code), state, { ex: TTL_SECONDS });
}

export async function loadGame(code: string): Promise<GameState | null> {
  const s = (await kv.get(gameKey(code))) as GameState | null;
  return s ?? null;
}

export async function deleteGame(code: string): Promise<void> {
  await kv.del(gameKey(code));
}

export async function getVersion(code: string): Promise<number | null> {
  const s = await loadGame(code);
  return s?.version ?? null;
}
