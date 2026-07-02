import type { ClosedTabInfo } from "@/types";
import { logger } from "@/utils/logger";

/**
 * Manages tab operations: close with undo support, restore, focus mode dimming.
 */

export async function getActiveTab(): Promise<chrome.tabs.Tab | null> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab ?? null;
  } catch {
    return null;
  }
}

export async function closeTab(tabId: number): Promise<ClosedTabInfo | null> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab) return null;

    const info: ClosedTabInfo = {
      tabId: tab.id!,
      url: tab.url || "",
      title: tab.title || "",
      windowId: tab.windowId,
      index: tab.index,
      closedAt: Date.now(),
      pinned: tab.pinned || false,
    };

    await chrome.tabs.remove(tabId);
    logger.info("closed tab:", info.title);
    return info;
  } catch (err) {
    logger.error("failed to close tab:", err);
    return null;
  }
}

export async function restoreTab(closed: ClosedTabInfo): Promise<boolean> {
  try {
    const restored = await chrome.tabs.create({
      url: closed.url,
      windowId: closed.windowId,
      index: closed.index,
      pinned: closed.pinned,
      active: true,
    });
    logger.info("restored tab:", closed.title, restored?.id);
    return true;
  } catch (err) {
    logger.error("failed to restore tab:", err);
    return false;
  }
}

/**
 * Dim all tabs except the given tabId (for focus mode).
 * Returns an undo function that restores original opacities.
 */
export async function dimOtherTabs(activeTabId: number): Promise<() => void> {
  // In a real extension, we can't directly control tab rendering.
  // Instead, we use content scripts to dim pages in other tabs.
  // For the active tab, we communicate via messaging.
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  const tabIds = allTabs
    .filter((t) => t.id !== activeTabId && t.id !== undefined)
    .map((t) => t.id!);

  // Send dim message to each tab
  for (const id of tabIds) {
    try {
      await chrome.tabs.sendMessage(id, { type: "FOCUS_DIM" });
    } catch {
      // Tab might not have content script
    }
  }

  return () => {
    for (const id of tabIds) {
      chrome.tabs.sendMessage(id, { type: "FOCUS_UNDIM" }).catch(() => {});
    }
  };
}
