import type { ProtectionRule } from "@/types";
import { logger } from "@/utils/logger";

/**
 * Check if a URL matches a protection rule.
 */
export function isProtected(
  url: string,
  rules: ProtectionRule[]
): ProtectionRule | null {
  if (!rules.length) return null;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  for (const rule of rules) {
    if (!rule.enabled) continue;

    switch (rule.type) {
      case "domain": {
        // Match exact domain or subdomain
        const domain = rule.pattern.toLowerCase();
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === domain || hostname.endsWith("." + domain)) {
          logger.info("protected by rule:", rule.label || rule.pattern);
          return rule;
        }
        break;
      }
      case "exact": {
        if (parsed.href === rule.pattern) return rule;
        break;
      }
      case "regex": {
        try {
          const re = new RegExp(rule.pattern, "i");
          if (re.test(parsed.href)) return rule;
        } catch {
          logger.warn("invalid regex rule:", rule.pattern);
        }
        break;
      }
    }
  }

  return null;
}

/**
 * Default protection rules for common sensitive sites.
 */
export const DEFAULT_RULES: ProtectionRule[] = [
  { id: "gmail", pattern: "mail.google.com", type: "domain", enabled: true, label: "Gmail" },
  { id: "chatgpt", pattern: "chat.openai.com", type: "domain", enabled: true, label: "ChatGPT" },
  { id: "gdocs", pattern: "docs.google.com", type: "domain", enabled: true, label: "Google Docs" },
  { id: "gsheets", pattern: "sheets.google.com", type: "domain", enabled: true, label: "Google Sheets" },
  { id: "figma", pattern: "figma.com", type: "domain", enabled: true, label: "Figma" },
];
