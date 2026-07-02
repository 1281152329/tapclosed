import type { EasingFn } from "@/types";
import { dreamDissolve } from "./easing";

export interface AnimationKeyframe {
  time: number; // 0..1
  values: Record<string, number>;
}

export interface AnimationConfig {
  duration: number;
  easing: EasingFn;
  keyframes: AnimationKeyframe[];
  onUpdate: (values: Record<string, number>) => void;
  onComplete?: () => void;
}

/**
 * Lightweight animation engine using requestAnimationFrame.
 * GPU-accelerated via transform/opacity only.
 */
export function animate(config: AnimationConfig): () => void {
  const { duration, easing, keyframes, onUpdate, onComplete } = config;
  let startTime: number | null = null;
  let rafId: number;
  let cancelled = false;

  function interpolate(
    frames: AnimationKeyframe[],
    progress: number
  ): Record<string, number> {
    // Find surrounding keyframes
    let prev = frames[0];
    let next = frames[frames.length - 1];

    for (let i = 0; i < frames.length - 1; i++) {
      if (progress >= frames[i].time && progress <= frames[i + 1].time) {
        prev = frames[i];
        next = frames[i + 1];
        break;
      }
    }

    const range = next.time - prev.time;
    const localT = range > 0 ? (progress - prev.time) / range : 1;
    const values: Record<string, number> = {};

    for (const key of Object.keys(prev.values)) {
      const from = prev.values[key];
      const to = next.values[key] ?? from;
      values[key] = from + (to - from) * localT;
    }

    return values;
  }

  function tick(timestamp: number) {
    if (cancelled) return;
    if (startTime === null) startTime = timestamp;

    const elapsed = timestamp - startTime;
    const rawProgress = Math.min(elapsed / duration, 1);
    const easedProgress = easing(rawProgress);
    const values = interpolate(keyframes, easedProgress);

    onUpdate(values);

    if (rawProgress < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      onComplete?.();
    }
  }

  rafId = requestAnimationFrame(tick);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}

/**
 * Convenience: quick value interpolation (no raf, for inline use).
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
