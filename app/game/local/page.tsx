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
      const t = setTimeout(() => stepAIIfNeeded(), 1000);
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
      <PlayerPanel
        state={state}
        selfPlayerId={selfPlayerId}
        onLeave={handleLeave}
      />
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
            router.push("/");
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
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#111827",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        zIndex: 100,
      }}
    >
      <p style={{ color: "#9ca3af", margin: 0, fontSize: 14 }}>
        请将设备传递给
      </p>
      <p
        style={{
          color: "#f9fafb",
          margin: 0,
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: "0.01em",
        }}
      >
        {playerName}
      </p>
      <button
        onClick={onAcknowledge}
        style={{
          marginTop: 8,
          padding: "12px 32px",
          background: "#4ade80",
          color: "#111827",
          border: "none",
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        开始我的回合
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
