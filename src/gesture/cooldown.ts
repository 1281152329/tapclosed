/**
 * Manages cooldown between gesture triggers to prevent accidental double-fires.
 */

let lastTriggerTime = 0;

export function isInCooldown(cooldownMs: number): boolean {
  return Date.now() - lastTriggerTime < cooldownMs;
}

export function markTriggered(): void {
  lastTriggerTime = Date.now();
}

export function resetCooldown(): void {
  lastTriggerTime = 0;
}

export function getRemainingCooldown(cooldownMs: number): number {
  const elapsed = Date.now() - lastTriggerTime;
  return Math.max(0, cooldownMs - elapsed);
}
