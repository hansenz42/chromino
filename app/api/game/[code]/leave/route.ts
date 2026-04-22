import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";
import { applyMove } from "@/lib/game-engine";
import { chooseAIMove } from "@/lib/ai-player";
import { generateAllTiles } from "@/lib/tile-generator";
import { mulberry32, strSeed } from "@/lib/rng";

export const runtime = "nodejs";

/**
 * POST: A non-host player intentionally leaves the room.
 * - Lobby phase: removes the player from the room.
 * - Playing phase: converts the player to an AI-controlled seat (aiTakeover).
 * Body: { playerId }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as { playerId?: string };
  const playerId = (body.playerId ?? "").trim();
  if (!playerId)
    return NextResponse.json({ error: "playerId required" }, { status: 400 });

  let state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });

  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0)
    return NextResponse.json({ error: "player not found" }, { status: 404 });

  const player = state.players[idx];
  if (player.isHost) {
    return NextResponse.json(
      { error: "host cannot use leave; use disband instead" },
      { status: 400 },
    );
  }

  if (state.phase === "lobby") {
    // Simply remove from lobby
    state.players.splice(idx, 1);
    state.leftPlayerIds = [...(state.leftPlayerIds ?? []), playerId];
    state.log.push(`${player.name} 退出了房间`);
    state.version++;
    await saveGame(state);
    return NextResponse.json(state);
  }

  if (state.phase !== "playing") {
    // Game ended or disbanded — nothing to do
    return NextResponse.json(state);
  }

  // Playing phase: convert to AI takeover
  player.isAI = true;
  player.aiTakeover = true;
  player.connected = false;
  state.leftPlayerIds = [...(state.leftPlayerIds ?? []), playerId];
  state.log.push(`${player.name} 退出，AI 接管`);
  state.version++;

  // If it is currently this player's turn, let AI play immediately
  const tiles = generateAllTiles();
  let safety = 0;
  while (state.phase === "playing" && safety++ < 32) {
    const cur = state.players[state.currentPlayerIndex];
    if (!cur.isAI) break;
    const rng = mulberry32(strSeed(`${state.code}:${state.version}:${cur.id}`));
    const aiMove = chooseAIMove(state, cur.id, rng);
    const r = applyMove(state, cur.id, aiMove, tiles);
    if (!r.ok) break;
    state = r.state;
    if (
      state.noAssistance &&
      aiMove.type === "draw" &&
      state.phase === "playing"
    ) {
      const followUpMove = chooseAIMove(state, cur.id, rng);
      const followUp: import("@/lib/types").Move =
        followUpMove.type === "draw" ? { type: "pass" } : followUpMove;
      const r2 = applyMove(state, cur.id, followUp, tiles);
      if (!r2.ok) break;
      state = r2.state;
    }
  }

  await saveGame(state);
  return NextResponse.json(state);
}
