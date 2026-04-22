"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game-store";
import { Board } from "@/components/Board";
import { Hand } from "@/components/Hand";
import { PlayerPanel } from "@/components/PlayerPanel";
import { generateAllTiles } from "@/lib/tile-generator";
import type { GameState, Move } from "@/lib/types";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

export default function RemoteGamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const code = params.code.toUpperCase();

  const tiles = useMemo(() => generateAllTiles(), []);
  const { state, setTiles, setState, setSelf, selfPlayerId, selected, select } =
    useGameStore();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [disbanded, setDisbanded] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  // Initial join, then subscribe to SSE.
  useEffect(() => {
    let playerId = localStorage.getItem(PID_KEY);
    if (!playerId) {
      // First-ever visit: generate a persistent ID instead of silently redirecting.
      playerId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "p_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(PID_KEY, playerId);
    }
    const nickname = localStorage.getItem(NICK_KEY) ?? "玩家";
    setSelf(playerId);
    localStorage.setItem(LAST_GAME_KEY, code);

    (async () => {
      try {
        const res = await fetch(`/api/game/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, name: nickname }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? `HTTP ${res.status}`);
          setJoining(false);
          return;
        }
        const s = (await res.json()) as GameState;
        setState(s);
        setJoining(false);

        // Subscribe to SSE
        const es = new EventSource(`/api/game/${code}/events`);
        esRef.current = es;
        es.addEventListener("state", (ev) => {
          try {
            const next = JSON.parse((ev as MessageEvent).data) as GameState;
            setState(next);
            setIsConnected(true);
          } catch {
            /* ignore */
          }
        });
        es.addEventListener("error", () => {
          setIsConnected(false);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "join failed");
        setJoining(false);
      }
    })();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [code, router, setSelf, setState]);

  // Show disbanded screen instead of silently redirecting
  useEffect(() => {
    if (state?.phase === "disbanded") {
      esRef.current?.close();
      localStorage.removeItem(LAST_GAME_KEY);
      setDisbanded(true);
    }
  }, [state?.phase]);

  async function handleLeave() {
    const amHost = state?.players.find((p) => p.isHost)?.id === selfPlayerId;
    esRef.current?.close();
    if (amHost) {
      await fetch(`/api/game/${code}/disband`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: selfPlayerId }),
      });
    } else if (selfPlayerId) {
      // Non-host: notify server so the seat can be AI-taken-over during gameplay
      await fetch(`/api/game/${code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selfPlayerId }),
      });
    }
    localStorage.removeItem(LAST_GAME_KEY);
    router.push("/");
  }

  const postAction = useCallback(
    async (move: Move) => {
      if (!selfPlayerId) return;
      const res = await fetch(`/api/game/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selfPlayerId, move }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const s = (await res.json()) as GameState;
      setState(s);
      select(null);
    },
    [code, selfPlayerId, setState, select],
  );

  // Intercept local store's play() results: when user clicks a valid placement
  // the store calls applyMove locally. For remote games we do not want that —
  // override by monkey-patching? Instead, we handle clicks by replacing the
  // board/hand's play flow via the store mechanism. Simpler: we add a tiny
  // wrapper below that reads `selected` + candidate clicks via a global hook.
  // Implementation: overwrite `play` in store per-mount is messy; instead we
  // listen for state.version changes we made locally vs server. The engine call
  // updates state, and we then POST. This yields instant UI but the server is
  // authoritative. If the server rejects, we revert to server state via SSE.
  // (No extra code here — local apply + POST is done in the helper below.)

  // Wrap play via effect: subscribe to selected changes — no, we use a
  // custom click path for remote. The Board + Hand components call the store's
  // `play` which updates local state. We then detect that version bumped
  // locally vs the last-seen server version, and forward the last move to the
  // server. To keep it simple, we expose a buffered play action instead.

  if (disbanded)
    return (
      <Centered>
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600 }}>房间已解散</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>该房间已不存在。</div>
          <a href="/" style={{ color: "#4ade80", fontSize: 14 }}>
            返回首页
          </a>
        </div>
      </Centered>
    );
  if (joining) return <Centered>连接中…</Centered>;
  if (error)
    return (
      <Centered>
        <div
          style={{
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 600 }}>加入失败</div>
          <div style={{ fontSize: 13, color: "#aaa" }}>{error}</div>
          <a href="/" style={{ color: "#4ade80", fontSize: 14 }}>
            返回首页
          </a>
        </div>
      </Centered>
    );
  if (!state) return <Centered>加载中…</Centered>;

  if (state.phase === "lobby") {
    return (
      <Lobby
        state={state}
        code={code}
        selfPlayerId={selfPlayerId}
        onLeave={handleLeave}
      />
    );
  }

  const selectedTileId = selected?.tileId ?? null;
  const me = state.players.find((p) => p.id === selfPlayerId);
  const isMyTurn =
    !!me &&
    state.players[state.currentPlayerIndex]?.id === me.id &&
    state.phase === "playing";

  return (
    <main
      style={{ display: "flex", flexDirection: "column", height: "100dvh" }}
    >
      <PlayerPanel
        state={state}
        selfPlayerId={selfPlayerId}
        onLeave={handleLeave}
      />
      {!isConnected && (
        <div
          style={{
            background: "#7c2d12",
            color: "#fed7aa",
            textAlign: "center",
            padding: "6px 12px",
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          连接已断开，正在重连…
        </div>
      )}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <Board
          state={state}
          tiles={tiles}
          selectedTileId={isMyTurn ? selectedTileId : null}
          onPlay={postAction}
        />
      </div>
      <Hand state={state} onPlay={isMyTurn ? postAction : undefined} />
      {state.phase === "ended" && <EndOverlay state={state} />}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div>{children}</div>
    </main>
  );
}

function Lobby({
  state,
  code,
  selfPlayerId,
  onLeave,
}: {
  state: GameState;
  code: string;
  selfPlayerId: string | null;
  onLeave: () => void;
}) {
  const host = state.players.find((p) => p.isHost);
  const isHost = host?.id === selfPlayerId;
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const aiSeats = state.lobbyAiSeats ?? 0;
  const noAssistance = state.lobbyNoAssistance ?? false;
  const total = state.players.length + aiSeats;

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function patchSettings(patch: {
    aiSeats?: number;
    noAssistance?: boolean;
  }) {
    await fetch(`/api/game/${code}/lobby-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, ...patch }),
    });
  }

  async function start() {
    // Settings are already stored in state; no need to re-send them.
    await fetch(`/api/game/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId }),
    });
  }
  async function kick(targetId: string) {
    await fetch(`/api/game/${code}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, targetId }),
    });
  }

  return (
    <>
      <main
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            background: "#1b2028",
            padding: "clamp(16px, 5vw, 24px)",
            borderRadius: 12,
            width: "min(100%, 480px)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            border: "1px solid #2a2f3a",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ margin: 0 }}>大厅</h2>
            <button
              onClick={copyCode}
              title="点击复制邀请码"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #3a4050",
                background: copied ? "#1a2e1f" : "#222836",
                color: copied ? "#4ade80" : "#e0e0e0",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: 2,
                cursor: "pointer",
                transition: "background 0.15s, color 0.15s",
                fontFamily: "monospace",
              }}
            >
              {code}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  letterSpacing: 0,
                  fontFamily: "sans-serif",
                  opacity: 0.7,
                }}
              >
                {copied ? "已复制 ✓" : "复制"}
              </span>
            </button>
          </div>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
            将此代码分享给朋友。总人数 1–8（包含 AI）。
          </p>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {state.players.map((p) => (
              <li
                key={p.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  minHeight: 44,
                  background: "#222836",
                  borderRadius: 6,
                }}
              >
                <span>
                  {p.name}
                  {p.isHost && " 👑"}
                  {p.id === selfPlayerId && " (我)"}
                </span>
                {isHost && !p.isHost && (
                  <button onClick={() => kick(p.id)}>踢出</button>
                )}
              </li>
            ))}
          </ul>
          {/* AI seat rows — visible to all players */}
          {aiSeats > 0 && (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              {Array.from({ length: aiSeats }, (_, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 12px",
                    minHeight: 44,
                    background: "#1e2535",
                    borderRadius: 6,
                    border: "1px dashed #3a4050",
                  }}
                >
                  <span style={{ color: "#aaa", fontSize: 13 }}>
                    🤖 AI {i + 1}
                  </span>
                  {isHost && (
                    <button
                      onClick={() => patchSettings({ aiSeats: aiSeats - 1 })}
                      style={{
                        background: "transparent",
                        border: "1px solid #4a3030",
                        color: "#f87171",
                        borderRadius: 4,
                        cursor: "pointer",
                        padding: "2px 8px",
                        fontSize: 13,
                      }}
                    >
                      移除
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isHost && (
            <>
              {total < 8 && (
                <button
                  onClick={() => patchSettings({ aiSeats: aiSeats + 1 })}
                  style={{
                    background: "transparent",
                    border: "1px dashed #3a4050",
                    color: "#888",
                    borderRadius: 6,
                    cursor: "pointer",
                    padding: "10px 12px",
                    fontSize: 13,
                    textAlign: "left",
                  }}
                >
                  + 添加 AI
                </button>
              )}
              {/* No-assistance card selector */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  borderTop: "1px solid #2a2f3a",
                  paddingTop: 10,
                  marginTop: 2,
                }}
              >
                {(
                  [
                    {
                      value: true,
                      label: "线下模式",
                      sub: "无辅助 · 需拖拽放牌",
                    },
                    {
                      value: false,
                      label: "辅助模式",
                      sub: "新手友好 · 高亮提示",
                    },
                  ] as { value: boolean; label: string; sub: string }[]
                ).map(({ value, label, sub }) => {
                  const active = noAssistance === value;
                  return (
                    <button
                      key={String(value)}
                      onClick={() => patchSettings({ noAssistance: value })}
                      style={{
                        padding: "10px 8px",
                        borderRadius: 8,
                        border: active
                          ? "2px solid #4ade80"
                          : "2px solid #2a2f3a",
                        background: active ? "#1a2e1f" : "transparent",
                        color: active ? "#4ade80" : "#888",
                        cursor: "pointer",
                        textAlign: "center",
                        lineHeight: 1.4,
                        transition:
                          "border-color 0.15s, background 0.15s, color 0.15s",
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
                        {sub}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {isHost ? (
            <button
              onClick={start}
              disabled={total < 1 || total > 8}
              style={{ background: "#4ade80", color: "#111" }}
            >
              开始游戏
            </button>
          ) : (
            <p style={{ color: "#888", margin: 0 }}>等待房主开始…</p>
          )}
          <button
            onClick={() => setConfirming(true)}
            style={{
              background: "transparent",
              border: "1px solid #4a3030",
              color: "#f87171",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            {isHost ? "解散房间" : "离开大厅"}
          </button>
        </div>
      </main>

      {confirming && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
          onClick={() => setConfirming(false)}
        >
          <div
            style={{
              background: "#1b2028",
              border: "1px solid #2a2f3a",
              borderRadius: 12,
              padding: "24px 28px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minWidth: 240,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              {isHost ? "解散房间？" : "离开大厅？"}
            </div>
            <div style={{ fontSize: 13, color: "#aaa" }}>
              {isHost
                ? "房间将关闭，所有玩家都会被踢出。"
                : "你将离开大厅，其他玩家不受影响。"}
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1 }}>
                取消
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLeave();
                }}
                style={{
                  flex: 1,
                  background: "#dc2626",
                  border: "none",
                  color: "#fff",
                }}
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EndOverlay({ state }: { state: GameState }) {
  const names = state.winners.map(
    (id) => state.players.find((p) => p.id === id)?.name ?? id,
  );
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <div
        style={{
          background: "#1b2028",
          padding: 24,
          borderRadius: 12,
          textAlign: "center",
        }}
      >
        <h2>游戏结束</h2>
        <p>
          胜者{names.length > 1 ? "" : ""}：{names.join("、") || "—"}
        </p>
        <a href="/">返回主菜单</a>
      </div>
    </div>
  );
}
