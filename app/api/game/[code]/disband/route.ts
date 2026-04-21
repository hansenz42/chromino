import { NextResponse } from "next/server";
import { loadGame, saveGame } from "@/lib/kv";

export const runtime = "nodejs";

/** Host disbands the room, redirecting all players home. Body: { hostId }. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const body = (await req.json()) as { hostId?: string };
  const state = await loadGame(code);
  if (!state) return NextResponse.json({ error: "not found" }, { status: 404 });
  const host = state.players.find((p) => p.isHost);
  if (!host || host.id !== body.hostId) {
    return NextResponse.json(
      { error: "only host can disband" },
      { status: 403 },
    );
  }
  state.phase = "disbanded";
  state.version++;
  state.log.push("房主解散了房间");
  await saveGame(state);
  return NextResponse.json(state);
}
