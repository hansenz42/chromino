"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game-store";
import type { Player } from "@/lib/types";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10);
}

type SetupPlayer = { id: string; name: string; isAI: boolean };

type View = "home" | "online" | "local";

export default function Home() {
  const router = useRouter();
  const { startLocal, state: localState, resetGame } = useGameStore();
  const [view, setView] = useState<View>("home");
  const [nick, setNick] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [lastGame, setLastGame] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [seats, setSeats] = useState<SetupPlayer[]>([]);
  const [noAssistance, setNoAssistance] = useState(true);

  useEffect(() => {
    const n = localStorage.getItem(NICK_KEY) ?? "";
    setNick(n);
    if (!localStorage.getItem(PID_KEY)) {
      localStorage.setItem(PID_KEY, uuid());
    }
    setLastGame(localStorage.getItem(LAST_GAME_KEY));
  }, []);

  function saveNick(v: string) {
    setNick(v);
    localStorage.setItem(NICK_KEY, v);
  }

  async function createRemote() {
    const name = nick.trim() || "玩家";
    saveNick(name);
    setCreating(true);
    const pid = localStorage.getItem(PID_KEY)!;
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, hostName: name }),
    });
    setCreating(false);
    if (!res.ok) {
      alert("创建游戏失败");
      return;
    }
    const { code } = (await res.json()) as { code: string };
    localStorage.setItem(LAST_GAME_KEY, code);
    router.push(`/game/${code}`);
  }

  function joinRemote() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    saveNick(nick.trim() || "玩家");
    router.push(`/game/${code}`);
  }

  function goOnline() {
    setShowJoin(false);
    setJoinCode("");
    setView("online");
  }

  function goBack() {
    setView("home");
    setShowJoin(false);
    setJoinCode("");
  }

  function goLocal() {
    const myName = localStorage.getItem(NICK_KEY) ?? "我";
    const myId = localStorage.getItem(PID_KEY) ?? uuid();
    setSeats([
      { id: myId, name: myName, isAI: false },
      { id: uuid(), name: "AI Bob", isAI: true },
    ]);
    setNoAssistance(true);
    setView("local");
  }

  function updateSeat(i: number, patch: Partial<SetupPlayer>) {
    setSeats((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  }

  function addSeat() {
    if (seats.length >= 4) return;
    setSeats((prev) => [
      ...prev,
      { id: uuid(), name: `AI ${prev.length + 1}`, isAI: true },
    ]);
  }

  function removeSeat(i: number) {
    if (seats.length <= 1 || i === 0) return;
    setSeats((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startLocalGame() {
    const selfId = seats[0].id;
    startLocal(
      {
        code: "LOCAL",
        players: seats.map<Omit<Player, "hand" | "connected">>((p, i) => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI,
          isHost: i === 0,
        })),
        noAssistance,
      },
      selfId,
    );
    router.push("/game/local");
  }

  // ── shared card wrapper ──────────────────────────────────────────────────
  const card: React.CSSProperties = {
    background: "#1b2028",
    padding: "clamp(20px, 5vw, 32px)",
    borderRadius: 14,
    width: "min(100%, 400px)",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    border: "1px solid #2a2f3a",
  };

  const btnPrimary: React.CSSProperties = {
    padding: "12px 0",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "#4ade80",
    color: "#111",
  };

  const btnSecondary: React.CSSProperties = {
    padding: "12px 0",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid #3a4050",
    background: "transparent",
    color: "#e0e0e0",
  };

  const btnGhost: React.CSSProperties = {
    padding: "8px 0",
    borderRadius: 6,
    fontSize: 13,
    cursor: "pointer",
    border: "1px solid #2a2f3a",
    background: "transparent",
    color: "#888",
  };

  // ── HOME view ────────────────────────────────────────────────────────────
  if (view === "home") {
    return (
      <main style={mainStyle}>
        <div style={card}>
          <div>
            <h1 style={{ margin: "0 0 4px", fontSize: 30, letterSpacing: -1 }}>
              Chromino
            </h1>
            <p style={{ margin: 0, color: "#888", fontSize: 13 }}>
              1–4 人 · 人机对战 · 本地或联机
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {localState?.code === "LOCAL" ? (
              <>
                <button
                  style={btnPrimary}
                  onClick={() => router.push("/game/local")}
                >
                  继续游戏
                </button>
                <button
                  style={btnSecondary}
                  onClick={() => {
                    resetGame();
                    goLocal();
                  }}
                >
                  新建游戏
                </button>
              </>
            ) : (
              <button style={btnPrimary} onClick={goLocal}>
                本地游戏
              </button>
            )}
            <button style={btnSecondary} onClick={goOnline}>
              联机游戏
            </button>
          </div>
        </div>
        <PageFooter />
      </main>
    );
  }

  // ── LOCAL SETUP view ─────────────────────────────────────────────────────
  if (view === "local") {
    return (
      <main style={mainStyle}>
        <div
          style={{
            ...card,
            width: "min(100%, 480px)",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button style={btnGhost} onClick={goBack}>
              ← 返回
            </button>
            <h2 style={{ margin: 0 }}>本地游戏设置</h2>
          </div>
          <p style={{ margin: 0, color: "#aaa", fontSize: 13 }}>
            添加 1–4 个座位。座位 1 是您；其余可为人类（传递局）或 AI。
          </p>
          {seats.map((s, i) => (
            <div
              key={s.id}
              style={{ display: "flex", gap: 8, alignItems: "center" }}
            >
              <span style={{ width: 24, color: "#888" }}>{i + 1}.</span>
              <input
                value={s.name}
                onChange={(e) => {
                  updateSeat(i, { name: e.target.value });
                  if (i === 0) localStorage.setItem(NICK_KEY, e.target.value);
                }}
                style={{ flex: 1 }}
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
                  onChange={(e) => updateSeat(i, { isAI: e.target.checked })}
                  disabled={i === 0}
                />
                AI
              </label>
              <button
                onClick={() => removeSeat(i)}
                disabled={i === 0 || seats.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
          <button onClick={addSeat} disabled={seats.length >= 4}>
            添加玩家
          </button>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              borderTop: "1px solid #2a2f3a",
              paddingTop: 10,
            }}
          >
            {[
              { value: true, label: "线下模式", sub: "无辅助 · 需拖拽放牌" },
              { value: false, label: "辅助模式", sub: "新手模式 · 高亮提示" },
            ].map(({ value, label, sub }) => {
              const active = noAssistance === value;
              return (
                <button
                  key={String(value)}
                  onClick={() => setNoAssistance(value)}
                  style={{
                    padding: "10px 8px",
                    borderRadius: 8,
                    border: active ? "2px solid #4ade80" : "2px solid #2a2f3a",
                    background: active ? "#1a2e1f" : "transparent",
                    color: active ? "#4ade80" : "#888",
                    cursor: "pointer",
                    textAlign: "center",
                    lineHeight: 1.4,
                    transition:
                      "border-color 0.15s, background 0.15s, color 0.15s",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
                  <div style={{ fontSize: 11, marginTop: 2, opacity: 0.8 }}>
                    {sub}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ borderTop: "1px solid #2a2f3a", paddingTop: 10 }}>
            <button
              onClick={startLocalGame}
              disabled={seats.length < 1}
              style={{
                width: "100%",
                padding: "12px 0",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                border: "none",
                background: "#4ade80",
                color: "#111",
              }}
            >
              开始游戏
            </button>
          </div>
        </div>
        <PageFooter />
      </main>
    );
  }

  // ── ONLINE view ──────────────────────────────────────────────────────────
  return (
    <main style={mainStyle}>
      <div style={card}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={btnGhost} onClick={goBack}>
            ← 返回
          </button>
          <h2 style={{ margin: 0, fontSize: 18 }}>联机游戏</h2>
        </div>

        {/* name input */}
        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#aaa" }}>您的名字</span>
          <input
            value={nick}
            onChange={(e) => saveNick(e.target.value)}
            placeholder="昵称"
            autoFocus
          />
        </label>

        {/* actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            style={{ ...btnPrimary, opacity: creating ? 0.6 : 1 }}
            onClick={createRemote}
            disabled={creating}
          >
            {creating ? "创建中…" : "创建游戏"}
          </button>

          {!showJoin ? (
            <button style={btnSecondary} onClick={() => setShowJoin(true)}>
              加入游戏
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="房间代码"
                maxLength={6}
                style={{ flex: 1 }}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && joinRemote()}
              />
              <button
                style={{
                  ...btnPrimary,
                  padding: "10px 16px",
                  whiteSpace: "nowrap",
                }}
                onClick={joinRemote}
                disabled={!joinCode.trim()}
              >
                加入
              </button>
            </div>
          )}

          {lastGame && (
            <button
              style={btnGhost}
              onClick={() => router.push(`/game/${lastGame}`)}
            >
              重新加入上局游戏（{lastGame}）
            </button>
          )}
        </div>
      </div>
      <PageFooter />
    </main>
  );
}

function PageFooter() {
  return (
    <footer
      style={{
        position: "absolute",
        bottom: 16,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        gap: 20,
        fontSize: 12,
      }}
    >
      <a
        href="https://github.com/hansenz42/chromino"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#666", textDecoration: "none" }}
      >
        开源 GitHub
      </a>
      <a
        href="https://www.assen.top"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#666", textDecoration: "none" }}
      >
        开发者博客
      </a>
    </footer>
  );
}

const mainStyle: React.CSSProperties = {
  position: "relative",
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};
