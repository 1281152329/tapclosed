import React, { useEffect, useCallback, useRef, useState } from "react";
import { UndoToast } from "./UndoToast";
import { ProtectionOverlay } from "./ProtectionOverlay";
import type { ClosedTabInfo, tapclosedSettings } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";

/**
 * Root content script React component.
 * Renders the undo toast and protection overlay inside the shadow DOM.
 * Does NOT render gesture/focus UI â€?those are handled by non-React modules.
 */
export function ContentApp() {
  const [settings, setSettings] = useState<tapclosedSettings>(DEFAULT_SETTINGS);
  const [undoVisible, setUndoVisible] = useState(false);
  const [closedTab, setClosedTab] = useState<ClosedTabInfo | null>(null);
  const [protectedRule, setProtectedRule] = useState<string | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Load settings
  useEffect(() => {
    chrome.storage.sync.get("tapclosed_settings", (result) => {
      setSettings({ ...DEFAULT_SETTINGS, ...result.tapclosed_settings });
    });

    const handler = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === "sync" && changes.tapclosed_settings) {
        setSettings({ ...DEFAULT_SETTINGS, ...changes.tapclosed_settings.newValue });
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // Listen for messages from background
  useEffect(() => {
    const handler = (msg: any) => {
      if (msg.type === "SHOW_UNDO") {
        setClosedTab(msg.payload);
        setUndoVisible(true);

        clearTimeout(undoTimerRef.current);
        undoTimerRef.current = setTimeout(() => {
          setUndoVisible(false);
        }, settings.undoDuration);
      }

      if (msg.type === "SHOW_PROTECTION") {
        setProtectedRule(msg.payload.label || "This site");
      }
    };

    chrome.runtime.onMessage.addListener(handler);
    return () => chrome.runtime.onMessage.removeListener(handler);
  }, [settings.undoDuration]);

  const handleUndo = useCallback(() => {
    if (closedTab) {
      chrome.runtime.sendMessage({
        type: "UNDO_CLOSE",
        payload: { closedTab },
      });
    }
    setUndoVisible(false);
    clearTimeout(undoTimerRef.current);
  }, [closedTab]);

  const handleDismissUndo = useCallback(() => {
    setUndoVisible(false);
    clearTimeout(undoTimerRef.current);
  }, []);

  const handleDismissProtection = useCallback(() => {
    setProtectedRule(null);
  }, []);

  return (
    <>
      <UndoToast
        visible={undoVisible}
        title={closedTab?.title || "Tab closed"}
        onUndo={handleUndo}
        onDismiss={handleDismissUndo}
        duration={settings.undoDuration}
      />
      <ProtectionOverlay
        visible={!!protectedRule}
        ruleLabel={protectedRule || ""}
        onDismiss={handleDismissProtection}
      />
    </>
  );
}
