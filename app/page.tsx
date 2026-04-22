"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10);
}

type View = "home" | "online";

export default function Home() {
  const router = useRouter();
  const [view, setView] = useState<View>("home");
  const [nick, setNick] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [lastGame, setLastGame] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
            <button
              style={btnPrimary}
              onClick={() => router.push("/game/local")}
            >
              本地游戏
            </button>
            <button style={btnSecondary} onClick={goOnline}>
              联机游戏
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
