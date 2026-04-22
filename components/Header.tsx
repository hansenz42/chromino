"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import clsx from "clsx";
import { ChrominoLogo } from "@/components/ChrominoLogo";
import { useGameStore } from "@/lib/game-store";
import { useUIStore } from "@/lib/ui-store";
import {
  BTN_DANGER,
  BTN_DANGER_OUTLINE,
  BTN_SECONDARY,
  MODAL_BACKDROP,
  MODAL_CARD,
} from "@/lib/ui-classes";

export function Header() {
  const locale = useLocale();
  const t = useTranslations("home");
  const tp = useTranslations("playerPanel");
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  const gameState = useGameStore((s) => s.state);
  const { onLeave } = useUIStore();

  const inGame = !!gameState && !!onLeave;

  function setLocale(next: "zh" | "en") {
    if (next === locale) return;
    const newPath = pathname.replace(/^\/(zh|en)/, `/${next}`);
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000`;
    startTransition(() => {
      router.replace(newPath || `/${next}`);
    });
  }

  return (
    <>
      <div className="flex items-center justify-between px-3 h-9 bg-surface border-b border-border shrink-0">
        <div className="flex items-center gap-1.5">
          <ChrominoLogo size={20} />
          <span className="font-chromino font-semibold text-[16px] tracking-wide text-primary">
            chromino
          </span>
        </div>
        <div className="flex items-center gap-4">
          {!inGame && (
            <>
              <a
                href="https://github.com/hansenz42/chromino"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-subtle hover:text-fg transition-colors no-underline"
              >
                {t("github")}
              </a>
              <a
                href="https://www.assen.top"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-subtle hover:text-fg transition-colors no-underline"
              >
                {t("devBlog")}
              </a>
            </>
          )}
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            {(["zh", "en"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setLocale(lang)}
                disabled={isPending || locale === lang}
                className={`text-xs transition-colors select-none bg-transparent border-none p-0 cursor-pointer
                  ${locale === lang ? "text-fg font-semibold cursor-default" : "text-subtle hover:text-fg"}`}
              >
                {lang === "zh" ? "中文" : "EN"}
              </button>
            ))}
          </div>
          {inGame && (
            <div className="flex items-center gap-2.5 pl-2 border-l border-border">
              <span className="text-xs text-muted">
                {tp("tilesRemaining", { count: gameState.bag.length })}
              </span>
              <button
                onClick={() => setConfirming(true)}
                className={clsx(
                  BTN_DANGER_OUTLINE,
                  "!min-h-0 !px-2 !py-0.5 !text-xs",
                )}
              >
                {tp("leave")}
              </button>
            </div>
          )}
        </div>
      </div>

      {confirming && (
        <div className={MODAL_BACKDROP} onClick={() => setConfirming(false)}>
          <div className={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
            <div className="text-base font-semibold">
              {tp("leaveRoomTitle")}
            </div>
            <div className="text-[13px] text-muted">{tp("leaveRoomMsg")}</div>
            <div className="flex gap-2.5 justify-center">
              <button
                onClick={() => setConfirming(false)}
                className={clsx(BTN_SECONDARY, "flex-1")}
              >
                {tp("cancel")}
              </button>
              <button
                onClick={() => {
                  setConfirming(false);
                  onLeave?.();
                }}
                className={clsx(BTN_DANGER, "flex-1")}
              >
                {tp("leaveConfirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
