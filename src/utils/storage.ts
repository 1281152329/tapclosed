import { tapclosedSettings, DEFAULT_SETTINGS } from "@/types";

const STORAGE_KEY = "tapclosed_settings";

export async function getSettings(): Promise<tapclosedSettings> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Partial<tapclosedSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...settings };
  await chrome.storage.sync.set({ [STORAGE_KEY]: merged });
}

export function onSettingsChange(
  callback: (settings: tapclosedSettings) => void
): () => void {
  const handler = (
    changes: { [key: string]: chrome.storage.StorageChange },
    area: string
  ) => {
    if (area === "sync" && changes[STORAGE_KEY]) {
      callback({ ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue });
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
