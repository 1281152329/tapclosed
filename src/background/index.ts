import type { ClosedTabInfo } from "@/types";
import { DEFAULT_SETTINGS } from "@/types";
import { getMainDomain, findTabsByDomain, findOtherTabs, findAllTabsInWindow, closeTabs } from "@/tabs/domain-close";

const TAG = "[tapclosed:bg]";
const log = (...a: unknown[]) => console.log(TAG, ...a);

const UNDO_STORAGE_KEY = "tapclosed_undo_info";
const UNDO_TTL = 30_000; // 30 seconds

let lastClosedTabs: ClosedTabInfo[] = [];

// ── Helpers ──

async function saveUndoInfo(tabs: ClosedTabInfo[]): Promise<void> {
  lastClosedTabs = tabs;
  try {
    await chrome.storage.local.set({ [UNDO_STORAGE_KEY]: tabs });
  } catch {
    // storage might be unavailable
  }
}

async function clearUndoInfo(): Promise<void> {
  lastClosedTabs = [];
  try {
    await chrome.storage.local.remove(UNDO_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function sendShowUndoWithRetry(tabId: number, tabs: ClosedTabInfo[], attempts = 5): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "SHOW_UNDO", payload: { tabs, count: tabs.length } });
      log("SHOW_UNDO delivered on attempt", i + 1, "tabs:", tabs.length);
      return;
    } catch (e) {
      log(`SHOW_UNDO attempt ${i + 1}/${attempts} failed:`, (e as Error).message);
      if (i < attempts - 1) {
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  log("SHOW_UNDO failed after all attempts, undo info saved in storage");
}

// ── Message handling ──

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  log("received:", msg.type, "sender.tab:", sender.tab?.id ?? "none");

  if (msg.type === "CLOSE_TAB") {
    (async () => {
      // Get tab from sender or query active tab (popup case)
      let tab = sender.tab;
      if (!tab?.id) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        tab = active;
      }
      if (!tab?.id) {
        log("ERROR: no tab id!");
        sendResponse({ ok: false, error: "no tab id" });
        return;
      }

      const tabId = tab.id;
      log("will close tab:", tabId);

      // Save info for undo
      const closedInfo: ClosedTabInfo = {
        tabId: tabId,
        url: tab.url || "",
        title: tab.title || "",
        windowId: tab.windowId || 0,
        index: tab.index || 0,
        closedAt: Date.now(),
        pinned: tab.pinned || false,
      };
      saveUndoInfo([closedInfo]);

      // Close it
      chrome.tabs.remove(tabId).then(() => {
        log("tab closed:", tabId);
        setTimeout(() => {
          chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
            if (active?.id && lastClosedTabs.length > 0) {
              sendShowUndoWithRetry(active.id, lastClosedTabs);
            }
          });
        }, 500);
      }).catch(e => {
        log("remove failed:", e.message);
        chrome.tabs.sendMessage(tabId, { type: "BG_ERROR", payload: "Close failed: " + e.message })
          .catch(() => {});
      });
    })();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "UNDO_CLOSE") {
    (async () => {
      const tabsToRestore = lastClosedTabs;
      if (tabsToRestore.length > 0) {
        log("restoring", tabsToRestore.length, "tabs");
        // Restore all tabs in reverse order to maintain original positions
        for (const tab of [...tabsToRestore].reverse()) {
          try {
            await chrome.tabs.create({
              url: tab.url,
              windowId: tab.windowId,
              index: tab.index,
              pinned: tab.pinned,
              active: tabsToRestore.indexOf(tab) === 0, // Only first one is active
            });
          } catch (e) {
            log("undo tab failed:", e);
          }
        }
        clearUndoInfo();
      } else {
        clearUndoInfo();
      }
    })();
    sendResponse({ ok: true });
    return true; // async response
  }

  if (msg.type === "GET_UNDO_INFO") {
    // Content script is asking if there's a pending undo
    if (lastClosedTabs.length > 0 && (Date.now() - lastClosedTabs[0].closedAt) < UNDO_TTL) {
      sendResponse({ undoInfo: lastClosedTabs });
    } else if (lastClosedTabs.length > 0) {
      // Expired
      clearUndoInfo();
      sendResponse({ undoInfo: null });
    } else {
      sendResponse({ undoInfo: null });
    }
    return;
  }

  if (msg.type === "QUERY_DOMAIN_TABS") {
    const domain = msg.payload?.domain;
    if (!domain) {
      sendResponse({ ok: false, error: "no domain" });
      return;
    }

    findTabsByDomain(domain).then(tabs => {
      const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
      const tabCount = tabIds.length;
      log(`found ${tabCount} tabs for domain:`, domain);

      // Send result back to the sender tab
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, {
          type: "DOMAIN_TABS_RESULT",
          payload: { domain, tabCount, tabIds },
        }).catch(() => {});
      }
    }).catch(e => {
      log("query domain tabs failed:", e);
    });

    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "CLOSE_DOMAIN_TABS") {
    (async () => {
      // Get tab from sender or query active tab (popup case)
      let senderTab = sender.tab;
      if (!senderTab?.url) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        senderTab = active;
      }

      let tabIds: number[] = [];

      // If tabIds provided, use them (backward compat)
      if (msg.payload?.tabIds && msg.payload.tabIds.length > 0) {
        tabIds = msg.payload.tabIds;
      } else if (senderTab?.url) {
        // Otherwise determine domain from sender tab
        const domain = getMainDomain(senderTab.url);
        if (!domain) {
          sendResponse({ ok: false, error: "invalid url" });
          return;
        }
        const tabs = await findTabsByDomain(domain);
        tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
        log(`found ${tabIds.length} tabs for domain:`, domain);
      } else {
        sendResponse({ ok: false, error: "no tab info" });
        return;
      }

      if (!tabIds.length) {
        sendResponse({ ok: false, error: "no tabs to close" });
        return;
      }

      closeTabs(tabIds).then(closed => {
        log("closed", closed.length, "domain tabs");
        saveUndoInfo(closed);

        // If the current tab was closed, create a new tab to keep window open
        const currentTabClosed = closed.some(t => t.tabId === senderTab?.id);
        if (currentTabClosed) {
          chrome.tabs.create({ url: "about:blank" }).catch(() => {});
        }

        // Show undo on next active tab
        setTimeout(() => {
          chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
            if (active?.id && lastClosedTabs.length > 0) {
              sendShowUndoWithRetry(active.id, lastClosedTabs);
            }
          });
        }, 500);
      }).catch(e => {
        log("close domain tabs failed:", e);
      });
    })();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "CLOSE_OTHER_TABS") {
    (async () => {
      // Get tab from sender or query active tab (popup case)
      let senderTab = sender.tab;
      if (!senderTab?.id) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        senderTab = active;
      }
      const currentTabId = senderTab?.id;
      if (!currentTabId) {
        sendResponse({ ok: false, error: "no sender tab id" });
        return;
      }

      findOtherTabs(currentTabId).then(tabs => {
        const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
        log(`found ${tabIds.length} other tabs`);

        closeTabs(tabIds).then(closed => {
          log("closed", closed.length, "other tabs");
          saveUndoInfo(closed);

          // Show undo on current tab (it stays open)
          try {
            sendShowUndoWithRetry(currentTabId, lastClosedTabs);
          } catch {
            // content script not available (e.g. chrome:// page)
          }
        });
      }).catch(e => {
        log("close other tabs failed:", e);
      });
    })();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "CLOSE_ALL_TABS") {
    (async () => {
      // Get window from sender or query active tab (popup case)
      let windowId = sender.tab?.windowId;
      if (!windowId) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        windowId = active?.windowId;
      }
      if (!windowId) {
        sendResponse({ ok: false, error: "no sender window id" });
        return;
      }

      findAllTabsInWindow().then(tabs => {
        const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
        log(`found ${tabIds.length} tabs in window`);

        // Save undo info before closing
        const closedInfo: ClosedTabInfo[] = tabs.map(tab => ({
          tabId: tab.id!,
          url: tab.url || "",
          title: tab.title || "",
          windowId: tab.windowId,
          index: tab.index,
          closedAt: Date.now(),
          pinned: tab.pinned || false,
        }));

        // Create a new tab first so the window doesn't close
        chrome.tabs.create({ url: "about:blank", windowId }).then(() => {
          closeTabs(tabIds).then(closed => {
            log("closed", closed.length, "tabs");
            saveUndoInfo(closedInfo);

            // Show undo on new tab
            setTimeout(() => {
              chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
                if (active?.id && lastClosedTabs.length > 0) {
                  sendShowUndoWithRetry(active.id, lastClosedTabs);
                }
              });
            }, 500);
          });
        }).catch(e => {
          log("create new tab failed:", e);
        });
      }).catch(e => {
        log("close all tabs failed:", e);
      });
    })();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "DUPLICATE_TAB") {
    (async () => {
      // Get tab from sender or query active tab (popup case)
      let tabId = sender.tab?.id;
      if (!tabId) {
        const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
        tabId = active?.id;
      }
      if (!tabId) {
        sendResponse({ ok: false, error: "no sender tab id" });
        return;
      }

      chrome.tabs.duplicate(tabId).then(dup => {
        log("duplicated tab:", dup?.id, dup?.title);
      }).catch(e => {
        log("duplicate tab failed:", e);
      });
    })();
    sendResponse({ ok: true });
    return true;
  }

  if (msg.type === "TAB_NEXT" || msg.type === "TAB_PREV") {
    const windowId = sender.tab?.windowId;
    if (windowId) {
      chrome.tabs.query({ windowId }).then(tabs => {
        if (tabs.length < 2) return;
        const idx = tabs.findIndex(t => t.active);
        if (idx === -1) return;
        const next = msg.type === "TAB_NEXT"
          ? (idx + 1) % tabs.length
          : (idx - 1 + tabs.length) % tabs.length;
        const target = tabs[next];
        if (target?.id) {
          log("switch to:", target.title);
          chrome.tabs.update(target.id, { active: true });
        }
      });
    }
    sendResponse({ ok: true });
    return;
  }

  if (msg.type === "GET_SETTINGS") {
    chrome.storage.sync.get("tapclosed_settings").then(result => {
      sendResponse({ ...DEFAULT_SETTINGS, ...result.tapclosed_settings });
    });
    return true; // async
  }
});

// ── Install ──

chrome.runtime.onInstalled.addListener((details) => {
  log("installed:", details.reason);
  if (details.reason === "install") {
    chrome.storage.sync.set({ tapclosed_settings: DEFAULT_SETTINGS });
  }
});

// ── Keyboard commands (work on ALL pages including chrome://) ──

async function closeCurrentTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const closedInfo: ClosedTabInfo = {
    tabId: tab.id,
    url: tab.url || "",
    title: tab.title || "",
    windowId: tab.windowId,
    index: tab.index,
    closedAt: Date.now(),
    pinned: tab.pinned || false,
  };
  saveUndoInfo([closedInfo]);

  await chrome.tabs.remove(tab.id);
  log("keyboard: closed tab", tab.id);

  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      if (active?.id && lastClosedTabs.length > 0) {
        sendShowUndoWithRetry(active.id, lastClosedTabs);
      }
    });
  }, 500);
}

async function closeDomainTabs(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  const domain = getMainDomain(tab.url);
  if (!domain) return;

  const tabs = await findTabsByDomain(domain);
  const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
  if (!tabIds.length) return;

  const closed = await closeTabs(tabIds);
  log("keyboard: closed", closed.length, "domain tabs");
  saveUndoInfo(closed);

  const currentTabClosed = closed.some(t => t.tabId === tab.id);
  if (currentTabClosed) {
    chrome.tabs.create({ url: "about:blank" }).catch(() => {});
  }

  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      if (active?.id && lastClosedTabs.length > 0) {
        sendShowUndoWithRetry(active.id, lastClosedTabs);
      }
    });
  }, 500);
}

async function closeOtherTabs(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  const tabs = await findOtherTabs(tab.id);
  const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
  if (!tabIds.length) return;

  const closed = await closeTabs(tabIds);
  log("keyboard: closed", closed.length, "other tabs");
  saveUndoInfo(closed);

  // Current tab stays open, show undo there
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "SHOW_UNDO", payload: { tabs: lastClosedTabs, count: lastClosedTabs.length } });
  } catch {
    // content script not available (e.g. chrome:// page), skip undo toast
  }
}

async function closeAllTabs(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.windowId) return;

  const tabs = await findAllTabsInWindow();
  const tabIds = tabs.filter(t => t.id !== undefined).map(t => t.id!);
  if (!tabIds.length) return;

  const closedInfo: ClosedTabInfo[] = tabs.map(t => ({
    tabId: t.id!,
    url: t.url || "",
    title: t.title || "",
    windowId: t.windowId,
    index: t.index,
    closedAt: Date.now(),
    pinned: t.pinned || false,
  }));

  // Create a new tab first so the window doesn't close
  await chrome.tabs.create({ url: "about:blank", windowId: tab.windowId });
  const closed = await closeTabs(tabIds);
  log("keyboard: closed", closed.length, "tabs");
  saveUndoInfo(closedInfo);

  setTimeout(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([active]) => {
      if (active?.id && lastClosedTabs.length > 0) {
        sendShowUndoWithRetry(active.id, lastClosedTabs);
      }
    });
  }, 500);
}

async function duplicateCurrentTab(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  const dup = await chrome.tabs.duplicate(tab.id);
  log("keyboard: duplicated tab", dup?.id);
}

chrome.commands.onCommand.addListener((command) => {
  log("command:", command);
  switch (command) {
    case "close-tab":
      closeCurrentTab().catch(e => log("close-tab failed:", e));
      break;
    case "close-domain":
      closeDomainTabs().catch(e => log("close-domain failed:", e));
      break;
    case "close-others":
      closeOtherTabs().catch(e => log("close-others failed:", e));
      break;
    case "duplicate-tab":
      duplicateCurrentTab().catch(e => log("duplicate-tab failed:", e));
      break;
  }
});

log("service worker loaded");
