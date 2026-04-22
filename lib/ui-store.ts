import { create } from "zustand";

interface UIStore {
  onLeave: (() => void) | null;
  setOnLeave: (fn: (() => void) | null) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  onLeave: null,
  setOnLeave: (fn) => set({ onLeave: fn }),
}));
