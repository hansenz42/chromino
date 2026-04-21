import { loadGame } from "@/lib/kv";
import type { GameState } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Server-Sent Events stream pushing the latest game state whenever KV version
 * changes. Uses a 500ms polling loop against KV (cheap GET) and emits a heartbeat
 * every 25s so the connection stays under Vercel Edge idle limits.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const encoder = new TextEncoder();
  let lastVersion = -1;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closed = true;
        }
      }
      const heartbeat = setInterval(() => send("ping", Date.now()), 25000);

      try {
        while (!closed) {
          const state = await loadGame(code);
          if (!state) {
            send("error", { error: "not found" });
            break;
          }
          if (state.version !== lastVersion) {
            lastVersion = state.version;
            send("state", state);
            if (state.phase === "ended" || state.phase === "disbanded") break;
          }
          await new Promise((r) => setTimeout(r, 500));
        }
      } finally {
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {}
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
