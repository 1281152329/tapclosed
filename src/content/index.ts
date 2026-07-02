import { GestureDetector, type GestureEvent } from "@/gesture";
import { applyDissolve } from "@/animation";
import { soundManager } from "@/sound/manager";
import { isProtected } from "@/tabs/protection";
import { getMainDomain } from "@/tabs/domain-close";
import type { tapclosedSettings, ProtectionRule, ClosedTabInfo } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

// ── Debug ──
const TAG = "[tapclosed]";
const log = (...a: unknown[]) => console.log(TAG, ...a);
const warn = (...a: unknown[]) => console.warn(TAG, ...a);
const err = (...a: unknown[]) => console.error(TAG, ...a);

// ── Context validity ──
let contextValid = true;

function checkContext(): boolean {
  try {
    if (!chrome.runtime?.id) {
      contextValid = false;
      return false;
    }
    return true;
  } catch {
    contextValid = false;
    return false;
  }
}

function safeSendMessage(msg: object): void {
  if (!checkContext()) return;
  try {
    chrome.runtime.sendMessage(msg).catch(() => {});
  } catch {
    // context invalidated, silently ignore
  }
}

// ── State ──
let settings: tapclosedSettings = DEFAULT_SETTINGS;
let ready = false;
let undoTimer: ReturnType<typeof setTimeout> | null = null;

// ── Domain Close State ──
let optionsPopupVisible = false;
let optionsPopupOverlay: HTMLElement | null = null;
const MIDDLE_CLICK_HOLD_MS = 1000; // 1 second
const MOVE_THRESHOLD = 30; // pixels

// ── Overlay host ──

let overlayHost: HTMLDivElement | null = null;

function ensureOverlayHost(): HTMLDivElement {
  if (overlayHost && document.documentElement.contains(overlayHost)) return overlayHost;
  overlayHost = document.createElement("div");
  overlayHost.id = "tapclosed-overlay";
  Object.assign(overlayHost.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    pointerEvents: "none",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    fontSize: "13px",
    color: "rgba(255,255,255,0.9)",
  });
  (document.body || document.documentElement).appendChild(overlayHost);
  return overlayHost;
}

// ── Undo Toast ──

function showUndoToast(payload: { tabs: ClosedTabInfo[]; count: number }): void {
  log("showUndoToast", payload.count, "tabs");
  hideUndoToast();

  const host = ensureOverlayHost();
  const el = document.createElement("div");
  el.id = "tapclosed-undo";
  
  const isMultiple = payload.count > 1;
  const title = isMultiple 
    ? `${payload.count} tabs closed` 
    : (payload.tabs[0]?.title || "Tab closed");

  el.innerHTML = `
    <div class="tapclosed-undo-card">
      <div class="tapclosed-undo-progress"></div>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;opacity:0.5">
        <path d="M4 4L12 12M4 12L12 4" stroke="rgba(255,255,255,0.7)" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <div class="tapclosed-undo-title">${escapeHtml(title)}</div>
      <button class="tapclosed-undo-btn">Undo</button>
    </div>
  `;

  Object.assign(el.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    pointerEvents: "auto",
    opacity: "0",
    transform: "translateY(16px) scale(0.96)",
    transition: "opacity 0.25s cubic-bezier(0.23,1,0.32,1), transform 0.25s cubic-bezier(0.23,1,0.32,1)",
  });

  const style = document.createElement("style");
  style.textContent = `
    .tapclosed-undo-card {
      display:flex;align-items:center;gap:12px;padding:12px 16px;
      background:rgba(30,30,35,0.92);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
      border:1px solid rgba(255,255,255,0.08);border-radius:14px;
      box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 0 1px rgba(255,255,255,0.04) inset;
      min-width:220px;overflow:hidden;position:relative;
    }
    .tapclosed-undo-progress {
      position:absolute;bottom:0;left:0;height:2px;
      background:linear-gradient(90deg,rgba(150,180,255,0.6),rgba(200,170,255,0.4));
      border-radius:0 0 14px 14px;transition:width 16ms linear;
    }
    .tapclosed-undo-title {
      flex:1;font-size:13px;font-weight:500;color:rgba(255,255,255,0.85);
      line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;
    }
    .tapclosed-undo-btn {
      background:rgba(150,180,255,0.12);border:1px solid rgba(150,180,255,0.2);
      border-radius:8px;color:rgba(180,200,255,0.95);font-size:12px;font-weight:600;
      padding:5px 12px;cursor:pointer;font-family:inherit;letter-spacing:0.02em;
      transition:all 0.15s ease;white-space:nowrap;
    }
    .tapclosed-undo-btn:hover {
      background:rgba(150,180,255,0.2);border-color:rgba(150,180,255,0.35);
    }
  `;
  el.appendChild(style);
  host.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = "1";
    el.style.transform = "translateY(0) scale(1)";
  });

  const btn = el.querySelector(".tapclosed-undo-btn") as HTMLButtonElement;
  btn.addEventListener("click", () => {
    safeSendMessage({ type: "UNDO_CLOSE" });
    hideUndoToast();
  });

  const duration = settings.undoDuration;
  const startTime = Date.now();
  const progressEl = el.querySelector(".tapclosed-undo-progress") as HTMLDivElement;

  const tick = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
    progressEl.style.width = remaining + "%";
    if (remaining > 0) {
      undoTimer = requestAnimationFrame(tick) as unknown as ReturnType<typeof setTimeout>;
    } else {
      hideUndoToast();
    }
  };
  undoTimer = requestAnimationFrame(tick) as unknown as ReturnType<typeof setTimeout>;
}

function hideUndoToast(): void {
  if (undoTimer) {
    cancelAnimationFrame(undoTimer as unknown as number);
    clearTimeout(undoTimer);
    undoTimer = null;
  }
  const el = document.getElementById("tapclosed-undo");
  if (el) {
    el.style.opacity = "0";
    el.style.transform = "translateY(8px) scale(0.98)";
    setTimeout(() => el.remove(), 300);
  }
}

// ── Protection Overlay ──

function showProtectionOverlay(rule: ProtectionRule): void {
  log("showProtectionOverlay", rule.label);
  hideProtectionOverlay();

  const host = ensureOverlayHost();
  const el = document.createElement("div");
  el.id = "tapclosed-protection";
  el.innerHTML = `
    <div class="tapclosed-prot-backdrop">
      <div class="tapclosed-prot-card">
        <div class="tapclosed-prot-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(150,180,255,0.7)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="tapclosed-prot-title">This page is protected</div>
        <div class="tapclosed-prot-desc">${escapeHtml(rule.label || rule.pattern)} is in your protected sites list.<br>Gesture close is disabled here.</div>
        <div class="tapclosed-prot-hint">Click anywhere to dismiss</div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .tapclosed-prot-backdrop {
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.3);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
      pointer-events:auto;cursor:pointer;
      opacity:0;transition:opacity 0.3s ease;
    }
    .tapclosed-prot-card {
      display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 40px;
      background:rgba(25,25,30,0.88);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);
      border:1px solid rgba(255,255,255,0.08);border-radius:20px;
      box-shadow:0 16px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03) inset;
      text-align:center;max-width:320px;
      opacity:0;transform:scale(0.94) translateY(10px);
      transition:opacity 0.35s cubic-bezier(0.23,1,0.32,1),transform 0.35s cubic-bezier(0.23,1,0.32,1);
    }
    .tapclosed-prot-icon {
      width:48px;height:48px;border-radius:50%;
      background:rgba(150,180,255,0.08);display:flex;align-items:center;justify-content:center;
      border:1px solid rgba(150,180,255,0.12);
    }
    .tapclosed-prot-title {font-size:15px;font-weight:600;color:rgba(255,255,255,0.9);letter-spacing:-0.01em}
    .tapclosed-prot-desc {font-size:13px;color:rgba(255,255,255,0.45);line-height:1.5}
    .tapclosed-prot-hint {font-size:11px;color:rgba(255,255,255,0.25);margin-top:4px}
  `;
  el.appendChild(style);
  host.appendChild(el);

  requestAnimationFrame(() => {
    const backdrop = el.querySelector(".tapclosed-prot-backdrop") as HTMLElement;
    const card = el.querySelector(".tapclosed-prot-card") as HTMLElement;
    backdrop.style.opacity = "1";
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "scale(1) translateY(0)";
    }, 50);
  });

  el.addEventListener("click", hideProtectionOverlay);
}

function hideProtectionOverlay(): void {
  const el = document.getElementById("tapclosed-protection");
  if (el) {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 300);
  }
}

// ── Options Popup ──

function showOptionsPopup(): void {
  hideOptionsPopup();
  optionsPopupVisible = true;

  const currentDomain = getMainDomain(window.location.href);

  const host = ensureOverlayHost();
  const el = document.createElement("div");
  el.id = "tapclosed-options-popup";

  el.innerHTML = `
    <div class="tapclosed-opts-backdrop">
      <div class="tapclosed-opts-card">
        <div class="tapclosed-opts-header">
          <div class="tapclosed-opts-title">Close Tabs</div>
          <button class="tapclosed-opts-close" aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 3L13 13M13 3L3 13" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="tapclosed-opts-body">
          <button class="tapclosed-opts-option" data-action="domain">
            <div class="tapclosed-opts-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(150,180,255,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20"/>
              </svg>
            </div>
            <div class="tapclosed-opts-option-content">
              <div class="tapclosed-opts-option-title">Same Domain</div>
              <div class="tapclosed-opts-option-desc">Close all tabs with domain ${escapeHtml(currentDomain || "")}</div>
            </div>
          </button>
          <button class="tapclosed-opts-option" data-action="other">
            <div class="tapclosed-opts-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,180,150,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <path d="M3 9h18"/>
              </svg>
            </div>
            <div class="tapclosed-opts-option-content">
              <div class="tapclosed-opts-option-title">Other Tabs</div>
              <div class="tapclosed-opts-option-desc">Close all tabs except this one</div>
            </div>
          </button>
          <button class="tapclosed-opts-option" data-action="all">
            <div class="tapclosed-opts-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,120,120,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18"/>
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
              </svg>
            </div>
            <div class="tapclosed-opts-option-content">
              <div class="tapclosed-opts-option-title">All Tabs</div>
              <div class="tapclosed-opts-option-desc">Close all tabs in this window</div>
            </div>
          </button>
          <div class="tapclosed-opts-divider"></div>
          <button class="tapclosed-opts-option" data-action="duplicate">
            <div class="tapclosed-opts-option-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(150,200,170,0.8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </div>
            <div class="tapclosed-opts-option-content">
              <div class="tapclosed-opts-option-title">Duplicate Tab</div>
              <div class="tapclosed-opts-option-desc">Copy this tab to a new tab</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  `;

  const style = document.createElement("style");
  style.textContent = `
    .tapclosed-opts-backdrop {
      position:fixed;inset:0;display:flex;align-items:center;justify-content:center;
      background:rgba(0,0,0,0.4);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);
      pointer-events:auto;
      opacity:0;transition:opacity 0.25s ease;
    }
    .tapclosed-opts-card {
      display:flex;flex-direction:column;
      background:rgba(25,25,30,0.92);backdrop-filter:blur(40px);-webkit-backdrop-filter:blur(40px);
      border:1px solid rgba(255,255,255,0.1);border-radius:18px;
      box-shadow:0 20px 80px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.03) inset;
      min-width:320px;max-width:400px;
      opacity:0;transform:scale(0.94) translateY(10px);
      transition:opacity 0.3s cubic-bezier(0.23,1,0.32,1),transform 0.3s cubic-bezier(0.23,1,0.32,1);
    }
    .tapclosed-opts-header {
      display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;
      border-bottom:1px solid rgba(255,255,255,0.06);
    }
    .tapclosed-opts-title {
      font-size:16px;font-weight:600;color:rgba(255,255,255,0.9);letter-spacing:-0.01em;
    }
    .tapclosed-opts-close {
      width:28px;height:28px;border-radius:6px;
      background:transparent;border:1px solid rgba(255,255,255,0.1);
      cursor:pointer;color:rgba(255,255,255,0.5);
      display:flex;align-items:center;justify-content:center;
      transition:all 0.15s ease;
      padding:0;
    }
    .tapclosed-opts-close:hover {
      background:rgba(255,255,255,0.08);
      border-color:rgba(255,255,255,0.15);
      color:rgba(255,255,255,0.8);
    }
    .tapclosed-opts-body {
      display:flex;flex-direction:column;gap:8px;padding:16px 12px 20px;
    }
    .tapclosed-opts-option {
      display:flex;align-items:center;gap:14px;padding:14px 16px;
      background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:12px;
      cursor:pointer;transition:all 0.15s ease;text-align:left;
    }
    .tapclosed-opts-option:hover {
      background:rgba(255,255,255,0.06);
      border-color:rgba(255,255,255,0.12);
      transform:translateX(2px);
    }
    .tapclosed-opts-option:active {
      transform:translateX(0);
    }
    .tapclosed-opts-option-icon {
      width:40px;height:40px;border-radius:10px;
      background:rgba(255,255,255,0.04);
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;
    }
    .tapclosed-opts-option-content {
      flex:1;
    }
    .tapclosed-opts-option-title {
      font-size:14px;font-weight:600;color:rgba(255,255,255,0.85);margin-bottom:3px;
    }
    .tapclosed-opts-option-desc {
      font-size:12px;color:rgba(255,255,255,0.45);line-height:1.4;
    }
    .tapclosed-opts-divider {
      height:1px;background:rgba(255,255,255,0.06);margin:4px 16px;
    }
  `;
  el.appendChild(style);
  host.appendChild(el);

  requestAnimationFrame(() => {
    const backdrop = el.querySelector(".tapclosed-opts-backdrop") as HTMLElement;
    const card = el.querySelector(".tapclosed-opts-card") as HTMLElement;
    if (backdrop) backdrop.style.opacity = "1";
    setTimeout(() => {
      if (card) {
        card.style.opacity = "1";
        card.style.transform = "scale(1) translateY(0)";
      }
    }, 30);
  });

  // Event handlers
  const backdrop = el.querySelector(".tapclosed-opts-backdrop") as HTMLElement;
  const closeBtn = el.querySelector(".tapclosed-opts-close") as HTMLButtonElement;
  const options = el.querySelectorAll(".tapclosed-opts-option") as NodeListOf<HTMLButtonElement>;

  const dismiss = () => hideOptionsPopup();

  backdrop.addEventListener("click", dismiss);
  closeBtn.addEventListener("click", dismiss);

  options.forEach(option => {
    option.addEventListener("click", () => {
      const action = option.dataset.action;
      switch (action) {
        case "domain":
          safeSendMessage({ type: "CLOSE_DOMAIN_TABS" });
          break;
        case "other":
          safeSendMessage({ type: "CLOSE_OTHER_TABS" });
          break;
        case "all":
          safeSendMessage({ type: "CLOSE_ALL_TABS" });
          break;
        case "duplicate":
          safeSendMessage({ type: "DUPLICATE_TAB" });
          break;
      }
      hideOptionsPopup();
    });
  });

  // Escape key to close
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      dismiss();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);

  optionsPopupOverlay = el;
}

function hideOptionsPopup(): void {
  optionsPopupVisible = false;
  if (optionsPopupOverlay) {
    optionsPopupOverlay.style.opacity = "0";
    setTimeout(() => optionsPopupOverlay?.remove(), 250);
    optionsPopupOverlay = null;
  }
}

// ── Utility ──

function escapeHtml(s: string): string {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

// ── Gesture handler ──

function handleGesture(event: GestureEvent): void {
  log("gesture:", event.type);

  switch (event.type) {
    case "CLOSE":
      handleCloseGesture();
      break;
    case "TAB_NEXT":
      safeSendMessage({ type: "TAB_NEXT" });
      break;
    case "TAB_PREV":
      safeSendMessage({ type: "TAB_PREV" });
      break;
  }
}

function handleCloseGesture(): void {
  try {
    const currentUrl = window.location.href;
    const rule = isProtected(currentUrl, settings.protectionRules);
    if (rule) {
      log("site protected, showing overlay");
      showProtectionOverlay(rule);
      return;
    }

    soundManager.play("close", { volume: settings.soundVolume, enabled: settings.soundEnabled });

    let closed = false;
    const doClose = () => {
      if (closed) return;
      closed = true;
      log("sending CLOSE_TAB");
      safeSendMessage({
        type: "CLOSE_TAB",
        payload: { tabId: 0, url: window.location.href, title: document.title },
      });
    };

    const cancelDissolve = applyDissolve({
      duration: settings.animationDuration,
      onComplete: doClose,
    });

    setTimeout(() => {
      cancelDissolve();
      doClose();
    }, settings.animationDuration * 2 + 200);
  } catch (e) {
    err("handleCloseGesture error", e);
  }
}

// ── Middle Click Handler ──

function setupMiddleClickHandler(): void {
  let middleClickTimer: ReturnType<typeof setTimeout> | null = null;
  let startX = 0;
  let startY = 0;

  // Middle mouse down
  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 1) return; // Only middle button
    if (optionsPopupVisible) return; // Ignore if popup is showing

    // Prevent auto-scroll
    e.preventDefault();

    // Record position
    startX = e.clientX;
    startY = e.clientY;

    // Start 2 second timer
    middleClickTimer = setTimeout(() => {
      middleClickTimer = null;
      // Show options popup
      showOptionsPopup();
    }, MIDDLE_CLICK_HOLD_MS);
  };

  // Middle mouse up
  const onMouseUp = (e: MouseEvent) => {
    if (e.button !== 1) return;

    if (middleClickTimer) {
      // Timer is still running - released before 2 seconds
      clearTimeout(middleClickTimer);
      middleClickTimer = null;

      // Close current tab (quick middle-click)
      handleCloseGesture();
    }
    // If timer already fired (popup showing), do nothing
  };

  // Mouse move - cancel if moved too far
  const onMouseMove = (e: MouseEvent) => {
    if (!middleClickTimer) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > MOVE_THRESHOLD) {
      clearTimeout(middleClickTimer);
      middleClickTimer = null;
    }
  };

  // Register listeners with capture phase
  document.addEventListener("mousedown", onMouseDown, { capture: true, passive: false });
  document.addEventListener("mouseup", onMouseUp, true);
  document.addEventListener("mousemove", onMouseMove, true);

  // Clean up on blur/visibility change
  const cleanup = () => {
    if (middleClickTimer) {
      clearTimeout(middleClickTimer);
      middleClickTimer = null;
    }
  };
  window.addEventListener("blur", cleanup);
  document.addEventListener("visibilitychange", cleanup);
}

// ── Message listener (registered synchronously) ──

if (checkContext()) {
  try {
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      try {
        if (msg.type === "BG_ERROR") {
          err("background error:", msg.payload);
          sendResponse({ ok: true });
        }

        if (msg.type === "SHOW_UNDO") {
          const show = () => {
            showUndoToast(msg.payload);
            soundManager.play("undo", { volume: settings.soundVolume, enabled: settings.soundEnabled });
          };
          if (ready) {
            show();
          } else {
            const check = setInterval(() => {
              if (ready) { clearInterval(check); show(); }
            }, 50);
            setTimeout(() => clearInterval(check), 5000);
          }
          sendResponse({ ok: true });
        }

        if (msg.type === "SHOW_PROTECTION") {
          showProtectionOverlay(msg.payload);
          sendResponse({ ok: true });
        }
      } catch {
        // context invalidated, ignore
      }

      return true;
    });
  } catch {
    // context already invalidated at load time
  }
}

// ── Keyboard shortcut for undo (Ctrl+Shift+Z) ──

if (checkContext()) {
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.code === "KeyZ") {
      e.preventDefault();
      // Try to undo from the current toast's stored tab info
      const undoEl = document.getElementById("tapclosed-undo");
      if (undoEl) {
        const btn = undoEl.querySelector(".tapclosed-undo-btn") as HTMLButtonElement;
        btn?.click();
      } else {
        // No toast visible, ask background for undo info and restore directly
        if (!checkContext()) return;
        chrome.runtime.sendMessage({ type: "GET_UNDO_INFO" }).then((response) => {
          if (response?.undoInfo && response.undoInfo.length > 0) {
            log("keyboard undo:", response.undoInfo.length, "tabs");
            safeSendMessage({ type: "UNDO_CLOSE" });
          }
        }).catch(() => {});
      }
    }
  }, true);
}

// ── Settings change listener ──

if (checkContext()) {
  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes.tapclosed_settings) {
        settings = { ...DEFAULT_SETTINGS, ...changes.tapclosed_settings.newValue };
      }
    });
  } catch {
    // context already invalidated at load time
  }
}

// ── Init ──

async function init(): Promise<void> {
  log("init, url:", window.location.href);

  // Load settings (chrome.storage may be unavailable on some pages)
  try {
    const result = await chrome.storage.sync.get("tapclosed_settings");
    settings = { ...DEFAULT_SETTINGS, ...result.tapclosed_settings };
    log("settings:", settings);
  } catch (e) {
    warn("settings load failed:", e);
    settings = DEFAULT_SETTINGS;
  }

  if (!settings.enabled) {
    log("disabled via settings");
    ready = true;
    return;
  }

  // Audio warmup �?keep trying until AudioContext is actually running
  const warmUpHandler = () => {
    soundManager.warmUp();
    if (soundManager.isReady()) {
      document.removeEventListener("mousedown", warmUpHandler, true);
    }
  };
  document.addEventListener("mousedown", warmUpHandler, true);

  // Protection check
  const currentUrl = window.location.href;
  const protectionRule = isProtected(currentUrl, settings.protectionRules);
  if (protectionRule) {
    log("site protected:", protectionRule.label);
  }

  // Gesture detector (close + tab switch)
  if (!protectionRule && settings.gestureEnabled) {
    const detector = new GestureDetector(handleGesture, {
      closeHoldMs: 200,
      moveThreshold: 15,
      closeCooldownMs: 800,
    });
    detector.attach();
    log("gesture detector attached");
  }

  // Domain close gesture (replaces focus mode)
  if (settings.gestureEnabled) {
    setupMiddleClickHandler();
    log("middle click handler attached");
  }

  ready = true;
  log("init complete");

  // Check for pending undo info (fallback if SHOW_UNDO was missed)
  checkPendingUndo();
}

async function checkPendingUndo(): Promise<void> {
  if (!checkContext()) return;

  let undoTabs: ClosedTabInfo[] | null = null;

  // Method 1: Ask background directly
  try {
    const response = await chrome.runtime.sendMessage({ type: "GET_UNDO_INFO" });
    if (response?.undoInfo && Array.isArray(response.undoInfo)) {
      undoTabs = response.undoInfo as ClosedTabInfo[];
    }
  } catch {
    // background might not be ready, try storage fallback
  }

  // Method 2: Read from chrome.storage.local directly (fallback)
  if (!undoTabs) {
    try {
      if (chrome.storage?.local) {
        const result = await chrome.storage.local.get("tapclosed_undo_info");
        if (result.tapclosed_undo_info && Array.isArray(result.tapclosed_undo_info)) {
          undoTabs = result.tapclosed_undo_info as ClosedTabInfo[];
        }
      }
    } catch {
      // storage unavailable
    }
  }

  if (undoTabs && undoTabs.length > 0) {
    const age = Date.now() - undoTabs[0].closedAt;
    if (age < settings.undoDuration + 2000) {
      log("found pending undo on init:", undoTabs.length, "tabs");
      showUndoToast({ tabs: undoTabs, count: undoTabs.length });
      soundManager.play("undo", { volume: settings.soundVolume, enabled: settings.soundEnabled });
    }
  }
}

// ── Cleanup ──

window.addEventListener("beforeunload", () => {
  overlayHost?.remove();
  overlayHost = null;
});

// ── Boot ──

log("script loaded, readyState:", document.readyState);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => init());
} else {
  init();
}
