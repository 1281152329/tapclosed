/**
 * Gesture detector �?simplified, robust implementation.
 *
 * Gestures:
 *   1. Left + Right hold (200ms) �?close tab
 *   2. Right hold + scroll wheel �?switch tab (up=prev, down=next)
 */

export interface GestureDetectorOptions {
  closeHoldMs: number;
  moveThreshold: number;
  closeCooldownMs: number;
}

const DEFAULTS: GestureDetectorOptions = {
  closeHoldMs: 200,
  moveThreshold: 15,
  closeCooldownMs: 800,
};

export type GestureEvent =
  | { type: "CLOSE" }
  | { type: "TAB_NEXT" }
  | { type: "TAB_PREV" };

export class GestureDetector {
  private opts: GestureDetectorOptions;
  private handler: (e: GestureEvent) => void;

  private leftDown = false;
  private rightDown = false;
  private middleDown = false;
  private startX = 0;
  private startY = 0;

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private lastCloseTime = 0;
  private gestureActive = false; // true from first button down until all released
  private bothConfirmed = false; // true once both buttons were simultaneously held

  private _onMouseDown: (e: MouseEvent) => void;
  private _onMouseUp: (e: MouseEvent) => void;
  private _onMouseMove: (e: MouseEvent) => void;
  private _onContextMenu: (e: Event) => void;
  private _onWheel: (e: WheelEvent) => void;
  private _onResetState: () => void;
  private _onDragStart: (e: DragEvent) => void;

  constructor(
    handler: (e: GestureEvent) => void,
    opts: Partial<GestureDetectorOptions> = {}
  ) {
    this.handler = handler;
    this.opts = { ...DEFAULTS, ...opts };

    this._onMouseDown = this.onMouseDown.bind(this);
    this._onMouseUp = this.onMouseUp.bind(this);
    this._onMouseMove = this.onMouseMove.bind(this);
    this._onContextMenu = this.onContextMenu.bind(this);
    this._onWheel = this.onWheel.bind(this);
    this._onResetState = this.resetState.bind(this);
    this._onDragStart = (e: DragEvent) => {
      if (this.gestureActive) e.preventDefault();
    };
  }

  attach(): () => void {
    // Use capture: true to fire before page handlers
    // Use passive: false so we can preventDefault
    const opts: AddEventListenerOptions = { capture: true, passive: false };

    document.addEventListener("mousedown", this._onMouseDown, opts);
    document.addEventListener("mouseup", this._onMouseUp, opts);
    document.addEventListener("mousemove", this._onMouseMove, opts);
    document.addEventListener("contextmenu", this._onContextMenu, opts);
    document.addEventListener("wheel", this._onWheel, opts);

    // Also prevent dragstart during gesture (browser might start text selection)
    document.addEventListener("dragstart", this._onDragStart, opts);

    // Reset state when tab loses focus or becomes hidden
    // (mouseup may not fire on this tab if user switched tabs while holding a button)
    window.addEventListener("mouseup", this._onMouseUp, opts);
    window.addEventListener("blur", this._onResetState);
    document.addEventListener("visibilitychange", this._onResetState);

    return () => this.detach();
  }

  detach(): void {
    document.removeEventListener("mousedown", this._onMouseDown, true);
    document.removeEventListener("mouseup", this._onMouseUp, true);
    document.removeEventListener("mousemove", this._onMouseMove, true);
    document.removeEventListener("contextmenu", this._onContextMenu, true);
    document.removeEventListener("wheel", this._onWheel, true);
    document.removeEventListener("dragstart", this._onDragStart, true);
    window.removeEventListener("mouseup", this._onMouseUp, true);
    window.removeEventListener("blur", this._onResetState);
    document.removeEventListener("visibilitychange", this._onResetState);
    this.resetState();
  }

  // ── Mouse down ──

  private onMouseDown(e: MouseEvent): void {
    if (this.isInput(e.target)) return;

    const wasRightDown = this.rightDown;
    const wasLeftDown = this.leftDown;

    if (e.button === 0) {
      this.leftDown = true;
      if (!this.rightDown) {
        this.startX = e.clientX;
        this.startY = e.clientY;
      }
    }

    if (e.button === 1) {
      this.middleDown = true;
    }

    if (e.button === 2) {
      this.rightDown = true;
      if (!this.leftDown) {
        this.startX = e.clientX;
        this.startY = e.clientY;
      }
    }

    // Mark gesture as active (suppress context menu, etc.)
    if (this.leftDown || this.rightDown || this.middleDown) {
      this.gestureActive = true;
    }

    // Both buttons now down �?start close timer
    if (this.leftDown && this.rightDown && !this.closeTimer) {
      // Prevent ALL default behavior during the gesture
      e.preventDefault();
      this.bothConfirmed = true;

      console.log("[tapclosed:gesture] both buttons down, starting hold timer");
      this.closeTimer = setTimeout(() => {
        this.closeTimer = null;

        // Cooldown
        const now = Date.now();
        if (now - this.lastCloseTime < this.opts.closeCooldownMs) {
          console.log("[tapclosed:gesture] cooldown active");
          return;
        }

        this.lastCloseTime = now;
        console.log("[tapclosed:gesture] CLOSE fired!");
        this.handler({ type: "CLOSE" });

        this.resetState();
      }, this.opts.closeHoldMs);
    }
  }

  // ── Mouse up ──

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 0) this.leftDown = false;
    if (e.button === 1) this.middleDown = false;
    if (e.button === 2) this.rightDown = false;

    // If both were confirmed held and timer is running, let it fire
    // (Windows may fire spurious mouseup for button 2 during contextmenu suppression)
    if (this.bothConfirmed && this.closeTimer) return;

    if (!this.leftDown && !this.rightDown && !this.middleDown) {
      this.gestureActive = false;
      this.bothConfirmed = false;
      this.cancelClose();
    } else if (this.closeTimer && (!this.leftDown || !this.rightDown)) {
      // One button released while holding �?cancel
      this.cancelClose();
    }
  }

  // ── Mouse move ──

  private onMouseMove(e: MouseEvent): void {
    if (!this.closeTimer) return;

    const dx = e.clientX - this.startX;
    const dy = e.clientY - this.startY;
    if (dx * dx + dy * dy > this.opts.moveThreshold * this.opts.moveThreshold) {
      console.log("[tapclosed:gesture] cancelled �?moved too far");
      this.cancelClose();
    }
  }

  // ── Context menu ──

  private onContextMenu(e: Event): void {
    // ALWAYS suppress context menu during gesture
    if (this.gestureActive) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    }
  }

  // ── Scroll wheel (tab switching) ──

  private onWheel(e: WheelEvent): void {
    if (this.isInput(e.target)) return;

    // Right button must be held, left and middle must NOT be held
    if (!this.rightDown || this.leftDown || this.middleDown) return;

    e.preventDefault();
    e.stopPropagation();

    if (e.deltaY < 0) {
      console.log("[tapclosed:gesture] TAB_PREV");
      this.handler({ type: "TAB_PREV" });
    } else if (e.deltaY > 0) {
      console.log("[tapclosed:gesture] TAB_NEXT");
      this.handler({ type: "TAB_NEXT" });
    }
  }

  // ── Helpers ──

  private cancelClose(): void {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
    this.bothConfirmed = false;
  }

  private resetState(): void {
    this.leftDown = false;
    this.rightDown = false;
    this.middleDown = false;
    this.gestureActive = false;
    this.bothConfirmed = false;
    this.cancelClose();
  }

  private isInput(target: EventTarget | null): boolean {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (target.isContentEditable) return true;
    if (target.closest(".monaco-editor") || target.closest(".CodeMirror")) return true;
    return false;
  }
}
