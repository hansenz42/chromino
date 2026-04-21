"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game-store";
import { Board } from "@/components/Board";
import { Hand } from "@/components/Hand";
import { PlayerPanel } from "@/components/PlayerPanel";
import { generateAllTiles } from "@/lib/tile-generator";
import type { Player } from "@/lib/types";

type SetupPlayer = { id: string; name: string; isAI: boolean };

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10);
}

export default function LocalGamePage() {
  const tiles = useMemo(() => generateAllTiles(), []);
  const { state, setTiles, startLocal, stepAIIfNeeded, selected, resetGame } =
    useGameStore();
  const router = useRouter();

  const [seats, setSeats] = useState<SetupPlayer[]>(() => {
    const myName =
      typeof window !== "undefined"
        ? (localStorage.getItem("chromino_nickname") ?? "我")
        : "我";
    const myId =
      typeof window !== "undefined"
        ? (localStorage.getItem("chromino_player_id") ?? uuid())
        : uuid();
    return [
      { id: myId, name: myName, isAI: false },
      { id: uuid(), name: "AI Bob", isAI: true },
    ];
  });

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  // Drive AI turns
  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.isAI) {
      const t = setTimeout(() => stepAIIfNeeded(), 600);
      return () => clearTimeout(t);
    }
  }, [state, stepAIIfNeeded]);

  if (!state) {
    return (
      <Setup
        seats={seats}
        setSeats={setSeats}
        onBack={() => router.push("/")}
        onStart={(players, selfId, noAssistance) => {
          startLocal(
            {
              code: "LOCAL",
              players: players.map<Omit<Player, "hand" | "connected">>(
                (p, i) => ({
                  id: p.id,
                  name: p.name,
                  isAI: p.isAI,
                  isHost: i === 0,
                }),
              ),
              noAssistance,
            },
            selfId,
          );
        }}
      />
    );
  }

  const selectedTileId = selected?.tileId ?? null;

  function handleLeave() {
    resetGame();
    router.push("/");
  }

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
        <Board state={state} tiles={tiles} selectedTileId={selectedTileId} />
      </div>
      <Hand state={state} />
      {state.phase === "ended" && (
        <EndOverlay winners={state.winners} players={state.players} />
      )}
    </main>
  );
}

function EndOverlay({
  winners,
  players,
}: {
  winners: string[];
  players: Player[];
}) {
  const names = winners.map(
    (id) => players.find((p) => p.id === id)?.name ?? id,
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
        <button onClick={() => location.reload()}>再玩一局</button>
      </div>
    </div>
  );
}

function Setup({
  seats,
  setSeats,
  onStart,
  onBack,
}: {
  seats: SetupPlayer[];
  setSeats: (s: SetupPlayer[]) => void;
  onStart: (
    players: SetupPlayer[],
    selfId: string,
    noAssistance: boolean,
  ) => void;
  onBack: () => void;
}) {
  const [noAssistance, setNoAssistance] = useState(false);
  function update(i: number, patch: Partial<SetupPlayer>) {
    setSeats(seats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    if (seats.length >= 4) return;
    setSeats([
      ...seats,
      { id: uuid(), name: `AI ${seats.length + 1}`, isAI: true },
    ]);
  }
  function remove(i: number) {
    if (seats.length <= 1 || i === 0) return;
    setSeats(seats.filter((_, idx) => idx !== i));
  }

  return (
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
          gap: 14,
          border: "1px solid #2a2f3a",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={onBack}
            style={{
              background: "transparent",
              border: "1px solid #2a2f3a",
              color: "#aaa",
              borderRadius: 6,
              padding: "3px 10px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            ← 返回
          </button>
          <h2 style={{ margin: 0 }}>本地游戏设置</h2>
        </div>
        <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
          添加 1–4 个平位。座位 1 是您；其世可为人类（传递局）或 AI。
        </p>
        {seats.map((s, i) => (
          <div
            key={s.id}
            style={{ display: "flex", gap: 8, alignItems: "center" }}
          >
            <span style={{ width: 24, color: "#888" }}>{i + 1}.</span>
            <input
              value={s.name}
              onChange={(e) => update(i, { name: e.target.value })}
              style={{ flex: 1 }}
              disabled={i === 0}
            />
            <label
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                fontSize: 13,
              }}
            >
              <input
                type="checkbox"
                checked={s.isAI}
                onChange={(e) => update(i, { isAI: e.target.checked })}
                disabled={i === 0}
              />
              AI
            </label>
            <button
              onClick={() => remove(i)}
              disabled={i === 0 || seats.length <= 1}
            >
              ×
            </button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={add} disabled={seats.length >= 4}>
            添加玩家
          </button>
          <button
            onClick={() => onStart(seats, seats[0].id, noAssistance)}
            disabled={seats.length < 1}
            style={{ marginLeft: "auto", background: "#4ade80", color: "#111" }}
          >
            开始游戏
          </button>
        </div>
        <label
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 13,
            color: "#aaa",
            cursor: "pointer",
            borderTop: "1px solid #2a2f3a",
            paddingTop: 10,
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
      </div>
    </main>
  );
}
