import { NextResponse } from "next/server";
import { loadGame, saveGame, trySaveGame } from "@/lib/kv";
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
  const prevVersion = state.version;
  const res = applyMove(state, body.playerId, body.move, tiles);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 });
  state = res.state;

  // Run AI turns until it is a human's turn or the game ends.
  // Safety cap: 32 allows each AI to draw+pass in the worst case.
  let safety = 0;
  while (state.phase === "playing" && safety++ < 32) {
    const cur = state.players[state.currentPlayerIndex];
    if (!cur.isAI) break;
    const rng = mulberry32(strSeed(`${state.code}:${state.version}:${cur.id}`));
    const aiMove = chooseAIMove(state, cur.id, rng);
    const r = applyMove(state, cur.id, aiMove, tiles);
    if (!r.ok) break;
    state = r.state;
    // In no-assistance mode a draw does not advance the turn automatically.
    // We need to follow it with either a play (if the drawn tile fits) or a pass.
    if (
      state.noAssistance &&
      aiMove.type === "draw" &&
      state.phase === "playing"
    ) {
      const postDrawMove = chooseAIMove(state, cur.id, rng);
      // If chooseAIMove still wants to draw (no candidates), force a pass instead.
      const followUp: import("@/lib/types").Move =
        postDrawMove.type === "draw" ? { type: "pass" } : postDrawMove;
      const r2 = applyMove(state, cur.id, followUp, tiles);
      if (!r2.ok) break;
      state = r2.state;
    }
  }

  const saved = await trySaveGame(state, prevVersion);
  if (!saved) {
    return NextResponse.json(
      { error: "concurrent update, please retry" },
      { status: 409 },
    );
  }
  return NextResponse.json(state);
}
