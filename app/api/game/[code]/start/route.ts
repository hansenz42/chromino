import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";
import { initGame } from "@/lib/game-engine";
import type { Player } from "@/lib/types";

export const runtime = "nodejs";

/** Host starts the game. Body: { hostId, aiSeats?: number }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as {
    hostId?: string;
    aiSeats?: number;
    noAssistance?: boolean;
  };
  const hostId = body.hostId;

  const lobby = await loadGame(code);
  if (!lobby) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (lobby.phase !== "lobby") {
    return NextResponse.json({ error: "已开始" }, { status: 409 });
  }
  const host = lobby.players.find((p) => p.isHost);
  if (!host || host.id !== hostId) {
    return NextResponse.json({ error: "only host can start" }, { status: 403 });
  }

  // Accept overrides from body, but fall back to the lobby-stored settings.
  const aiSeats =
    body.aiSeats !== undefined
      ? Math.max(0, Math.min(7, body.aiSeats))
      : Math.max(0, Math.min(7, lobby.lobbyAiSeats ?? 0));
  const noAssistance =
    body.noAssistance !== undefined
      ? body.noAssistance
      : (lobby.lobbyNoAssistance ?? false);

  if (
    lobby.players.length + aiSeats < 1 ||
    lobby.players.length + aiSeats > 8
  ) {
    return NextResponse.json(
      { error: "need 1–8 players total" },
      { status: 400 },
    );
  }

  const roster: Array<Omit<Player, "hand" | "connected">> = lobby.players.map(
    (p) => ({
      id: p.id,
      name: p.name,
      isAI: p.isAI,
      isHost: p.isHost,
    }),
  );
  for (let i = 0; i < aiSeats; i++) {
    roster.push({
      id: `ai_${code}_${i}`,
      name: `AI ${i + 1}`,
      isAI: true,
      isHost: false,
    });
  }
  const state = initGame({ code, players: roster, noAssistance });
  state.version = lobby.version + 1;
  await saveGame(state);
  return NextResponse.json(state);
}
