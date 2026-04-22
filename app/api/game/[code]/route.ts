import { NextResponse } from "next/server";
import { loadGame, saveGame, trySaveGame } from "@/lib/kv";
import type { Player } from "@/lib/types";

export const runtime = "nodejs";

/** GET: fetch current game state (for reconnection and polling fallback). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(state);
}

/** POST: join the lobby (or reconnect if already in it). Body: { playerId, name }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as { playerId?: string; name?: string };
  const playerId = (body.playerId ?? "").trim();
  const name = (body.name ?? "玩家").trim() || "玩家";
  if (!playerId)
    return NextResponse.json({ error: "playerId required" }, { status: 400 });

  const state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });

  const prevVersion = state.version;

  if ((state.leftPlayerIds ?? []).includes(playerId)) {
    return NextResponse.json({ error: "已退出该游戏" }, { status: 403 });
  }

  const existing = state.players.find((p) => p.id === playerId);
  if (existing) {
    // Reconnect: do not mutate disbanded/ended games.
    if (state.phase === "disbanded" || state.phase === "ended") {
      return NextResponse.json(state);
    }
    existing.connected = true;
    existing.name = name;
  } else {
    if (state.phase !== "lobby") {
      return NextResponse.json({ error: "游戏已开始" }, { status: 409 });
    }
    if (state.players.length >= 8) {
      return NextResponse.json({ error: "game full" }, { status: 409 });
    }
    const player: Player = {
      id: playerId,
      name,
      isAI: false,
      isHost: false,
      connected: true,
      hand: [],
    };
    state.players.push(player);
    state.log.push(`${name} joined`);
  }
  state.version++;
  const saved = await trySaveGame(state, prevVersion);
  if (!saved) {
    // Concurrent join: reload and return current state (player may already be in)
    const latest = await loadGame(code);
    return NextResponse.json(latest ?? state);
  }
  return NextResponse.json(state);
}
