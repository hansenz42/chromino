"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { GameState, Move, Orientation } from "@/lib/types";
import { useGameStore } from "@/lib/game-store";
import { TileSvg } from "./Tile";
import { hasAnyLegalPlay } from "@/lib/game-engine";
import { BTN_DEFAULT } from "@/lib/ui-classes";

const CELL = 48;
const HAND_CELL = 32;
// Each tile cell in the hand is HAND_CELL*3 wide, plus gap-2 (8px)
const TILE_STEP = HAND_CELL * 3 + 8;

export function Hand({
  state,
  onPlay,
}: {
  state: GameState;
  onPlay?: (m: Move) => void;
}) {
  const {
    selfPlayerId,
    selected,
    select,
    rotateLeft,
    rotateRight,
    play,
    tiles,
    dragging,
    clearDrag,
    tileOrientations,
    boardZoom,
  } = useGameStore();

  const pendingRef = useRef<{
    tileId: number;
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    orientation: Orientation;
    flip: boolean;
    active: boolean;
  } | null>(null);
  const dragBlockRef = useRef(false);
  const floatingRef = useRef<HTMLDivElement>(null);
  const handScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function refreshHandScrollState() {
    const el = handScrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const overflow = el.scrollWidth - el.clientWidth;
    if (overflow < 1) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  // Snap to a tile boundary: round current target to nearest multiple of TILE_STEP
  function snapTarget(raw: number) {
    return Math.round(raw / TILE_STEP) * TILE_STEP;
  }

  function scrollHand(direction: "left" | "right") {
    const el = handScrollRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    const step = Math.max(
      TILE_STEP,
      Math.floor(el.clientWidth / TILE_STEP) * TILE_STEP,
    );
    const raw = el.scrollLeft + (direction === "left" ? -step : step);
    const target = Math.max(0, Math.min(maxScrollLeft, snapTarget(raw)));
    el.scrollTo({ left: target, behavior: "smooth" });
  }

  const me = state.players.find((p) => p.id === selfPlayerId);
  const handCount = me?.hand.length ?? 0;

  useLayoutEffect(() => {
    if (!dragging || !floatingRef.current) return;
    const el = floatingRef.current;
    const tileCell = CELL * boardZoom;
    const isH = dragging.orientation === "h";
    if (dragging.cancelling) {
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? tileCell * 1.5 : tileCell * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? tileCell * 0.5 : tileCell * 1.5)}px`;
      const frame = requestAnimationFrame(() => {
        el.style.transition = "left 0.25s ease-in, top 0.25s ease-in";
        el.style.left = `${dragging.originX - (isH ? tileCell * 1.5 : tileCell * 0.5)}px`;
        el.style.top = `${dragging.originY - (isH ? tileCell * 0.5 : tileCell * 1.5)}px`;
      });
      return () => cancelAnimationFrame(frame);
    } else {
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? tileCell * 1.5 : tileCell * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? tileCell * 0.5 : tileCell * 1.5)}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging?.tileId, dragging?.cancelling]);

  useEffect(() => {
    refreshHandScrollState();
    const el = handScrollRef.current;
    if (!el) return;

    const onScroll = () => refreshHandScrollState();
    const onResize = () => refreshHandScrollState();

    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [handCount]);

  if (!me) return null;

  const isMyTurn =
    state.players[state.currentPlayerIndex]?.id === me.id &&
    state.phase === "playing";
  const canDraw = state.noAssistance
    ? isMyTurn && !state.turnHasDrawn
    : isMyTurn && !hasAnyLegalPlay(state, me.id);

  function makeTilePointerDown(tileId: number) {
    if (!state.noAssistance || !isMyTurn) return undefined;
    return (e: React.PointerEvent<HTMLDivElement>) => {
      dragBlockRef.current = false;
      (e.target as Element).releasePointerCapture(e.pointerId);
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const { selected: curSel, tileOrientations } = useGameStore.getState();
      const saved = tileOrientations[tileId];
      const orientation: Orientation =
        curSel?.tileId === tileId
          ? curSel.orientation
          : (saved?.orientation ?? "h");
      const flip: boolean =
        curSel?.tileId === tileId ? curSel.flip : (saved?.flip ?? false);
      pendingRef.current = {
        tileId,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: rect.left + rect.width / 2,
        originY: rect.top + rect.height / 2,
        orientation,
        flip,
        active: false,
      };

      const onMove = (ev: PointerEvent) => {
        if (
          !pendingRef.current ||
          ev.pointerId !== pendingRef.current.pointerId
        )
          return;
        const dx = ev.clientX - pendingRef.current.startX;
        const dy = ev.clientY - pendingRef.current.startY;
        if (!pendingRef.current.active && Math.hypot(dx, dy) > 5) {
          pendingRef.current.active = true;
          dragBlockRef.current = true;
          const p = pendingRef.current;
          useGameStore
            .getState()
            .startDrag(
              p.tileId,
              p.orientation,
              p.flip,
              ev.clientX,
              ev.clientY,
              p.originX,
              p.originY,
            );
        }
        if (pendingRef.current.active) {
          useGameStore.getState().updateDrag(ev.clientX, ev.clientY);
          if (floatingRef.current) {
            const isH = pendingRef.current.orientation === "h";
            const tileCell = CELL * useGameStore.getState().boardZoom;
            floatingRef.current.style.left = `${ev.clientX - (isH ? tileCell * 1.5 : tileCell * 0.5)}px`;
            floatingRef.current.style.top = `${ev.clientY - (isH ? tileCell * 0.5 : tileCell * 1.5)}px`;
          }
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (
          !pendingRef.current ||
          ev.pointerId !== pendingRef.current.pointerId
        )
          return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        const wasActive = pendingRef.current.active;
        pendingRef.current = null;
        if (wasActive) {
          const d = useGameStore.getState().dragging;
          if (d && !d.cancelling) {
            useGameStore.getState().cancelDrag();
          }
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    };
  }

  const dragTile = dragging
    ? tiles.find((t) => t.id === dragging.tileId)
    : null;

  return (
    <div
      className={clsx(
        "safe-bottom flex flex-col gap-2 px-3 py-2.5 border-t shrink-0",
        isMyTurn ? "bg-hand-active border-primary" : "bg-surface border-border",
      )}
    >
      <div className="flex justify-between items-center">
        <strong className={isMyTurn ? "text-primary" : "text-muted"}>
          {isMyTurn ? "请出牌" : "等待中"}
        </strong>
        <div className="flex gap-2">
          <button
            disabled={!selected}
            onClick={rotateLeft}
            className={BTN_DEFAULT}
          >
            ↺
          </button>
          <button
            disabled={!selected}
            onClick={rotateRight}
            className={BTN_DEFAULT}
          >
            ↻
          </button>
          {isMyTurn && state.noAssistance && state.turnHasDrawn ? (
            <button
              className={BTN_DEFAULT}
              onClick={() => {
                const m: Move = { type: "pass" };
                if (onPlay) {
                  onPlay(m);
                } else {
                  const r = play(m);
                  if (!r.ok) alert(r.error);
                }
              }}
            >
              结束回合
            </button>
          ) : (
            <button
              className={BTN_DEFAULT}
              disabled={!canDraw}
              onClick={() => {
                const m: Move = { type: "draw" };
                if (onPlay) {
                  onPlay(m);
                } else {
                  const r = play(m);
                  if (!r.ok) alert(r.error);
                }
              }}
            >
              {state.bag.length === 0
                ? "跳过"
                : `摸牌 - 剩 ${state.bag.length}`}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="w-4 shrink-0 flex items-center justify-center text-fg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          aria-label="向左滚动手牌"
          disabled={!canScrollLeft}
          onClick={() => scrollHand("left")}
        >
          ←
        </button>
        <div
          ref={handScrollRef}
          className="flex-1 min-w-0 flex gap-2 flex-nowrap overflow-x-auto overflow-y-hidden items-center"
          style={{ height: HAND_CELL * 3 }}
        >
          {me.hand.map((t) => {
            const isSel = selected?.tileId === t.id;
            const isDraggingThis = dragging?.tileId === t.id;
            return (
              <div
                key={t.id}
                className={clsx(
                  "flex items-center justify-center shrink-0",
                  isDraggingThis ? "opacity-30" : "opacity-100",
                )}
                style={{
                  width: HAND_CELL * 3,
                  height: HAND_CELL * 3,
                }}
              >
                <div
                  onPointerDown={makeTilePointerDown(t.id)}
                  className={clsx(
                    "flex",
                    state.noAssistance && isMyTurn
                      ? "touch-none"
                      : "touch-auto",
                  )}
                >
                  <TileSvg
                    tile={t}
                    orientation={
                      isSel
                        ? selected!.orientation
                        : (tileOrientations[t.id]?.orientation ?? "h")
                    }
                    flip={
                      isSel
                        ? selected!.flip
                        : (tileOrientations[t.id]?.flip ?? false)
                    }
                    size={HAND_CELL}
                    selected={isSel}
                    onClick={() => {
                      if (!isMyTurn) return;
                      if (dragBlockRef.current) {
                        dragBlockRef.current = false;
                        return;
                      }
                      if (isSel) select(null);
                      else
                        select({ tileId: t.id, flip: false, orientation: "h" });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          className="w-4 shrink-0 flex items-center justify-center text-fg disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
          aria-label="向右滚动手牌"
          disabled={!canScrollRight}
          onClick={() => scrollHand("right")}
        >
          →
        </button>
      </div>
      {dragging && dragTile && (
        <div
          ref={floatingRef}
          className="fixed pointer-events-none z-9999 opacity-85"
          onTransitionEnd={(e) => {
            if (e.propertyName === "left") clearDrag();
          }}
        >
          <TileSvg
            tile={dragTile}
            orientation={dragging.orientation}
            flip={dragging.flip}
            size={Math.round(CELL * boardZoom)}
          />
        </div>
      )}
    </div>
  );
}
