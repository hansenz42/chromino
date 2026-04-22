"use client";
import { useState } from "react";
import type { GameState } from "@/lib/types";
import { TileSvg } from "@/components/Tile";

export function PlayerPanel({
  state,
  selfPlayerId,
  onLeave,
}: {
  state: GameState;
  selfPlayerId?: string | null;
  onLeave?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      {/* ── Row 1: header bar ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          height: 36,
          background: "#1b2028",
          borderBottom: "1px solid #2a2f3a",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: "0.03em",
            color: "#4ade80",
            fontFamily: "monospace",
          }}
        >
          chromino
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, color: "#aaa" }}>
            剩 {state.bag.length} 张
          </span>
          {onLeave && (
            <button
              onClick={() => setConfirming(true)}
              style={{
                fontSize: 12,
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid #4a3030",
                color: "#f87171",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              退出
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: player cards (horizontally scrollable) ── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "6px 10px",
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
          const lastTile = p.hand.length === 1;

          // Build status emoji string
          const statusEmoji = [
            p.aiTakeover ? "🤖" : p.isAI ? "🤖" : null,
            p.isHost ? "👑" : null,
            winner ? "🏆" : null,
          ]
            .filter(Boolean)
            .join("");

          return (
            <div
              key={p.id}
              style={{
                padding: "4px 7px",
                borderRadius: 6,
                background: active ? "#2a3141" : "#222836",
                border: active ? "1px solid #4ade80" : "1px solid #2a2f3a",
                color: winner ? "#fbbf24" : "#eee",
                flexShrink: 0,
                opacity: p.aiTakeover ? 0.75 : 1,
                minWidth: 64,
                display: "flex",
                flexDirection: "column",
                gap: 3,
              }}
            >
              {/* Line 1: player name + self badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    fontWeight: 600,
                    fontSize: 12,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                >
                  {p.name}
                </span>
                {p.id === selfPlayerId && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "#6b7280",
                      background: "rgba(107,114,128,0.15)",
                      border: "1px solid rgba(107,114,128,0.3)",
                      borderRadius: 3,
                      padding: "0 3px",
                      lineHeight: "14px",
                      flexShrink: 0,
                    }}
                  >
                    我
                  </span>
                )}
              </div>

              {/* Line 2: status + hand count + tile icon [+ last tile face] */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  flexWrap: "nowrap",
                }}
              >
                {statusEmoji && (
                  <span style={{ fontSize: 10, lineHeight: 1 }}>
                    {statusEmoji}
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: lastTile ? "#fbbf24" : "#aaa",
                    fontWeight: lastTile ? 600 : 400,
                  }}
                >
                  {p.hand.length}
                </span>
                {/* Generic tile icon: three small squares */}
                <svg
                  width={24}
                  height={8}
                  viewBox="0 0 24 8"
                  style={{ display: "block", flexShrink: 0 }}
                >
                  {[0, 8, 16].map((x) => (
                    <rect
                      key={x}
                      x={x}
                      y={0}
                      width={7}
                      height={7}
                      rx={1}
                      fill={lastTile ? "#fbbf24" : "#555"}
                    />
                  ))}
                </svg>
                {lastTile && (
                  <>
                    <TileSvg tile={p.hand[0]} size={14} orientation="h" />
                    <span
                      style={{
                        fontSize: 9,
                        color: "#fbbf24",
                        background: "rgba(251,191,36,0.15)",
                        border: "1px solid rgba(251,191,36,0.4)",
                        borderRadius: 3,
                        padding: "0 3px",
                        lineHeight: "14px",
                      }}
                    >
                      公开
                    </span>
                  </>
                )}
                {p.connected === false && !p.aiTakeover && (
                  <span style={{ fontSize: 9, color: "#6b7280" }}>断线</span>
                )}
              </div>
            </div>
          );
        })}
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
