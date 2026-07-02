import type { SoundType, SoundConfig } from "@/types";
import { logger } from "@/utils/logger";

/**
 * Minimal emotional sound manager.
 * Uses Web Audio API to generate soft, breath-like sounds procedurally.
 * No external audio files needed — zero asset overhead.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function ensureResumed(ctx: AudioContext): void {
  if (ctx.state === "suspended") {
    ctx.resume();
  }
}

function createNoiseBuffer(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  return buffer;
}

function playBreathSound(config: SoundConfig): void {
  if (!config.enabled) return;

  try {
    const ctx = getAudioContext();
    ensureResumed(ctx);
    const duration = 0.25;

    // White noise through bandpass → breath-like
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = createNoiseBuffer(ctx, duration);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 800;
    filter.Q.value = 0.5;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(config.volume * 0.4, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noiseSource.start(now);
    noiseSource.stop(now + duration);
  } catch (err) {
    logger.warn("Sound playback failed:", err);
  }
}

function playSoftTap(config: SoundConfig): void {
  if (!config.enabled) return;

  try {
    const ctx = getAudioContext();
    ensureResumed(ctx);
    const duration = 0.08;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 600;

    const gain = ctx.createGain();
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(config.volume * 0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (err) {
    logger.warn("Sound playback failed:", err);
  }
}

export const soundManager = {
  play(type: SoundType, config: SoundConfig): void {
    switch (type) {
      case "close":
        playBreathSound(config);
        break;
      case "undo":
        playSoftTap(config);
        break;
    }
  },

  /** Warm up AudioContext on first user gesture (required by browsers) */
  warmUp(): void {
    try {
      const ctx = getAudioContext();
      ensureResumed(ctx);
    } catch {
      // Will be retried on actual play
    }
  },

  /** Check if AudioContext is ready (running state) */
  isReady(): boolean {
    return audioCtx !== null && audioCtx.state === "running";
  },
};
