import { ensureOverlayHost, removeOverlayHost } from "./system";
import { logger } from "@/utils/logger";

/**
 * Injects a DOM element into the overlay shadow root.
 * Returns a cleanup function.
 */
export function injectOverlayElement(
  element: HTMLElement,
  styles?: Record<string, string>
): () => void {
  const { shadow } = ensureOverlayHost();

  if (styles) {
    Object.assign(element.style, styles);
  }

  shadow.appendChild(element);
  logger.info("overlay element injected");

  return () => {
    element.remove();
  };
}

/**
 * Inject HTML string into the overlay.
 */
export function injectOverlayHTML(
  html: string,
  styles?: Record<string, string>
): { container: HTMLElement; cleanup: () => void } {
  const { shadow } = ensureOverlayHost();

  const container = document.createElement("div");
  container.innerHTML = html;

  if (styles) {
    Object.assign(container.style, styles);
  }

  shadow.appendChild(container);

  return {
    container,
    cleanup: () => {
      container.remove();
    },
  };
}

export { removeOverlayHost };
