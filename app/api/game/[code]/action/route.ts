import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";
import { applyMove } from "@/lib/game-engine";
import { chooseAIMove } from "@/lib/ai-player";
import { generateAllTiles } from "@/lib/tile-generator";
import { mulberry32, strSeed } from "@/lib/rng";
import type { Move } from "@/lib/types";

export const runtime = "nodejs";

/** POST: submit a move. Body: { playerId, move }. After the move, any
 * consecutive AI turns are resolved server-side. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as { playerId?: string; move?: Move };
  if (!body.playerId || !body.move) {
    return NextResponse.json(
      { error: "playerId and move required" },
      { status: 400 },
    );
  }
  let state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (state.phase !== "playing") {
    return NextResponse.json({ error: "game not playing" }, { status: 409 });
  }

  const tiles = generateAllTiles();
  const res = applyMove(state, body.playerId, body.move, tiles);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  state = res.state;

  // Run AI turns until it is a human's turn or the game ends.
  let safety = 0;
  while (state.phase === "playing" && safety++ < 16) {
    const cur = state.players[state.currentPlayerIndex];
    if (!cur.isAI) break;
    const rng = mulberry32(strSeed(`${state.code}:${state.version}:${cur.id}`));
    const aiMove = chooseAIMove(state, cur.id, rng);
    const r = applyMove(state, cur.id, aiMove, tiles);
    if (!r.ok) break;
    state = r.state;
  }

  await saveGame(state);
  return NextResponse.json(state);
}
