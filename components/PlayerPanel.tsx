"use client";
import type { GameState } from "@/lib/types";

export function PlayerPanel({ state }: { state: GameState }) {
  return (
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
              {p.hand.length} tiles{p.connected === false && " · off"}
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
        }}
      >
        {state.bag.length} left
      </div>
    </div>
  );
}
