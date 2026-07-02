import { animate } from "./engine";
import { dreamDissolve } from "./easing";
import { logger } from "@/utils/logger";

export interface DissolveOptions {
  duration?: number;
  onComplete?: () => void;
}

/**
 * Applies the "dream dissolve" effect to the page body.
 * Uses CSS transforms and opacity for GPU acceleration.
 * Returns a cancel function.
 */
export function applyDissolve(options: DissolveOptions = {}): () => void {
  const { duration = 280, onComplete } = options;
  const root = document.documentElement;

  logger.animation("dissolve starting", { duration });

  // Create a fullscreen overlay that fades in with blur
  const overlay = document.createElement("div");
  overlay.id = "tapclosed-dissolve-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    pointerEvents: "none",
    background: "rgba(255, 255, 255, 0.04)",
    backdropFilter: "blur(0px)",
    WebkitBackdropFilter: "blur(0px)",
    opacity: "0",
    willChange: "opacity, backdrop-filter",
    transition: "none",
  });
  document.body.appendChild(overlay);

  const cancel = animate({
    duration,
    easing: dreamDissolve,
    keyframes: [
      {
        time: 0,
        values: { opacity: 1, blur: 0, scale: 1, overlayOpacity: 0 },
      },
      {
        time: 0.4,
        values: { opacity: 0.85, blur: 3, scale: 0.99, overlayOpacity: 0.3 },
      },
      {
        time: 0.7,
        values: { opacity: 0.5, blur: 8, scale: 0.97, overlayOpacity: 0.6 },
      },
      {
        time: 1,
        values: { opacity: 0, blur: 16, scale: 0.95, overlayOpacity: 0.9 },
      },
    ],
    onUpdate: (values) => {
      // Apply to body â€?transform + opacity only for GPU
      root.style.opacity = String(values.opacity);
      root.style.transform = `scale(${values.scale})`;
      root.style.transformOrigin = "center center";
      root.style.filter = `blur(${values.blur}px)`;
      root.style.willChange = "opacity, transform, filter";

      // Overlay
      overlay.style.opacity = String(values.overlayOpacity);
      overlay.style.backdropFilter = `blur(${values.blur * 0.5}px)`;
      (overlay.style as any).WebkitBackdropFilter = `blur(${values.blur * 0.5}px)`;
    },
    onComplete: () => {
      logger.animation("dissolve complete");
      onComplete?.();
    },
  });

  return () => {
    cancel();
    overlay.remove();
    // Reset root styles
    root.style.opacity = "";
    root.style.transform = "";
    root.style.filter = "";
    root.style.willChange = "";
  };
}
