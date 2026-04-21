"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { generateMatchCode } from "@/lib/match-code";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  const router = useRouter();
  const [nick, setNick] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [lastGame, setLastGame] = useState<string | null>(null);

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
    const pid = localStorage.getItem(PID_KEY)!;
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, hostName: name }),
    });
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

  function goLocal() {
    saveNick(nick.trim() || "玩家");
    router.push("/game/local");
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
          padding: "clamp(16px, 5vw, 28px)",
          borderRadius: 12,
          width: "min(100%, 420px)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          border: "1px solid #2a2f3a",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Chromino</h1>
        <p style={{ margin: 0, color: "#aaa" }}>1–4 人·人机对战·本地或联机</p>

        <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontSize: 13, color: "#aaa" }}>您的名字</span>
          <input
            value={nick}
            onChange={(e) => saveNick(e.target.value)}
            placeholder="昵称"
          />
        </label>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button onClick={goLocal}>本地游戏（对战 AI / 传递局）</button>
          <button onClick={createRemote}>创建联机游戏</button>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="房间代码"
              maxLength={6}
              style={{ flex: 1 }}
            />
            <button onClick={joinRemote}>加入</button>
          </div>
          {lastGame && (
            <button onClick={() => router.push(`/game/${lastGame}`)}>
              重新加入上局游戏（{lastGame}）
            </button>
          )}
        </div>

        <div style={{ fontSize: 12, color: "#666" }}>
          提示：房间代码为 6 个字符，例如：{generateMatchCode()}
        </div>
      </div>
    </main>
  );
}
