"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  const [aiSeats, setAiSeats] = useState(1);
  const [noAssistance, setNoAssistance] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  // Initial join, then subscribe to SSE.
  useEffect(() => {
    const playerId = localStorage.getItem(PID_KEY);
    const nickname = localStorage.getItem(NICK_KEY) ?? "玩家";
    if (!playerId) {
      router.replace("/");
      return;
    }
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
          } catch {
            /* ignore */
          }
        });
        es.addEventListener("error", () => {
          // Auto-reconnect is built in; do nothing.
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

  // Redirect all clients when room is disbanded
  useEffect(() => {
    if (state?.phase === "disbanded") {
      esRef.current?.close();
      localStorage.removeItem(LAST_GAME_KEY);
      router.push("/");
    }
  }, [state?.phase, router]);

  async function handleLeave() {
    const amHost = state?.players.find((p) => p.isHost)?.id === selfPlayerId;
    esRef.current?.close();
    if (amHost) {
      await fetch(`/api/game/${code}/disband`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: selfPlayerId }),
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

  if (joining) return <Centered>连接中…</Centered>;
  if (error) return <Centered>错误：{error}</Centered>;
  if (!state) return <Centered>加载中…</Centered>;

  if (state.phase === "lobby") {
    return (
      <Lobby
        state={state}
        code={code}
        selfPlayerId={selfPlayerId}
        aiSeats={aiSeats}
        setAiSeats={setAiSeats}
        noAssistance={noAssistance}
        setNoAssistance={setNoAssistance}
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
      <PlayerPanel state={state} onLeave={handleLeave} />
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* Remote Board: intercept clicks on candidate cells */}
        <RemoteBoard
          state={state}
          tiles={tiles}
          selectedTileId={selectedTileId}
          disabled={!isMyTurn}
          onPlay={postAction}
        />
      </div>
      <RemoteHand state={state} disabled={!isMyTurn} onPlay={postAction} />
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
  aiSeats,
  setAiSeats,
  noAssistance,
  setNoAssistance,
  onLeave,
}: {
  state: GameState;
  code: string;
  selfPlayerId: string | null;
  aiSeats: number;
  setAiSeats: (n: number) => void;
  noAssistance: boolean;
  setNoAssistance: (v: boolean) => void;
  onLeave: () => void;
}) {
  const host = state.players.find((p) => p.isHost);
  const isHost = host?.id === selfPlayerId;
  const [confirming, setConfirming] = useState(false);

  async function start() {
    await fetch(`/api/game/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, aiSeats, noAssistance }),
    });
  }
  async function kick(targetId: string) {
    await fetch(`/api/game/${code}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, targetId }),
    });
  }

  const total = state.players.length + aiSeats;

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
          <h2 style={{ margin: 0 }}>大厅 · {code}</h2>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
            将此代码分享给朋友。总人数 1–4（包含 AI）。
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
          {isHost && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label>AI 平位：</label>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, 4 - state.players.length)}
                  value={aiSeats}
                  onChange={(e) =>
                    setAiSeats(
                      Math.max(0, Math.min(3, Number(e.target.value) || 0)),
                    )
                  }
                  style={{ width: 60 }}
                />
                <span style={{ color: "#888", fontSize: 12 }}>
                  总计：{total}
                </span>
              </div>
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: 13,
                  color: "#aaa",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={noAssistance}
                  onChange={(e) => setNoAssistance(e.target.checked)}
                />
                <span>
                  <strong style={{ color: noAssistance ? "#f59e0b" : "#fff" }}>
                    无辅助模式
                  </strong>
                  {" — 隐藏可放置高亮，需拖拽放牌"}
                </span>
              </label>
            </>
          )}
          {isHost ? (
            <button
              onClick={start}
              disabled={total < 1 || total > 4}
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

/* Remote wrappers: the shared Board/Hand components call the store directly
 * which is fine for local games. For remote games we want clicks to POST
 * instead. We provide thin wrappers that re-implement just the click paths
 * and reuse everything else visually. */

import { TileSvg } from "@/components/Tile";
import {
  getValidPlacements,
  tileFootprint,
  validatePlacement,
} from "@/lib/placement-validator";
import { hasAnyLegalPlay } from "@/lib/game-engine";
import { WILD_STROKE } from "@/lib/colors";
import { cellFill } from "@/components/Tile";

const CELL = 48;
const HAND_CELL = 32;

function RemoteBoard({
  state,
  tiles,
  selectedTileId,
  disabled,
  onPlay,
}: {
  state: GameState;
  tiles: import("@/lib/types").Tile[];
  selectedTileId: number | null;
  disabled: boolean;
  onPlay: (m: Move) => void;
}) {
  const { selected } = useGameStore();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const { minX, minY, maxX, maxY } = useMemo(() => {
    const keys = Object.keys(state.board);
    if (keys.length === 0) return { minX: -3, minY: -3, maxX: 3, maxY: 3 };
    let a = Infinity,
      b = Infinity,
      c = -Infinity,
      d = -Infinity;
    for (const k of keys) {
      const [xs, ys] = k.split(",");
      const x = Number(xs);
      const y = Number(ys);
      if (x < a) a = x;
      if (x > c) c = x;
      if (y < b) b = y;
      if (y > d) d = y;
    }
    return { minX: a - 4, minY: b - 4, maxX: c + 4, maxY: d + 4 };
  }, [state.board]);

  const widthCells = maxX - minX + 1;
  const heightCells = maxY - minY + 1;
  const width = widthCells * CELL;
  const height = heightCells * CELL;

  const selectedTile = selectedTileId !== null ? tiles[selectedTileId] : null;
  const candidates = useMemo(() => {
    if (disabled || !selectedTile || !selected) return [];
    return getValidPlacements(state, selectedTile).filter(
      (o) => o.orientation === selected.orientation && o.flip === selected.flip,
    );
  }, [state, selectedTile, selected, disabled]);

  function onCellClick(cx: number, cy: number) {
    if (disabled || !selectedTile || !selected) return;
    const match = candidates.find((c) => c.x === cx && c.y === cy);
    if (!match) return;
    onPlay({
      type: "play",
      tileId: selectedTile.id,
      x: cx,
      y: cy,
      orientation: selected.orientation,
      flip: selected.flip,
    });
  }

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        background: "#141820",
        touchAction: "none",
      }}
      onMouseDown={(e) => {
        if (e.button !== 0 || (e.target as Element).tagName !== "svg") return;
        dragRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
      }}
      onMouseMove={(e) => {
        if (!dragRef.current) return;
        setPan({
          x: e.clientX - dragRef.current.x,
          y: e.clientY - dragRef.current.y,
        });
      }}
      onMouseUp={() => (dragRef.current = null)}
      onMouseLeave={() => (dragRef.current = null)}
      onWheel={(e) => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(0.3, Math.min(2.5, z * delta)));
      }}
      onPointerUp={(e) => {
        const store = useGameStore.getState();
        const { dragging } = store;
        if (!dragging || dragging.cancelling || !state.noAssistance) return;
        if (!svgRef.current) {
          store.cancelDrag();
          return;
        }
        const svgRect = svgRef.current.getBoundingClientRect();
        if (
          e.clientX < svgRect.left ||
          e.clientX > svgRect.right ||
          e.clientY < svgRect.top ||
          e.clientY > svgRect.bottom
        )
          return;
        const tile = tiles[dragging.tileId];
        if (!tile) {
          store.cancelDrag();
          return;
        }
        const pixX = e.clientX - svgRect.left;
        const pixY = e.clientY - svgRect.top;
        const viewX = (pixX / svgRect.width) * width + minX * CELL;
        const viewY = (pixY / svgRect.height) * height + minY * CELL;
        const gridX = Math.floor(viewX / CELL);
        const gridY = Math.floor(viewY / CELL);
        const anchors: [number, number][] =
          dragging.orientation === "h"
            ? [
                [gridX, gridY],
                [gridX - 1, gridY],
                [gridX - 2, gridY],
              ]
            : [
                [gridX, gridY],
                [gridX, gridY - 1],
                [gridX, gridY - 2],
              ];
        for (const [ax, ay] of anchors) {
          if (
            validatePlacement(
              state,
              tile,
              ax,
              ay,
              dragging.orientation,
              dragging.flip,
            ).valid
          ) {
            onPlay({
              type: "play",
              tileId: dragging.tileId,
              x: ax,
              y: ay,
              orientation: dragging.orientation,
              flip: dragging.flip,
            });
            store.clearDrag();
            return;
          }
        }
        store.cancelDrag();
      }}
    >
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "50% 50%",
          width,
          height,
          margin: "0 auto",
        }}
      >
        <svg
          ref={svgRef}
          width={width}
          height={height}
          viewBox={`${minX * CELL} ${minY * CELL} ${width} ${height}`}
        >
          {Array.from({ length: widthCells + 1 }, (_, i) => (
            <line
              key={`vx${i}`}
              x1={(minX + i) * CELL}
              y1={minY * CELL}
              x2={(minX + i) * CELL}
              y2={(maxY + 1) * CELL}
              stroke="#222a36"
            />
          ))}
          {Array.from({ length: heightCells + 1 }, (_, i) => (
            <line
              key={`hy${i}`}
              x1={minX * CELL}
              y1={(minY + i) * CELL}
              x2={(maxX + 1) * CELL}
              y2={(minY + i) * CELL}
              stroke="#222a36"
            />
          ))}
          {Object.entries(state.board).map(([k, cell]) => {
            const [xs, ys] = k.split(",");
            const x = Number(xs);
            const y = Number(ys);
            return (
              <g key={k}>
                <rect
                  x={x * CELL}
                  y={y * CELL}
                  width={CELL}
                  height={CELL}
                  fill={cellFill(cell)}
                  stroke={cell === "wild" ? WILD_STROKE : "#111"}
                />
                {cell === "wild" && (
                  <circle
                    cx={x * CELL + CELL / 2}
                    cy={y * CELL + CELL / 2}
                    r={CELL * 0.22}
                    fill="none"
                    stroke={WILD_STROKE}
                    strokeWidth={2}
                  />
                )}
              </g>
            );
          })}
          {!state.noAssistance &&
            candidates.map((c, idx) => {
              const fp = tileFootprint(c.x, c.y, c.orientation);
              return (
                <g key={`cand-${idx}`}>
                  {fp.map(([fx, fy], i) => (
                    <rect
                      key={i}
                      x={fx * CELL}
                      y={fy * CELL}
                      width={CELL}
                      height={CELL}
                      fill="#ffffff22"
                      stroke="#ffffff88"
                      strokeDasharray="4 3"
                      onClick={() => onCellClick(c.x, c.y)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </g>
              );
            })}
        </svg>
      </div>
      {/* Reuse Board itself would be nice — we're not for minimal wiring. */}
      {void tiles /* unused */}
    </div>
  );
}

function RemoteHand({
  state,
  disabled,
  onPlay,
}: {
  state: GameState;
  disabled: boolean;
  onPlay: (m: Move) => void;
}) {
  const {
    selfPlayerId,
    selected,
    select,
    rotateSelected,
    flipSelected,
    tiles,
    dragging,
    clearDrag,
  } = useGameStore();
  const me = state.players.find((p) => p.id === selfPlayerId);

  // Drag tracking refs (no-assistance mode)
  const pendingRef = useRef<{
    tileId: number;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    orientation: import("@/lib/types").Orientation;
    flip: boolean;
    active: boolean;
  } | null>(null);
  const dragBlockRef = useRef(false);
  const floatingRef = useRef<HTMLDivElement>(null);

  // Set initial floating tile position / trigger cancel animation
  useLayoutEffect(() => {
    if (!dragging || !floatingRef.current) return;
    const el = floatingRef.current;
    const isH = dragging.orientation === "h";
    if (dragging.cancelling) {
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
      const frame = requestAnimationFrame(() => {
        el.style.transition = "left 0.25s ease-in, top 0.25s ease-in";
        el.style.left = `${dragging.originX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
        el.style.top = `${dragging.originY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
      });
      return () => cancelAnimationFrame(frame);
    } else {
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging?.tileId, dragging?.cancelling]);

  if (!me) return null;
  const canDraw = state.noAssistance
    ? !disabled
    : !disabled && !hasAnyLegalPlay(state, me.id);

  function makeTilePointerDown(tileId: number) {
    if (!state.noAssistance || disabled) return undefined;
    return (e: React.PointerEvent<HTMLDivElement>) => {
      // Same fix as Hand.tsx: release on e.target (the actual touched element)
      // so that pointerup reaches the board on mobile.
      (e.target as Element).releasePointerCapture(e.pointerId);
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const curSel = useGameStore.getState().selected;
      const orientation: import("@/lib/types").Orientation =
        curSel?.tileId === tileId ? curSel.orientation : "h";
      const flip: boolean = curSel?.tileId === tileId ? curSel.flip : false;
      pendingRef.current = {
        tileId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.left + rect.width / 2,
        originY: rect.top + rect.height / 2,
        orientation,
        flip,
        active: false,
      };

      const onMove = (ev: PointerEvent) => {
        if (
          !pendingRef.current ||
          ev.pointerId !== pendingRef.current.pointerId
        )
          return;
        const dx = ev.clientX - pendingRef.current.startX;
        const dy = ev.clientY - pendingRef.current.startY;
        if (!pendingRef.current.active && Math.hypot(dx, dy) > 5) {
          pendingRef.current.active = true;
          dragBlockRef.current = true;
          const p = pendingRef.current;
          useGameStore
            .getState()
            .startDrag(
              p.tileId,
              p.orientation,
              p.flip,
              ev.clientX,
              ev.clientY,
              p.originX,
              p.originY,
            );
        }
        if (pendingRef.current.active) {
          useGameStore.getState().updateDrag(ev.clientX, ev.clientY);
          if (floatingRef.current) {
            const isH = pendingRef.current.orientation === "h";
            floatingRef.current.style.left = `${ev.clientX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
            floatingRef.current.style.top = `${ev.clientY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
          }
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (
          !pendingRef.current ||
          ev.pointerId !== pendingRef.current.pointerId
        )
          return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const wasActive = pendingRef.current.active;
        pendingRef.current = null;
        if (wasActive) {
          const d = useGameStore.getState().dragging;
          if (d && !d.cancelling) useGameStore.getState().cancelDrag();
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  const dragTile = dragging
    ? tiles.find((t) => t.id === dragging.tileId)
    : null;

  return (
    <div
      className="safe-bottom"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        background: "#1b2028",
        borderTop: "1px solid #2a2f3a",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ color: !disabled ? "#4ade80" : "#aaa" }}>
          {!disabled
            ? "轮到您了"
            : state.phase === "ended"
              ? "游戏结束"
              : `等待中 — ${state.players[state.currentPlayerIndex]?.name}`}
        </strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!selected || disabled} onClick={rotateSelected}>
            旋转
          </button>
          <button disabled={!selected || disabled} onClick={flipSelected}>
            翻转
          </button>
          <button disabled={!canDraw} onClick={() => onPlay({ type: "draw" })}>
            {state.bag.length === 0
              ? "跳过"
              : `摘牌（剩 ${state.bag.length} 张）`}
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          height: HAND_CELL * 3,
          alignItems: "center",
        }}
      >
        {me.hand.map((t) => {
          const isSel = selected?.tileId === t.id;
          const isDraggingThis = dragging?.tileId === t.id;
          return (
            <div
              key={t.id}
              style={{
                opacity: isDraggingThis ? 0.3 : 1,
                width: HAND_CELL * 3,
                height: HAND_CELL * 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                onPointerDown={makeTilePointerDown(t.id)}
                style={{ touchAction: "none", display: "flex" }}
              >
                <TileSvg
                  tile={t}
                  orientation={isSel ? selected!.orientation : "h"}
                  flip={isSel ? selected!.flip : false}
                  size={HAND_CELL}
                  selected={isSel}
                  onClick={() => {
                    if (disabled) return;
                    if (dragBlockRef.current) {
                      dragBlockRef.current = false;
                      return;
                    }
                    if (isSel) select(null);
                    else
                      select({ tileId: t.id, flip: false, orientation: "h" });
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {dragging && dragTile && (
        <div
          ref={floatingRef}
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 9999,
            opacity: 0.85,
          }}
          onTransitionEnd={(e) => {
            if (e.propertyName === "left") clearDrag();
          }}
        >
          <TileSvg
            tile={dragTile}
            orientation={dragging.orientation}
            flip={dragging.flip}
            size={CELL}
          />
        </div>
      )}
    </div>
  );
}
