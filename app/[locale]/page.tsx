"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useGameStore } from "@/lib/game-store";
import { generateRandomName } from "@/lib/name-generator";
import type { Player } from "@/lib/types";
import pkg from "@/package.json";
import { ChrominoLogo } from "@/components/ChrominoLogo";
import {
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  INPUT_BASE,
} from "@/lib/ui-classes";
import { useTranslations, useLocale } from "next-intl";

const NICK_KEY = "chromino_nickname";
const PID_KEY = "chromino_player_id";
const LAST_GAME_KEY = "chromino_last_game";

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return "p_" + Math.random().toString(36).slice(2, 10);
}

type SetupPlayer = { id: string; name: string; isAI: boolean };

type View = "home" | "online" | "local";

const MAIN_CLS = "relative min-h-full flex items-center justify-center p-4";

export default function Home() {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("home");
  const { startLocal, state: localState, resetGame } = useGameStore();
  const [view, setView] = useState<View>("home");
  const [nick, setNick] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showJoin, setShowJoin] = useState(false);
  const [lastGame, setLastGame] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [seats, setSeats] = useState<SetupPlayer[]>([]);
  const [noAssistance, setNoAssistance] = useState(true);

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
    const name = nick.trim() || t("defaultPlayer");
    saveNick(name);
    setCreating(true);
    const pid = localStorage.getItem(PID_KEY)!;
    const res = await fetch("/api/game/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, hostName: name }),
    });
    setCreating(false);
    if (!res.ok) {
      alert(t("createFailed"));
      return;
    }
    const { code } = (await res.json()) as { code: string };
    localStorage.setItem(LAST_GAME_KEY, code);
    router.push(`/${locale}/game/${code}`);
  }

  function joinRemote() {
    const code = joinCode.trim();
    if (!code) return;
    saveNick(nick.trim() || t("defaultPlayer"));
    router.push(`/${locale}/game/${code}`);
  }

  function goOnline() {
    setShowJoin(false);
    setJoinCode("");
    if (!nick.trim()) {
      saveNick(generateRandomName());
    }
    setView("online");
  }

  function goBack() {
    setView("home");
    setShowJoin(false);
    setJoinCode("");
  }

  function goLocal() {
    const myName = localStorage.getItem(NICK_KEY) ?? t("myName");
    const myId = localStorage.getItem(PID_KEY) ?? uuid();
    setSeats([
      { id: myId, name: myName, isAI: false },
      { id: uuid(), name: generateRandomName(), isAI: true },
    ]);
    setNoAssistance(true);
    setView("local");
  }

  function updateSeat(i: number, patch: Partial<SetupPlayer>) {
    setSeats((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
    );
  }

  function addSeat() {
    if (seats.length >= 8) return;
    setSeats((prev) => [
      ...prev,
      { id: uuid(), name: generateRandomName(), isAI: true },
    ]);
  }

  function removeSeat(i: number) {
    if (seats.length <= 1 || i === 0) return;
    setSeats((prev) => prev.filter((_, idx) => idx !== i));
  }

  function startLocalGame() {
    const selfId = seats[0].id;
    startLocal(
      {
        code: "LOCAL",
        players: seats.map<Omit<Player, "hand" | "connected">>((p, i) => ({
          id: p.id,
          name: p.name,
          isAI: p.isAI,
          isHost: i === 0,
        })),
        noAssistance,
      },
      selfId,
    );
    router.push(`/${locale}/game/local`);
  }

  // ── HOME view ────────────────────────────────────────────────────────────
  if (view === "home") {
    return (
      <main className={MAIN_CLS}>
        <div className={CARD}>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <ChrominoLogo size={36} />
              <h1 className="m-0 text-3xl font-chromino font-semibold tracking-wide text-primary">
                Chromino
              </h1>
            </div>
            <p className="m-0 text-subtle text-[13px]">{t("subtitle")}</p>
            <p className="m-0 mt-2 text-muted text-[13px] leading-relaxed">
              {t("description")}
              <Link
                href={`/${locale}/rules`}
                className="ml-2 text-link no-underline hover:underline"
              >
                {t("viewRules")}
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {localState?.code === "LOCAL" ? (
              <>
                <button
                  className={BTN_PRIMARY}
                  onClick={() => router.push(`/${locale}/game/local`)}
                >
                  {t("continueLocal")}
                </button>
                <button
                  className={BTN_SECONDARY}
                  onClick={() => {
                    resetGame();
                    goLocal();
                  }}
                >
                  {t("newLocal")}
                </button>
              </>
            ) : (
              <button className={BTN_PRIMARY} onClick={goLocal}>
                {t("localGame")}
              </button>
            )}
            <button className={BTN_SECONDARY} onClick={goOnline}>
              {t("onlineGame")}
            </button>
          </div>
        </div>
        <PageFooter locale={locale} />
      </main>
    );
  }

  // ── LOCAL SETUP view ─────────────────────────────────────────────────────
  if (view === "local") {
    return (
      <main className={MAIN_CLS}>
        <div
          className={clsx(
            "bg-surface border border-border rounded-2xl",
            "p-[clamp(20px,5vw,32px)] w-[min(100%,480px)] flex flex-col gap-3.5",
          )}
        >
          <div className="flex items-center gap-2.5">
            <button className={BTN_GHOST} onClick={goBack}>
              {t("back")}
            </button>
            <h2 className="m-0">{t("localSetupTitle")}</h2>
          </div>
          <p className="m-0 text-muted text-[13px]">{t("localSetupDesc")}</p>
          {seats.map((s, i) => (
            <div key={s.id} className="flex gap-2 items-center">
              <span className="w-6 text-subtle">{i + 1}.</span>
              <input
                className={clsx(INPUT_BASE, "flex-1 min-w-0")}
                value={s.name}
                onChange={(e) => {
                  updateSeat(i, { name: e.target.value });
                  if (i === 0) localStorage.setItem(NICK_KEY, e.target.value);
                }}
              />
              <label className="flex gap-1.5 items-center text-[13px] select-none">
                <button
                  role="switch"
                  aria-checked={s.isAI}
                  disabled={i === 0}
                  onClick={() => updateSeat(i, { isAI: !s.isAI })}
                  className={clsx(
                    "relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent",
                    "transition-colors duration-200 focus-visible:outline-none",
                    "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                    s.isAI ? "bg-primary" : "bg-muted/40",
                    i === 0 && "opacity-40 cursor-not-allowed",
                    i !== 0 && "cursor-pointer",
                  )}
                >
                  <span
                    className={clsx(
                      "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm",
                      "transition-transform duration-200",
                      s.isAI ? "translate-x-4" : "translate-x-0",
                    )}
                  />
                </button>
                AI
              </label>
              <button
                className={BTN_GHOST}
                onClick={() => removeSeat(i)}
                disabled={i === 0 || seats.length <= 1}
              >
                ×
              </button>
            </div>
          ))}
          <button
            className={BTN_SECONDARY}
            onClick={addSeat}
            disabled={seats.length >= 8}
          >
            {t("addPlayer")}
          </button>
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-2.5">
            {[
              { value: true, label: t("offlineMode"), sub: t("offlineSub") },
              { value: false, label: t("assistedMode"), sub: t("assistedSub") },
            ].map(({ value, label, sub }) => {
              const active = noAssistance === value;
              return (
                <button
                  key={String(value)}
                  onClick={() => setNoAssistance(value)}
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
          <div className="border-t border-border pt-2.5">
            <button
              onClick={startLocalGame}
              disabled={seats.length < 1}
              className={clsx(BTN_PRIMARY, "w-full")}
            >
              {t("startGame")}
            </button>
          </div>
        </div>
        <PageFooter locale={locale} />
      </main>
    );
  }

  // ── ONLINE view ──────────────────────────────────────────────────────────
  return (
    <main className={MAIN_CLS}>
      <div className={CARD}>
        {/* header */}
        <div className="flex items-center gap-2.5">
          <button className={BTN_GHOST} onClick={goBack}>
            {t("back")}
          </button>
          <h2 className="m-0 text-lg">{t("onlineTitle")}</h2>
        </div>

        {/* name input */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">{t("yourName")}</span>
          <div className="flex gap-2">
            <input
              className={clsx(INPUT_BASE, "flex-1 min-w-0")}
              value={nick}
              onChange={(e) => saveNick(e.target.value)}
              placeholder={t("nicknamePlaceholder")}
              autoFocus
            />
            <button
              className={BTN_GHOST}
              onClick={() => saveNick(generateRandomName())}
              title={t("randomName")}
            >
              {t("randomName")}
            </button>
          </div>
        </div>

        {/* actions */}
        <div className="flex flex-col gap-2.5">
          <button
            className={clsx(BTN_PRIMARY, creating && "opacity-60")}
            onClick={createRemote}
            disabled={creating}
          >
            {creating ? t("creating") : t("createGame")}
          </button>

          {!showJoin ? (
            <button className={BTN_SECONDARY} onClick={() => setShowJoin(true)}>
              {t("joinGame")}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                className={clsx(INPUT_BASE, "flex-1 min-w-0")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder={t("roomCodePlaceholder")}
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && joinRemote()}
              />
              <button
                className={clsx(BTN_PRIMARY, "!px-4 whitespace-nowrap")}
                onClick={joinRemote}
                disabled={!joinCode.trim()}
              >
                {t("join")}
              </button>
            </div>
          )}

          {lastGame && (
            <button
              className={BTN_GHOST}
              onClick={() => router.push(`/${locale}/game/${lastGame}`)}
            >
              {t("rejoinLastGame", { code: lastGame })}
            </button>
          )}
        </div>
      </div>
      <PageFooter locale={locale} />
    </main>
  );
}

function PageFooter({ locale: _locale }: { locale: string }) {
  return (
    <footer className="absolute bottom-4 left-0 right-0 flex justify-center text-[11px] text-subtle">
      v{pkg.version}
    </footer>
  );
}
