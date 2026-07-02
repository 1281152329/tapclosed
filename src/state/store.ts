import { create } from "zustand";
import type {
  GestureState,
  GesturePhase,
  ClosedTabInfo,
  tapclosedSettings,
} from "@/types";

interface tapclosedStore {
  // Gesture
  gesture: GestureState;
  setGesturePhase: (phase: GesturePhase) => void;
  setGesturePosition: (x: number, y: number) => void;
  setGestureButton: (button: "left" | "right", down: boolean) => void;
  resetGesture: () => void;

  // Undo
  lastClosedTab: ClosedTabInfo | null;
  undoVisible: boolean;
  setLastClosedTab: (tab: ClosedTabInfo | null) => void;
  setUndoVisible: (visible: boolean) => void;

  // Settings (runtime cache)
  settings: tapclosedSettings;
  updateSettings: (settings: Partial<tapclosedSettings>) => void;

  // UI
  protectionOverlayVisible: boolean;
  setProtectionOverlayVisible: (visible: boolean) => void;
}

const initialGesture: GestureState = {
  phase: "idle",
  leftDown: false,
  rightDown: false,
  timestamp: 0,
  startX: 0,
  startY: 0,
};

export const usetapclosedStore = create<tapclosedStore>((set) => ({
  // Gesture
  gesture: initialGesture,
  setGesturePhase: (phase) =>
    set((s) => ({ gesture: { ...s.gesture, phase } })),
  setGesturePosition: (x, y) =>
    set((s) => ({ gesture: { ...s.gesture, startX: x, startY: y } })),
  setGestureButton: (button, down) =>
    set((s) => ({
      gesture: {
        ...s.gesture,
        ...(button === "left" ? { leftDown: down } : { rightDown: down }),
        timestamp: Date.now(),
      },
    })),
  resetGesture: () => set({ gesture: initialGesture }),

  // Undo
  lastClosedTab: null,
  undoVisible: false,
  setLastClosedTab: (tab) => set({ lastClosedTab: tab }),
  setUndoVisible: (visible) => set({ undoVisible: visible }),

  // Settings
  settings: {
    enabled: true,
    gestureEnabled: true,
    soundEnabled: true,
    soundVolume: 0.15,
    protectionRules: [],
    animationDuration: 280,
    undoDuration: 3000,
  },
  updateSettings: (partial) =>
    set((s) => ({ settings: { ...s.settings, ...partial } })),

  // UI
  protectionOverlayVisible: false,
  setProtectionOverlayVisible: (visible) =>
    set({ protectionOverlayVisible: visible }),
}));
