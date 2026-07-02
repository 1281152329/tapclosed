import { useEffect } from "react";
import { usetapclosedStore } from "@/state/store";
import { getSettings, onSettingsChange } from "@/utils/storage";

export function useSettings() {
  const settings = usetapclosedStore((s) => s.settings);
  const updateSettings = usetapclosedStore((s) => s.updateSettings);

  useEffect(() => {
    getSettings().then(updateSettings);
    const unsub = onSettingsChange(updateSettings);
    return unsub;
  }, [updateSettings]);

  return settings;
}
