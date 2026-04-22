"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { useGameStore } from "@/lib/game-store";
import { Board } from "@/components/Board";
import { Hand } from "@/components/Hand";
import { PlayerPanel } from "@/components/PlayerPanel";
import { generateAllTiles } from "@/lib/tile-generator";
import type { GameState, Move } from "@/lib/types";
import {
  BTN_DANGER,
  BTN_DANGER_OUTLINE,
  BTN_DEFAULT,
  BTN_PRIMARY,
  BTN_SECONDARY,
  MODAL_BACKDROP,
  MODAL_CARD,
} from "@/lib/ui-classes";
import { useTranslations, useLocale } from "next-intl";
import { useUIStore } from "@/lib/ui-store";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

export default function RemoteGamePage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("game");
  const code = params.code.toUpperCase();

  const tiles = useMemo(() => generateAllTiles(), []);
  const { state, setTiles, setState, setSelf, selfPlayerId, selected, select } =
    useGameStore();
  const { setOnLeave } = useUIStore();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [disbanded, setDisbanded] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    setTiles(tiles);
  }, [tiles, setTiles]);

  useEffect(() => {
    let playerId = localStorage.getItem(PID_KEY);
    if (!playerId) {
      playerId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : "p_" + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(PID_KEY, playerId);
    }
    const nickname =
      localStorage.getItem(NICK_KEY) ?? t("defaultPlayer" as never) ?? "Player";
    setSelf(playerId);
    localStorage.setItem(LAST_GAME_KEY, code);

    (async () => {
      try {
        const res = await fetch(`/api/game/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ playerId, name: nickname }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setError(j.error ?? `HTTP ${res.status}`);
          setJoining(false);
          return;
        }
        const s = (await res.json()) as GameState;
        setState(s);
        setJoining(false);

        const es = new EventSource(`/api/game/${code}/events`);
        esRef.current = es;
        es.addEventListener("state", (ev) => {
          try {
            const next = JSON.parse((ev as MessageEvent).data) as GameState;
            setState(next);
            setIsConnected(true);
          } catch {
            /* ignore */
          }
        });
        es.addEventListener("error", () => {
          setIsConnected(false);
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "join failed");
        setJoining(false);
      }
    })();

    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (state?.phase === "disbanded") {
      esRef.current?.close();
      localStorage.removeItem(LAST_GAME_KEY);
      setDisbanded(true);
    }
  }, [state?.phase]);

  async function handleLeave() {
    const amHost = state?.players.find((p) => p.isHost)?.id === selfPlayerId;
    esRef.current?.close();
    if (amHost) {
      await fetch(`/api/game/${code}/disband`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: selfPlayerId }),
      });
    } else if (selfPlayerId) {
      await fetch(`/api/game/${code}/leave`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selfPlayerId }),
      });
    }
    localStorage.removeItem(LAST_GAME_KEY);
    router.push(`/${locale}`);
  }
  useEffect(() => {
    setOnLeave(handleLeave);
    return () => setOnLeave(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const postAction = useCallback(
    async (move: Move) => {
      if (!selfPlayerId) return;
      const res = await fetch(`/api/game/${code}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: selfPlayerId, move }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        alert(j.error ?? `HTTP ${res.status}`);
        return;
      }
      const s = (await res.json()) as GameState;
      setState(s);
      select(null);
    },
    [code, selfPlayerId, setState, select],
  );

  if (disbanded)
    return (
      <Centered>
        <div className="text-center flex flex-col gap-3">
          <div className="text-base font-semibold">{t("disbanded")}</div>
          <div className="text-[13px] text-muted">{t("roomGone")}</div>
          <a
            href={`/${locale}`}
            className="text-primary text-sm hover:underline"
          >
            {t("backHome")}
          </a>
        </div>
      </Centered>
    );
  if (joining) return <Centered>{t("connecting")}</Centered>;
  if (error)
    return (
      <Centered>
        <div className="text-center flex flex-col gap-3">
          <div className="text-[15px] font-semibold">{t("joinFailed")}</div>
          <div className="text-[13px] text-muted">{error}</div>
          <a
            href={`/${locale}`}
            className="text-primary text-sm hover:underline"
          >
            {t("backHome")}
          </a>
        </div>
      </Centered>
    );
  if (!state) return <Centered>{t("loading")}</Centered>;

  if (state.phase === "lobby") {
    return (
      <Lobby
        state={state}
        code={code}
        selfPlayerId={selfPlayerId}
        onLeave={handleLeave}
      />
    );
  }

  const selectedTileId = selected?.tileId ?? null;
  const me = state.players.find((p) => p.id === selfPlayerId);
  const isMyTurn =
    !!me &&
    state.players[state.currentPlayerIndex]?.id === me.id &&
    state.phase === "playing";

  return (
    <main className="flex flex-col h-full">
      <PlayerPanel state={state} selfPlayerId={selfPlayerId} />
      {!isConnected && (
        <div className="bg-banner text-banner-fg text-center px-3 py-1.5 text-[13px] shrink-0">
          {t("connectionLost")}
        </div>
      )}
      <div className="flex-1 relative min-h-0 overflow-hidden">
        <Board
          state={state}
          tiles={tiles}
          selectedTileId={isMyTurn ? selectedTileId : null}
          onPlay={postAction}
        />
      </div>
      <Hand state={state} onPlay={isMyTurn ? postAction : undefined} />
      {state.phase === "ended" && <EndOverlay state={state} locale={locale} />}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-full flex items-center justify-center">
      <div>{children}</div>
    </main>
  );
}

function Lobby({
  state,
  code,
  selfPlayerId,
  onLeave,
}: {
  state: GameState;
  code: string;
  selfPlayerId: string | null;
  onLeave: () => void;
}) {
  const t = useTranslations("game");
  const locale = useLocale();
  const host = state.players.find((p) => p.isHost);
  const isHost = host?.id === selfPlayerId;
  const [confirming, setConfirming] = useState(false);
  const [copied, setCopied] = useState(false);

  const aiSeats = state.lobbyAiSeats ?? 0;
  const noAssistance = state.lobbyNoAssistance ?? false;
  const total = state.players.length + aiSeats;

  function copyCode() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function patchSettings(patch: {
    aiSeats?: number;
    noAssistance?: boolean;
  }) {
    await fetch(`/api/game/${code}/lobby-settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, ...patch }),
    });
  }

  async function start() {
    await fetch(`/api/game/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId }),
    });
  }
  async function kick(targetId: string) {
    await fetch(`/api/game/${code}/kick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: selfPlayerId, targetId }),
    });
  }

  return (
    <>
      <main className="min-h-full flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl p-[clamp(16px,5vw,24px)] w-[min(100%,480px)] flex flex-col gap-3">
          <div className="flex items-center gap-2.5">
            <h2 className="m-0">{t("lobbyTitle")}</h2>
            <button
              onClick={copyCode}
              title={t("copyCodeHint")}
              className={clsx(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                "border border-border-3 text-[15px] font-bold tracking-[2px] cursor-pointer",
                "font-mono transition-colors",
                copied
                  ? "bg-primary-bg text-primary"
                  : "bg-surface-3 text-fg-2",
              )}
            >
              {code}
              <span className="text-xs font-normal tracking-normal font-sans opacity-70">
                {copied ? t("copied") : t("copy")}
              </span>
            </button>
          </div>
          <p className="m-0 text-muted text-[13px]">{t("shareCode")}</p>
          <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
            {state.players.map((p) => (
              <li
                key={p.id}
                className="flex justify-between items-center px-3 py-2.5 min-h-[44px] bg-surface-3 rounded-md"
              >
                <span>
                  {p.name}
                  {p.isHost && " 👑"}
                  {p.id === selfPlayerId && ` ${t("me")}`}
                </span>
                {isHost && !p.isHost && (
                  <button
                    onClick={() => kick(p.id)}
                    className="bg-transparent border border-border-3 text-muted rounded cursor-pointer px-2 py-0.5 text-[13px]"
                  >
                    {t("kickPlayer")}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {aiSeats > 0 && (
            <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
              {Array.from({ length: aiSeats }, (_, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center px-3 py-2.5 min-h-[44px] bg-ai-surface rounded-md border border-dashed border-border-3"
                >
                  <span className="text-muted text-[13px]">🤖 AI {i + 1}</span>
                  {isHost && (
                    <button
                      onClick={() => patchSettings({ aiSeats: aiSeats - 1 })}
                      className="bg-transparent border border-border-danger text-danger-fg rounded cursor-pointer px-2 py-0.5 text-[13px]"
                    >
                      {t("removeAI")}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {isHost && (
            <>
              {total < 8 && (
                <button
                  onClick={() => patchSettings({ aiSeats: aiSeats + 1 })}
                  className="bg-transparent border border-dashed border-border-3 text-subtle rounded-md cursor-pointer px-3 py-2.5 text-[13px] text-left"
                >
                  {t("addAI")}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-2.5 mt-0.5">
                {(
                  [
                    {
                      value: true,
                      label: t("offlineMode"),
                      sub: t("offlineSub"),
                    },
                    {
                      value: false,
                      label: t("assistedMode"),
                      sub: t("assistedSubHost"),
                    },
                  ] as { value: boolean; label: string; sub: string }[]
                ).map(({ value, label, sub }) => {
                  const active = noAssistance === value;
                  return (
                    <button
                      key={String(value)}
                      onClick={() => patchSettings({ noAssistance: value })}
                      className={clsx(
                        "rounded-lg px-2 py-2.5 cursor-pointer text-center leading-snug",
                        "border-2 transition-colors",
                        active
                          ? "border-primary bg-primary-bg text-primary"
                          : "border-border bg-transparent text-subtle",
                      )}
                    >
                      <div className="font-semibold text-[13px]">{label}</div>
                      <div className="text-[11px] mt-0.5 opacity-80">{sub}</div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {isHost ? (
            <button
              onClick={start}
              disabled={total < 1 || total > 8}
              className={BTN_PRIMARY}
            >
              {t("startGame")}
            </button>
          ) : (
            <p className="text-subtle m-0">{t("waitingHost")}</p>
          )}
          <button
            onClick={() => setConfirming(true)}
            className={BTN_DANGER_OUTLINE}
          >
            {isHost ? t("disbandRoom") : t("leaveLobby")}
          </button>
        </div>
      </main>

      {confirming && (
        <div className={MODAL_BACKDROP} onClick={() => setConfirming(false)}>
          <div className={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">
              {isHost ? t("disbandConfirmTitle") : t("leaveConfirmTitle")}
            </div>
            <div className="text-[13px] text-muted">
              {isHost ? t("disbandConfirmMsg") : t("leaveConfirmMsg")}
            </div>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => setConfirming(false)}
                className={clsx(BTN_SECONDARY, "flex-1")}
              >
                {t("cancel")}
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLeave();
                }}
                className={clsx(BTN_DANGER, "flex-1")}
              >
                {t("confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function EndOverlay({ state, locale }: { state: GameState; locale: string }) {
  const t = useTranslations("game");
  const names = state.winners.map(
    (id) => state.players.find((p) => p.id === id)?.name ?? id,
  );
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-surface p-6 rounded-xl text-center">
        <h2>{t("gameOver")}</h2>
        <p>{t("winner", { names: names.join("、") || "—" })}</p>
        <a href={`/${locale}`} className="text-link hover:underline">
          {t("backMainMenu")}
        </a>
      </div>
    </div>
  );
}
