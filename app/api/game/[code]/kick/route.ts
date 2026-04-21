import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";

export const runtime = "nodejs";

/** Host kicks a player from the lobby. Body: { hostId, targetId }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as { hostId?: string; targetId?: string };
  const state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  const host = state.players.find((p) => p.isHost);
  if (!host || host.id !== body.hostId) {
    return NextResponse.json({ error: "only host can kick" }, { status: 403 });
  }
  if (state.phase !== "lobby") {
    return NextResponse.json(
      { error: "can only kick in lobby" },
      { status: 409 },
    );
  }
  if (body.targetId === host.id) {
    return NextResponse.json({ error: "cannot kick host" }, { status: 400 });
  }
  const idx = state.players.findIndex((p) => p.id === body.targetId);
  if (idx < 0)
    return NextResponse.json({ error: "no such player" }, { status: 404 });
  const [removed] = state.players.splice(idx, 1);
  state.log.push(`${removed.name} was kicked`);
  state.version++;
  await saveGame(state);
  return NextResponse.json(state);
}
