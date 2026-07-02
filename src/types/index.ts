// Gesture types
export type GesturePhase = "idle" | "left-down" | "both-pressed" | "triggered";

export interface GestureState {
  phase: GesturePhase;
  leftDown: boolean;
  rightDown: boolean;
  timestamp: number;
  startX: number;
  startY: number;
}

export interface GestureConfig {
  /** Max ms between left-down and right-down to count as simultaneous */
  syncWindow: number;
  /** Min ms both buttons must be held before triggering */
  holdDuration: number;
  /** Max px mouse can move during gesture before cancelling */
  moveThreshold: number;
  /** Cooldown ms after a gesture fires before another can fire */
  cooldown: number;
}

// Animation types
export type EasingFn = (t: number) => number;

export interface DissolveConfig {
  duration: number;
  blur: number;
  scale: number;
  opacity: number;
}

// Protection types
export interface ProtectionRule {
  id: string;
  pattern: string;
  type: "domain" | "regex" | "exact";
  enabled: boolean;
  label?: string;
}

// Tab types
export interface ClosedTabInfo {
  tabId: number;
  url: string;
  title: string;
  windowId: number;
  index: number;
  closedAt: number;
  pinned: boolean;
}

// Focus mode types
export interface FocusState {
  active: boolean;
  tabId: number | null;
  startedAt: number | null;
}

// Sound types
export type SoundType = "close" | "undo";

export interface SoundConfig {
  volume: number;
  enabled: boolean;
}

// Settings
export interface tapclosedSettings {
  enabled: boolean;
  gestureEnabled: boolean;
  soundEnabled: boolean;
  soundVolume: number;
  protectionRules: ProtectionRule[];
  animationDuration: number;
  undoDuration: number;
}

export const DEFAULT_SETTINGS: tapclosedSettings = {
  enabled: true,
  gestureEnabled: true,
  soundEnabled: true,
  soundVolume: 0.15,
  protectionRules: [
    { id: "1", pattern: "mail.google.com", type: "domain", enabled: true, label: "Gmail" },
    { id: "2", pattern: "chat.openai.com", type: "domain", enabled: true, label: "ChatGPT" },
    { id: "3", pattern: "docs.google.com", type: "domain", enabled: true, label: "Google Docs" },
  ],
  animationDuration: 280,
  undoDuration: 3000,
};

// Domain close types
export interface DomainCloseInfo {
  domain: string;
  tabCount: number;
  tabIds: number[];
}

// Message types for chrome.runtime messaging
export type MessageType =
  | "CLOSE_TAB"
  | "UNDO_CLOSE"
  | "GET_SETTINGS"
  | "UPDATE_SETTINGS"
  | "CHECK_PROTECTION"
  | "TAB_CLOSED"
  | "GESTURE_DETECTED"
  | "QUERY_DOMAIN_TABS"
  | "CLOSE_DOMAIN_TABS"
  | "CLOSE_OTHER_TABS"
  | "CLOSE_ALL_TABS"
  | "DUPLICATE_TAB"
  | "DOMAIN_TABS_RESULT"
  | "DOMAIN_TABS_CLOSED"
  | "SHOW_UNDO";

export interface Message {
  type: MessageType;
  payload?: unknown;
}

export interface CloseTabPayload {
  tabId: number;
  url: string;
  title: string;
}

export interface UndoClosePayload {
  closedTab: ClosedTabInfo;
}
