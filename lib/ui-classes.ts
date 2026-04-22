/**
 * Shared Tailwind className strings used across the app UI.
 * Kept as plain constants (not components) so they can be composed with clsx
 * and with element-specific utilities at call sites.
 */

/** Base reset for every <button>. All buttons must extend this. */
export const BTN_BASE =
  "inline-flex items-center justify-center rounded-md border text-base " +
  "min-h-[44px] px-4 py-2.5 touch-manipulation select-none cursor-pointer " +
  "transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

/**
 * Tailwind v4 supports the `not-*` variant. We use `[&:not(:disabled)]:hover:…`
 * as an arbitrary variant to guarantee hover styles only apply to non-disabled
 * buttons across all versions.
 */
const HOVER_OK = "[&:not(:disabled)]:hover:";

/** Dark neutral button (old global <button> default). */
export const BTN_DEFAULT =
  BTN_BASE +
  ` bg-surface-hover text-fg border-border-2 ${HOVER_OK}bg-surface-hover-2`;

/** Green primary CTA. */
export const BTN_PRIMARY =
  BTN_BASE +
  ` border-transparent bg-primary text-on-primary font-semibold ${HOVER_OK}brightness-110`;

/** Outline secondary action. */
export const BTN_SECONDARY =
  BTN_BASE +
  ` bg-transparent text-fg-2 border-border-3 font-semibold ${HOVER_OK}bg-surface-hover`;

/** Ghost (flat, subtle) action. */
export const BTN_GHOST =
  "inline-flex items-center justify-center rounded-md border border-border " +
  "bg-transparent text-subtle px-2 py-2 text-sm cursor-pointer " +
  "touch-manipulation select-none transition-colors " +
  `${HOVER_OK}bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed`;

/** Destructive outline action (leave / kick). */
export const BTN_DANGER_OUTLINE =
  "inline-flex items-center justify-center rounded-md border border-border-danger " +
  "bg-transparent text-danger-fg px-2 py-1 text-sm cursor-pointer " +
  "touch-manipulation select-none transition-colors " +
  `${HOVER_OK}bg-[#2a1818] disabled:opacity-40 disabled:cursor-not-allowed`;

/** Destructive solid action (confirm destructive). */
export const BTN_DANGER =
  BTN_BASE +
  ` border-transparent bg-danger text-white font-semibold ${HOVER_OK}brightness-110`;

/** Standard input / select. */
export const INPUT_BASE =
  "bg-[#1b2028] text-fg border border-border-2 rounded-md " +
  "px-3 py-2.5 text-base min-h-[44px] box-border " +
  "focus:outline-none focus:border-primary";

/** Card wrapper for home / lobby panels. */
export const CARD =
  "bg-surface border border-border rounded-2xl " +
  "p-[clamp(20px,5vw,32px)] w-[min(100%,400px)] flex flex-col gap-[18px]";

/** Full-screen modal overlay + centered dialog. */
export const MODAL_BACKDROP =
  "fixed inset-0 bg-black/60 flex items-center justify-center z-[100]";

export const MODAL_CARD =
  "bg-surface border border-border rounded-xl " +
  "px-7 py-6 text-center flex flex-col gap-4 min-w-[240px]";

/** Text link in dark chrome. */
export const LINK = "text-link no-underline hover:underline";
