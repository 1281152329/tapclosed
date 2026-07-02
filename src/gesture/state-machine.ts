import type { GesturePhase } from "@/types";

/**
 * Gesture state machine transitions:
 *
 *   idle ──(leftDown)──► left-down
 *   left-down ──(rightDown within syncWindow)──► both-pressed
 *   left-down ──(timeout / leftUp)──► idle
 *   both-pressed ──(holdDuration met)──► triggered
 *   both-pressed ──(moveThreshold exceeded / eitherUp too early)──► idle
 *   triggered ──(animation complete)──► idle
 */

export interface StateMachineInput {
  leftDown: boolean;
  rightDown: boolean;
  timeSinceLeftDown: number;
  timeSinceBothDown: number;
  moveDistance: number;
  syncWindow: number;
  holdDuration: number;
  moveThreshold: number;
}

export function computeNextPhase(
  current: GesturePhase,
  input: StateMachineInput
): GesturePhase {
  const {
    leftDown,
    rightDown,
    timeSinceLeftDown,
    timeSinceBothDown,
    moveDistance,
    syncWindow,
    holdDuration,
    moveThreshold,
  } = input;

  // If either button released and we haven't triggered, go idle
  if (current === "both-pressed" && (!leftDown || !rightDown)) {
    return "idle";
  }

  // Movement exceeded threshold → cancel
  if (
    (current === "left-down" || current === "both-pressed") &&
    moveDistance > moveThreshold
  ) {
    return "idle";
  }

  switch (current) {
    case "idle":
      if (leftDown && !rightDown) return "left-down";
      if (rightDown && !leftDown) return "idle"; // Right-first not supported
      return "idle";

    case "left-down":
      if (!leftDown) return "idle"; // Left released before right came
      if (rightDown && timeSinceLeftDown <= syncWindow) return "both-pressed";
      if (timeSinceLeftDown > syncWindow) return "idle"; // Sync window expired
      return "left-down";

    case "both-pressed":
      if (timeSinceBothDown >= holdDuration) return "triggered";
      return "both-pressed";

    case "triggered":
      return "idle";

    default:
      return "idle";
  }
}
