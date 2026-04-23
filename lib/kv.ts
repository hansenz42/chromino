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
    global.__redis = new Redis(url, {
      lazyConnect: false,
      // Fail fast: if Redis is unreachable the API returns 500 within ~5s
      // instead of hanging forever (which caused create/join to never resolve).
      connectTimeout: 5000,
      commandTimeout: 5000,
      maxRetriesPerRequest: 1,
    });
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

/**
 * Atomically save the game only if the currently stored version equals
 * `prevVersion`. Returns true on success, false if the version has changed
 * (concurrent update), or throws if the game no longer exists.
 *
 * Uses a Lua script so the check-and-set is atomic on the Redis side.
 */
const SAVE_IF_VERSION_LUA = `
local raw = redis.call('GET', KEYS[1])
if not raw then return -1 end
local ok, obj = pcall(cjson.decode, raw)
if not ok then return -1 end
if obj['version'] ~= tonumber(ARGV[2]) then return 0 end
redis.call('SET', KEYS[1], ARGV[1], 'EX', tonumber(ARGV[3]))
return 1
`;

export async function trySaveGame(
  state: GameState,
  prevVersion: number,
): Promise<boolean> {
  const result = (await getRedis().eval(
    SAVE_IF_VERSION_LUA,
    1,
    gameKey(state.code),
    JSON.stringify(state),
    String(prevVersion),
    String(TTL_SECONDS),
  )) as number;
  // 1 = saved, 0 = version mismatch, -1 = key missing
  return result === 1;
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
