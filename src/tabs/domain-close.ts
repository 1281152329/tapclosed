import type { ClosedTabInfo } from "@/types";

export interface DomainCloseInfo {
  domain: string;
  tabCount: number;
  tabIds: number[];
}

/**
 * Extract the main domain from a URL.
 * e.g. "https://www.example.com/path" -> "example.com"
 */
export function getMainDomain(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    // Remove www. prefix
    const withoutWww = hostname.replace(/^www\./, "");
    // For subdomains, return the registered domain (last two parts)
    // e.g. "api.github.com" -> "github.com"
    const parts = withoutWww.split(".");
    if (parts.length > 2) {
      // Check if it's a country-code TLD like .co.uk
      const tld = parts[parts.length - 1];
      const sld = parts[parts.length - 2];
      if (tld.length === 2 && sld.length <= 3) {
        // Likely country code TLD with second level, include one more level
        return parts.slice(-3).join(".");
      }
      return parts.slice(-2).join(".");
    }
    return withoutWww;
  } catch {
    return "";
  }
}

/**
 * Query all tabs in the current window and find those matching the given domain.
 */
export async function findTabsByDomain(domain: string): Promise<chrome.tabs.Tab[]> {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.filter((tab) => {
      if (!tab.url) return false;
      const tabDomain = getMainDomain(tab.url);
      return tabDomain === domain || tab.url.includes(domain);
    });
  } catch {
    return [];
  }
}

/**
 * Find all tabs in the current window except the given tab ID.
 */
export async function findOtherTabs(excludeTabId: number): Promise<chrome.tabs.Tab[]> {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    return tabs.filter((tab) => tab.id !== excludeTabId);
  } catch {
    return [];
  }
}

/**
 * Find all tabs in the current window.
 */
export async function findAllTabsInWindow(): Promise<chrome.tabs.Tab[]> {
  try {
    return await chrome.tabs.query({ currentWindow: true });
  } catch {
    return [];
  }
}

/**
 * Close multiple tabs by their IDs.
 * Returns info about the closed tabs.
 */
export async function closeTabs(tabIds: number[]): Promise<ClosedTabInfo[]> {
  const closed: ClosedTabInfo[] = [];
  for (const tabId of tabIds) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab) {
        closed.push({
          tabId: tab.id!,
          url: tab.url || "",
          title: tab.title || "",
          windowId: tab.windowId,
          index: tab.index,
          closedAt: Date.now(),
          pinned: tab.pinned || false,
        });
      }
      await chrome.tabs.remove(tabId);
    } catch {
      // Tab might already be closed
    }
  }
  return closed;
}
