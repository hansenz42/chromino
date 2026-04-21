"use client";
import { useLayoutEffect, useRef } from "react";
import type { GameState, Orientation } from "@/lib/types";
import { useGameStore } from "@/lib/game-store";
import { TileSvg } from "./Tile";
import { hasAnyLegalPlay } from "@/lib/game-engine";

const CELL = 48;

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
    const isH = dragging.orientation === "h";
    if (dragging.cancelling) {
      // Ensure we start from current cursor position before animating back
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
      const frame = requestAnimationFrame(() => {
        el.style.transition = "left 0.25s ease-in, top 0.25s ease-in";
        el.style.left = `${dragging.originX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
        el.style.top = `${dragging.originY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
      });
      return () => cancelAnimationFrame(frame);
    } else {
      // Place at current cursor position (initial mount of floating tile)
      el.style.transition = "none";
      el.style.left = `${dragging.currentX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
      el.style.top = `${dragging.currentY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging?.tileId, dragging?.cancelling]);

  if (!me) return null;

  const isMyTurn =
    state.players[state.currentPlayerIndex]?.id === me.id &&
    state.phase === "playing";
  // In no-assistance mode the draw button is always available on your turn
  const canDraw = state.noAssistance
    ? isMyTurn
    : isMyTurn && !hasAnyLegalPlay(state, me.id);

  function makeTilePointerDown(tileId: number) {
    if (!state.noAssistance || !isMyTurn) return undefined;
    return (e: React.PointerEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      const curSel = useGameStore.getState().selected;
      const orientation: Orientation =
        curSel?.tileId === tileId ? curSel.orientation : "h";
      const flip: boolean = curSel?.tileId === tileId ? curSel.flip : false;
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
            floatingRef.current.style.left = `${ev.clientX - (isH ? CELL * 1.5 : CELL * 0.5)}px`;
            floatingRef.current.style.top = `${ev.clientY - (isH ? CELL * 0.5 : CELL * 1.5)}px`;
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
            ? "Your turn"
            : `Waiting — ${state.players[state.currentPlayerIndex]?.name}`}
        </strong>
        <div style={{ display: "flex", gap: 8 }}>
          <button disabled={!selected} onClick={rotateLeft}>
            ↺ 向左
          </button>
          <button disabled={!selected} onClick={rotateRight}>
            ↻ 向右
          </button>
          <button
            disabled={!canDraw}
            onClick={() => {
              const r = play({ type: "draw" });
              if (!r.ok) alert(r.error);
            }}
          >
            {state.bag.length === 0
              ? "Pass"
              : `Draw (${state.bag.length} left)`}
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {me.hand.map((t) => {
          const isSel = selected?.tileId === t.id;
          const isDraggingThis = dragging?.tileId === t.id;
          return (
            <div
              key={t.id}
              onPointerDown={makeTilePointerDown(t.id)}
              style={{ opacity: isDraggingThis ? 0.3 : 1, touchAction: "none" }}
            >
              <TileSvg
                tile={t}
                orientation={isSel ? selected!.orientation : "h"}
                flip={isSel ? selected!.flip : false}
                selected={isSel}
                onClick={() => {
                  if (!isMyTurn) return;
                  // Suppress click if it was the end of a drag gesture
                  if (dragBlockRef.current) {
                    dragBlockRef.current = false;
                    return;
                  }
                  if (isSel) select(null);
                  else select({ tileId: t.id, flip: false, orientation: "h" });
                }}
              />
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
            size={CELL}
          />
        </div>
      )}
    </div>
  );
}
