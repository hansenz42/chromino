import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";

export const runtime = "nodejs";

/**
 * Host updates lobby settings (AI seat count and game mode).
 * Body: { hostId, aiSeats?: number, noAssistance?: boolean }
 * Saving increments the version so SSE broadcasts the change to all guests.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as {
    hostId?: string;
    aiSeats?: number;
    noAssistance?: boolean;
  };

  const state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (state.phase !== "lobby") {
    return NextResponse.json(
      { error: "game already started" },
      { status: 409 },
    );
  }

  const host = state.players.find((p) => p.isHost);
  if (!host || host.id !== body.hostId) {
    return NextResponse.json(
      { error: "only host can change settings" },
      { status: 403 },
    );
  }

  if (body.aiSeats !== undefined) {
    const clamped = Math.max(0, Math.min(7, body.aiSeats));
    // Ensure total players stays ≤ 8
    state.lobbyAiSeats = Math.min(clamped, 8 - state.players.length);
  }
  if (body.noAssistance !== undefined) {
    state.lobbyNoAssistance = body.noAssistance;
  }

  state.version++;
  await saveGame(state);
  return NextResponse.json(state);
}
