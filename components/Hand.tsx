"use client";
import { useLayoutEffect, useRef } from "react";
import type { GameState, Orientation } from "@/lib/types";
import { useGameStore } from "@/lib/game-store";
import { TileSvg } from "./Tile";
import { hasAnyLegalPlay } from "@/lib/game-engine";

const CELL = 48;
const HAND_CELL = 32;

export function Hand({ state }: { state: GameState }) {
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
    hasDrawnThisTurn,
    boardZoom,
  } = useGameStore();

  // Drag tracking refs (used only in no-assistance mode)
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

  const me = state.players.find((p) => p.id === selfPlayerId);

  // Set initial floating tile position (runs when drag starts or cancelling changes)
  useLayoutEffect(() => {
    if (!dragging || !floatingRef.current) return;
    const el = floatingRef.current;
    const tileCell = CELL * boardZoom;
    const isH = dragging.orientation === "h";
    if (dragging.cancelling) {
      // Ensure we start from current cursor position before animating back
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
      // Place at current cursor position (initial mount of floating tile)
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? tileCell * 1.5 : tileCell * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? tileCell * 0.5 : tileCell * 1.5)}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging?.tileId, dragging?.cancelling]);

  if (!me) return null;

  const isMyTurn =
    state.players[state.currentPlayerIndex]?.id === me.id &&
    state.phase === "playing";
  // In no-assistance mode: can only draw once per turn (before drawing)
  const canDraw = state.noAssistance
    ? isMyTurn && !hasDrawnThisTurn
    : isMyTurn && !hasAnyLegalPlay(state, me.id);

  function makeTilePointerDown(tileId: number) {
    if (!state.noAssistance || !isMyTurn) return undefined;
    return (e: React.PointerEvent<HTMLDivElement>) => {
      // Release implicit pointer capture so that pointerup fires on the element
      // under the finger/cursor (e.g. the board), not locked to this tile div.
      // Must use e.target (the actual touched element) — on mobile, the browser
      // sets implicit capture on e.target, not e.currentTarget, so calling it on
      // e.currentTarget has no effect and the drop never reaches the board.
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
          // Update floating tile position directly (no React re-render needed)
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
          // Board's onPointerUp fires before window.pointerup (React delegation).
          // If Board already handled the drop, dragging will be null or cancelling.
          const d = useGameStore.getState().dragging;
          if (d && !d.cancelling) {
            // Released outside the board — cancel drag
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
      className="safe-bottom"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        background: "#1b2028",
        borderTop: "1px solid #2a2f3a",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <strong style={{ color: isMyTurn ? "#4ade80" : "#aaa" }}>
          {isMyTurn
            ? "轮到您了"
            : `等待中 — ${state.players[state.currentPlayerIndex]?.name}`}
        </strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!selected} onClick={rotateLeft}>
            ↺
          </button>
          <button disabled={!selected} onClick={rotateRight}>
            ↻
          </button>
          {state.noAssistance && hasDrawnThisTurn ? (
            <button
              onClick={() => {
                const r = play({ type: "pass" });
                if (!r.ok) alert(r.error);
              }}
            >
              结束回合
            </button>
          ) : (
            <button
              disabled={!canDraw}
              onClick={() => {
                const r = play({ type: "draw" });
                if (!r.ok) alert(r.error);
              }}
            >
              {state.bag.length === 0
                ? "跳过"
                : `摘牌（剩 ${state.bag.length} 张）`}
            </button>
          )}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "nowrap",
          overflowX: "auto",
          overflowY: "hidden",
          height: HAND_CELL * 3,
          alignItems: "center",
        }}
      >
        {me.hand.map((t) => {
          const isSel = selected?.tileId === t.id;
          const isDraggingThis = dragging?.tileId === t.id;
          return (
            <div
              key={t.id}
              style={{
                opacity: isDraggingThis ? 0.3 : 1,
                width: HAND_CELL * 3,
                height: HAND_CELL * 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <div
                onPointerDown={makeTilePointerDown(t.id)}
                style={{ touchAction: "none", display: "flex" }}
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
                    // Suppress click if it was the end of a drag gesture
                    if (dragBlockRef.current) {
                      dragBlockRef.current = false;
                      return;
                    }
                    if (isSel) select(null);
                    else
                      select({ tileId: t.id, flip: false, orientation: "h" });
                    // Note: select() in the store ignores the passed flip/orientation
                    // and restores this tile's saved state from tileOrientations
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {/* Floating tile that follows the cursor during drag (no-assistance mode) */}
      {dragging && dragTile && (
        <div
          ref={floatingRef}
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 9999,
            opacity: 0.85,
          }}
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
