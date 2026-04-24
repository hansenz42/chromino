import { loadGame } from "@/lib/kv";

const POLL_INTERVAL_MS = 500;
const HEARTBEAT_MS = 25_000;
const MAX_STREAM_MS = 240_000;
const RETRY_MS = 1000;

/**
 * SSE stream for game state updates.
 *
 * To avoid platform hard timeouts, the stream is intentionally rotated every
 * 120 seconds. The client should reconnect immediately and continue seamlessly.
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
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      let rotation: ReturnType<typeof setTimeout> | null = null;

      function closeStream() {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        if (rotation) clearTimeout(rotation);
        try {
          controller.close();
        } catch {}
      }

      function send(event: string, data: unknown) {
        if (closed) return;
        const payload = `retry: ${RETRY_MS}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
        try {
          controller.enqueue(encoder.encode(payload));
        } catch {
          closeStream();
        }
      }

      heartbeat = setInterval(
        () => send("ping", { ts: Date.now() }),
        HEARTBEAT_MS,
      );
      rotation = setTimeout(() => {
        send("rotate", { at: Date.now() });
        closeStream();
      }, MAX_STREAM_MS);

      try {
        while (!closed) {
          const state = await loadGame(code);
          if (!state) {
            send("app-error", { error: "not found" });
            break;
          }
          if (state.version !== lastVersion) {
            lastVersion = state.version;
            send("state", state);
            if (state.phase === "ended" || state.phase === "disbanded") break;
          }
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        }
      } finally {
        closeStream();
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
      "X-Accel-Buffering": "no",
    },
  });
}
