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

const MAIN_CLS = "relative min-h-dvh flex items-center justify-center p-4";

export default function Home() {
  const router = useRouter();
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
    const name = nick.trim() || "玩家";
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
      alert("创建游戏失败");
      return;
    }
    const { code } = (await res.json()) as { code: string };
    localStorage.setItem(LAST_GAME_KEY, code);
    router.push(`/game/${code}`);
  }

  function joinRemote() {
    const code = joinCode.trim();
    if (!code) return;
    saveNick(nick.trim() || "玩家");
    router.push(`/game/${code}`);
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
    const myName = localStorage.getItem(NICK_KEY) ?? "我";
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
    router.push("/game/local");
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
            <p className="m-0 text-subtle text-[13px]">
              1–8 人 · 人机对战 · 本地或联机
            </p>
            <p className="m-0 mt-2 text-muted text-[13px] leading-relaxed">
              一款以多色骨牌为主题的策略游戏，竞相打出手中所有骨牌来获得胜利
              <Link
                href="/rules"
                className="ml-2 text-link no-underline hover:underline"
              >
                查看规则 →
              </Link>
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            {localState?.code === "LOCAL" ? (
              <>
                <button
                  className={BTN_PRIMARY}
                  onClick={() => router.push("/game/local")}
                >
                  继续游戏
                </button>
                <button
                  className={BTN_SECONDARY}
                  onClick={() => {
                    resetGame();
                    goLocal();
                  }}
                >
                  新建游戏
                </button>
              </>
            ) : (
              <button className={BTN_PRIMARY} onClick={goLocal}>
                本地游戏
              </button>
            )}
            <button className={BTN_SECONDARY} onClick={goOnline}>
              联机对战
            </button>
          </div>
        </div>
        <PageFooter />
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
              ← 返回
            </button>
            <h2 className="m-0">本地游戏设置</h2>
          </div>
          <p className="m-0 text-muted text-[13px]">
            添加 1–8 个座位。座位 1 是您；其余可为人类（传递局）或 AI。
          </p>
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
            添加玩家
          </button>
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-2.5">
            {[
              { value: true, label: "线下模式", sub: "无辅助 · 需拖拽放牌" },
              { value: false, label: "辅助模式", sub: "新手模式 · 高亮提示" },
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
              开始游戏
            </button>
          </div>
        </div>
        <PageFooter />
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
            ← 返回
          </button>
          <h2 className="m-0 text-lg">联机游戏</h2>
        </div>

        {/* name input */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">您的名字</span>
          <div className="flex gap-2">
            <input
              className={clsx(INPUT_BASE, "flex-1 min-w-0")}
              value={nick}
              onChange={(e) => saveNick(e.target.value)}
              placeholder="昵称"
              autoFocus
            />
            <button
              className={BTN_GHOST}
              onClick={() => saveNick(generateRandomName())}
              title="随机名字"
            >
              🎲 换一个
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
            {creating ? "创建中…" : "创建游戏"}
          </button>

          {!showJoin ? (
            <button className={BTN_SECONDARY} onClick={() => setShowJoin(true)}>
              加入游戏
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                className={clsx(INPUT_BASE, "flex-1 min-w-0")}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="房间代码"
                maxLength={6}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && joinRemote()}
              />
              <button
                className={clsx(BTN_PRIMARY, "!px-4 whitespace-nowrap")}
                onClick={joinRemote}
                disabled={!joinCode.trim()}
              >
                加入
              </button>
            </div>
          )}

          {lastGame && (
            <button
              className={BTN_GHOST}
              onClick={() => router.push(`/game/${lastGame}`)}
            >
              重新加入上局游戏（{lastGame}）
            </button>
          )}
        </div>
      </div>
      <PageFooter />
    </main>
  );
}

function PageFooter() {
  return (
    <footer className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-3 text-xs">
      <div className="text-subtle text-[11px]">v{pkg.version}</div>
      <div className="flex gap-5">
        <a
          href="https://github.com/hansenz42/chromino"
          target="_blank"
          rel="noopener noreferrer"
          className="text-subtle no-underline hover:underline"
        >
          开源 GitHub
        </a>
        <a
          href="https://www.assen.top"
          target="_blank"
          rel="noopener noreferrer"
          className="text-subtle no-underline hover:underline"
        >
          开发者博客
        </a>
      </div>
    </footer>
  );
}
