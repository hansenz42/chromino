"use client";
import { useState } from "react";
import clsx from "clsx";
import type { GameState } from "@/lib/types";
import { TileSvg } from "@/components/Tile";
import { ChrominoLogo } from "@/components/ChrominoLogo";
import {
  BTN_DANGER,
  BTN_DANGER_OUTLINE,
  BTN_SECONDARY,
  MODAL_BACKDROP,
  MODAL_CARD,
} from "@/lib/ui-classes";

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
      <div className="flex items-center justify-between px-3 h-9 bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <ChrominoLogo size={20} />
          <span className="font-chromino font-semibold text-[16px] tracking-wide text-primary">
            chromino
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-muted">剩 {state.bag.length} 张</span>
          {onLeave && (
            <button
              onClick={() => setConfirming(true)}
              className={clsx(
                BTN_DANGER_OUTLINE,
                "!min-h-0 !px-2 !py-0.5 !text-xs",
              )}
            >
              退出
            </button>
          )}
        </div>
      </div>

      {/* ── Row 2: player cards ── */}
      <div className="flex gap-1.5 px-2.5 py-1.5 bg-surface border-b border-border overflow-x-auto shrink-0 [-webkit-overflow-scrolling:touch]">
        {state.players.map((p, i) => {
          const active =
            i === state.currentPlayerIndex && state.phase === "playing";
          const winner = state.winners.includes(p.id);
          const lastTile = p.hand.length === 1;

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
              className={clsx(
                "px-1.5 py-1 rounded-md border shrink-0 min-w-[64px] flex flex-col gap-[3px]",
                active
                  ? "bg-surface-hover border-primary"
                  : "bg-surface-3 border-border",
                winner ? "text-gold" : "text-fg",
                p.aiTakeover && "opacity-75",
              )}
            >
              {/* Line 1 */}
              <div className="flex items-center gap-1 min-w-0">
                <span className="font-semibold text-xs whitespace-nowrap overflow-hidden text-ellipsis min-w-0">
                  {p.name}
                </span>
                {p.id === selfPlayerId && (
                  <span className="text-[10px] text-subtle-2 bg-[rgba(107,114,128,0.15)] border border-[rgba(107,114,128,0.3)] rounded-[3px] px-[3px] leading-[14px] shrink-0">
                    我
                  </span>
                )}
              </div>

              {/* Line 2 */}
              <div className="flex items-center gap-[3px] flex-nowrap">
                {statusEmoji && (
                  <span className="text-[10px] leading-none">
                    {statusEmoji}
                  </span>
                )}
                {!lastTile && (
                  <span className="text-[11px] text-muted font-normal">
                    {p.hand.length}
                    张牌
                  </span>
                )}
                {lastTile && (
                  <TileSvg tile={p.hand[0]} size={14} orientation="h" />
                )}
                {p.connected === false && !p.aiTakeover && (
                  <span className="text-[9px] text-subtle-2">断线</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirming && (
        <div className={MODAL_BACKDROP} onClick={() => setConfirming(false)}>
          <div className={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">退出房间？</div>
            <div className="text-[13px] text-muted">
              游戏进度将会丢失，确认退出？
            </div>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => setConfirming(false)}
                className={clsx(BTN_SECONDARY, "flex-1")}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLeave?.();
                }}
                className={clsx(BTN_DANGER, "flex-1")}
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
