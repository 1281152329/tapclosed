import type { EasingFn } from "@/types";

/** Standard easing curves */
export const linear: EasingFn = (t) => t;

export const easeOut: EasingFn = (t) => 1 - Math.pow(1 - t, 3);

export const easeInOut: EasingFn = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** Dream-like easing — fast start, very slow dissolve at end */
export const dreamDissolve: EasingFn = (t) => {
  if (t < 0.3) return 2.5 * t * t; // Quick initial blur
  return 1 - Math.pow(1 - t, 4) * 0.3; // Slow fade
};

/** Breath-like — gentle rise and fall */
export const breathe: EasingFn = (t) => {
  return Math.sin(t * Math.PI * 0.5);
};

/** Soft elastic */
export const softElastic: EasingFn = (t) => {
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};
