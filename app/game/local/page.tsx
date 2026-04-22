"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/lib/game-store";
import { Board } from "@/components/Board";
import { Hand } from "@/components/Hand";
import { PlayerPanel } from "@/components/PlayerPanel";
import { generateAllTiles } from "@/lib/tile-generator";
import type { Player } from "@/lib/types";

export default function LocalGamePage() {
  const tiles = useMemo(() => generateAllTiles(), []);
  const { state, setTiles, stepAIIfNeeded, selected, resetGame } =
    useGameStore();
  const router = useRouter();

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  // Redirect to home if there is no active game (direct navigation or browser back without setup)
  useEffect(() => {
    if (!state) {
      router.replace("/");
    }
  }, [state, router]);

  // Drive AI turns
  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    const cur = state.players[state.currentPlayerIndex];
    if (cur.isAI) {
      const t = setTimeout(() => stepAIIfNeeded(), 600);
      return () => clearTimeout(t);
    }
  }, [state, stepAIIfNeeded]);

  if (!state) return null;

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
        <EndOverlay
          winners={state.winners}
          players={state.players}
          onPlayAgain={() => {
            resetGame();
            router.push("/");
          }}
        />
      )}
    </main>
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
        <button onClick={onPlayAgain}>再玩一局</button>
      </div>
    </div>
  );
}
