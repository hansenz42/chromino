import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";
import { generateMatchCode } from "@/lib/match-code";
import type { GameState, Player } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = (await req.json()) as { hostId?: string; hostName?: string };
  const hostId = (body.hostId ?? "").trim();
  const hostName = (body.hostName ?? "Host").trim() || "Host";
  if (!hostId)
    return NextResponse.json({ error: "hostId required" }, { status: 400 });

  // Find a free code (a few retries should be plenty at small scale).
  let code = "";
  for (let i = 0; i < 10; i++) {
    code = generateMatchCode();
    const existing = await loadGame(code);
    if (!existing) break;
  }
  if (!code)
    return NextResponse.json(
      { error: "could not allocate code" },
      { status: 500 },
    );

  const host: Player = {
    id: hostId,
    name: hostName,
    isAI: false,
    isHost: true,
    connected: true,
    hand: [],
  };
  const lobby: GameState = {
    code,
    players: [host],
    placed: [],
    board: {},
    bag: [],
    currentPlayerIndex: 0,
    phase: "lobby",
    winners: [],
    firstFinishedPlayerId: null,
    finalRoundDone: {},
    version: 1,
    log: [`${hostName} created the game`],
  };
  await saveGame(lobby);
  return NextResponse.json({ code });
}
