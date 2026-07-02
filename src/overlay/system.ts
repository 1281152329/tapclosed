/**
 * Overlay injection system.
 * Manages a shadow DOM container in the content script for isolated UI rendering.
 */

let hostEl: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

const HOST_ID = "tapclosed-overlay-host";

export function ensureOverlayHost(): { host: HTMLElement; shadow: ShadowRoot } {
  if (hostEl && shadowRoot) {
    return { host: hostEl, shadow: shadowRoot };
  }

  // Remove stale host if any
  document.getElementById(HOST_ID)?.remove();

  hostEl = document.createElement("div");
  hostEl.id = HOST_ID;
  Object.assign(hostEl.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    pointerEvents: "none",
    font: "inherit",
    color: "inherit",
  });

  shadowRoot = hostEl.attachShadow({ mode: "closed" });

  // Inject base styles
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
  `;
  shadowRoot.appendChild(style);

  document.documentElement.appendChild(hostEl);
  return { host: hostEl, shadow: shadowRoot };
}

export function getOverlayShadow(): ShadowRoot | null {
  return shadowRoot;
}

export function removeOverlayHost(): void {
  hostEl?.remove();
  hostEl = null;
  shadowRoot = null;
}
