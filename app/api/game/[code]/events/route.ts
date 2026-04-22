import { loadGame } from "@/lib/kv";

/**
 * Polling endpoint for game state. Returns the current state if its version
 * is greater than the client's known version, 204 if unchanged, or 404 if
 * the game no longer exists.
 *
 * GET /api/game/[code]/events?version=N
 *   200 { state }  — new version available
 *   204            — no change
 *   404 { error }  — game not found
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const url = new URL(req.url);
  const clientVersion = parseInt(url.searchParams.get("version") ?? "-1", 10);

  const state = await loadGame(code);
  if (!state) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  if (state.version <= clientVersion) {
    return new Response(null, { status: 204 });
  }
  return Response.json({ state });
}
