const PREFIX = "[tapclosed]";

// In development, Vite replaces process.env.NODE_ENV at build time.
// For Chrome extensions, we use a global flag or always log.
declare const __DEV__: boolean;

const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : true;

export const logger = {
  info: (...args: unknown[]) => {
    if (isDev) console.log(PREFIX, ...args);
  },
  warn: (...args: unknown[]) => {
    console.warn(PREFIX, ...args);
  },
  error: (...args: unknown[]) => {
    console.error(PREFIX, ...args);
  },
  gesture: (...args: unknown[]) => {
    if (isDev) console.log(PREFIX, "[gesture]", ...args);
  },
  animation: (...args: unknown[]) => {
    if (isDev) console.log(PREFIX, "[animation]", ...args);
  },
};
