"use client";
import clsx from "clsx";
import type { GameState } from "@/lib/types";
import { TileSvg } from "@/components/Tile";
import { useTranslations } from "next-intl";

export function PlayerPanel({
  state,
  selfPlayerId,
}: {
  state: GameState;
  selfPlayerId?: string | null;
}) {
  const t = useTranslations("playerPanel");

  return (
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
                  {t("meTag")}
                </span>
              )}
            </div>

            {/* Line 2 */}
            <div className="flex items-center gap-[3px] flex-nowrap">
              {statusEmoji && (
                <span className="text-[10px] leading-none">{statusEmoji}</span>
              )}
              {!lastTile && (
                <span className="text-[11px] text-muted font-normal">
                  {t("tileCount", { count: p.hand.length })}
                </span>
              )}
              {lastTile && (
                <TileSvg tile={p.hand[0]} size={14} orientation="h" />
              )}
              {p.connected === false && !p.aiTakeover && (
                <span className="text-[9px] text-subtle-2">
                  {t("disconnected")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
