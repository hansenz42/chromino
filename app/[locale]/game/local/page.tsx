"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game-store";
import { Board } from "@/components/Board";
import { Hand } from "@/components/Hand";
import { PlayerPanel } from "@/components/PlayerPanel";
import { generateAllTiles } from "@/lib/tile-generator";
import type { Player } from "@/lib/types";
import { BTN_DEFAULT, BTN_PRIMARY } from "@/lib/ui-classes";
import { useTranslations, useLocale } from "next-intl";
import { useUIStore } from "@/lib/ui-store";

export default function LocalGamePage() {
  const tiles = useMemo(() => generateAllTiles(), []);
  const {
    state,
    setTiles,
    stepAIIfNeeded,
    selected,
    resetGame,
    selfPlayerId,
    showPrivacyScreen,
    acknowledgePrivacyScreen,
  } = useGameStore();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("game");
  const { setOnLeave } = useUIStore();

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  useEffect(() => {
    if (!state) {
      router.replace(`/${locale}`);
    }
  }, [state, router, locale]);

  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.isAI) {
      const timer = setTimeout(() => stepAIIfNeeded(), 3000);
      return () => clearTimeout(timer);
    }
  }, [state, stepAIIfNeeded]);

  useEffect(() => {
    setOnLeave(() => {
      resetGame();
      router.push(`/${locale}`);
    });
    return () => setOnLeave(null);
  }, [setOnLeave, resetGame, router, locale]);

  if (!state) return null;

  const selectedTileId = selected?.tileId ?? null;

  return (
    <main className="flex flex-col h-full">
      <PlayerPanel state={state} selfPlayerId={selfPlayerId} />
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <Board state={state} tiles={tiles} selectedTileId={selectedTileId} />
      </div>
      <Hand state={state} />
      {showPrivacyScreen && (
        <PrivacyScreen
          playerName={state.players[state.currentPlayerIndex].name}
          onAcknowledge={acknowledgePrivacyScreen}
        />
      )}
      {state.phase === "ended" && (
        <EndOverlay
          winners={state.winners}
          players={state.players}
          onPlayAgain={() => {
            resetGame();
            router.push(`/${locale}`);
          }}
        />
      )}
    </main>
  );
}

function PrivacyScreen({
  playerName,
  onAcknowledge,
}: {
  playerName: string;
  onAcknowledge: () => void;
}) {
  const t = useTranslations("game");
  return (
    <div className="fixed inset-0 bg-privacy-bg flex flex-col items-center justify-center gap-6 z-[100]">
      <p className="text-privacy-sub m-0 text-sm">{t("privacyPassDevice")}</p>
      <p className="text-privacy-name m-0 text-[28px] font-bold tracking-[0.01em]">
        {playerName}
      </p>
      <button onClick={onAcknowledge} className={`${BTN_PRIMARY} mt-2 px-8`}>
        {t("startMyTurn")}
      </button>
    </div>
  );
}

function EndOverlay({
  winners,
  players,
  onPlayAgain,
}: {
  winners: string[];
  players: Player[];
  onPlayAgain: () => void;
}) {
  const t = useTranslations("game");
  const names = winners.map(
    (id) => players.find((p) => p.id === id)?.name ?? id,
  );
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-xl text-center flex flex-col gap-3">
        <h2 className="m-0">{t("gameOver")}</h2>
        <p className="m-0">{t("winner", { names: names.join("、") || "—" })}</p>
        <button onClick={onPlayAgain} className={BTN_DEFAULT}>
          {t("playAgain")}
        </button>
      </div>
    </div>
  );
}
