import Redis from "ioredis";
import type { GameState } from "./types";

const TTL_SECONDS = 60 * 60 * 24; // 24h

// Singleton pattern for serverless environments
declare global {
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getRedis(): Redis {
  if (!global.__redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL environment variable is not set");
    global.__redis = new Redis(url, { lazyConnect: false });
  }
  return global.__redis;
}

function gameKey(code: string) {
  return `chromino:game:${code.toUpperCase()}`;
}

export async function saveGame(state: GameState): Promise<void> {
  await getRedis().set(
    gameKey(state.code),
    JSON.stringify(state),
    "EX",
    TTL_SECONDS,
  );
}

export async function loadGame(code: string): Promise<GameState | null> {
  const raw = await getRedis().get(gameKey(code));
  if (!raw) return null;
  return JSON.parse(raw) as GameState;
}

export async function deleteGame(code: string): Promise<void> {
  await getRedis().del(gameKey(code));
}

export async function getVersion(code: string): Promise<number | null> {
  const s = await loadGame(code);
  return s?.version ?? null;
}
