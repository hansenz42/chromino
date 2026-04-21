import type { Color } from "./types";

export const COLORS: readonly Color[] = [
  "red",
  "yellow",
  "green",
  "blue",
  "purple",
] as const;

/** Short single-letter code used in ids and debugging. */
export const COLOR_CODE: Record<Color, string> = {
  red: "R",
  yellow: "Y",
  green: "G",
  blue: "B",
  purple: "P",
};

/** SVG/CSS hex values per rules.md. */
export const COLOR_HEX: Record<Color, string> = {
  red: "#E74C3C",
  yellow: "#F1C40F",
  green: "#2ECC71",
  blue: "#3498DB",
  purple: "#9B59B6",
};

/** Wild cell rendering. */
export const WILD_BG = "#FFFFFF";
export const WILD_STROKE = "#555555";
