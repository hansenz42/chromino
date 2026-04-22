"use client";
import { useState } from "react";
import type { GameState } from "@/lib/types";

export function PlayerPanel({
  state,
  onLeave,
}: {
  state: GameState;
  onLeave?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "8px 12px",
          background: "#1b2028",
          borderBottom: "1px solid #2a2f3a",
          overflowX: "auto",
          flexShrink: 0,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {state.players.map((p, i) => {
          const active =
            i === state.currentPlayerIndex && state.phase === "playing";
          const winner = state.winners.includes(p.id);
          return (
            <div
              key={p.id}
              style={{
                padding: "5px 8px",
                borderRadius: 6,
                background: active ? "#2a3141" : "#222836",
                border: active ? "1px solid #4ade80" : "1px solid #2a2f3a",
                color: winner ? "#fbbf24" : "#eee",
                minWidth: 80,
                flexShrink: 0,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {p.name}
                {p.isAI && " 🤖"}
                {p.isHost && " 👑"}
                {winner && " 🏆"}
              </div>
              <div style={{ fontSize: 11, color: "#aaa" }}>
                {p.hand.length} 张牌{p.connected === false && " · 已断线"}
              </div>
            </div>
          );
        })}
        <div
          style={{
            marginLeft: "auto",
            alignSelf: "center",
            fontSize: 11,
            color: "#aaa",
            flexShrink: 0,
            paddingLeft: 4,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          剩 {state.bag.length} 张
          {onLeave && (
            <button
              onClick={() => setConfirming(true)}
              style={{
                fontSize: 11,
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid #4a3030",
                color: "#f87171",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              退出房间
            </button>
          )}
        </div>
      </div>

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
            <div style={{ fontSize: 16, fontWeight: 600 }}>退出房间？</div>
            <div style={{ fontSize: 13, color: "#aaa" }}>
              游戏进度将会丢失，确认退出？
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirming(false)} style={{ flex: 1 }}>
                取消
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLeave?.();
                }}
                style={{
                  flex: 1,
                  background: "#dc2626",
                  border: "none",
                  color: "#fff",
                }}
              >
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
