import { resolveTarget } from "../../core/src/challenge/target.ts";
import type { Windows } from "../../core/src/windows.ts";
import { matchesBlocklist } from "./blocklist.ts";
import type { Domain } from "./blocklist.ts";

interface Enforcement {
  rules: chrome.declarativeNetRequest.Rule[];
  alarms: { name: string; when: number }[];
}

export function hostPermission(domain: Domain): string {
  return `*://*.${domain}/*`;
}

export function needsRegate(
  url: string,
  blocklist: readonly Domain[],
  windows: Windows,
  now: number,
): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.replace(/\.$/, "");
  } catch {
    return false;
  }
  const domain = matchesBlocklist(hostname, blocklist);
  return domain !== null && (windows[domain] ?? 0) <= now;
}

export function releaseUrl(
  tabUrl: string,
  challengePage: string,
  blocklist: readonly Domain[],
): string | null {
  if (!tabUrl.startsWith(`${challengePage}?`)) return null;
  const url = new URL(tabUrl);
  const target = resolveTarget(url.searchParams, url.hash);
  if (!target || blocklist.includes(target.surface)) return null;
  return target.returnUrl;
}

export function deriveEnforcement(
  blocklist: readonly Domain[],
  windows: Windows,
  now: number,
  challengePage: string,
): Enforcement {
  const rules: Enforcement["rules"] = [];
  const alarms: Enforcement["alarms"] = [];
  for (const [index, domain] of blocklist.entries()) {
    const expiresAt = windows[domain] ?? 0;
    if (expiresAt > now) {
      alarms.push({ name: `expire:${domain}`, when: expiresAt });
    } else {
      rules.push({
        id: index + 1,
        priority: 1,
        action: {
          type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
          redirect: { regexSubstitution: `${challengePage}?surface=${domain}#\\0` },
        },
        condition: {
          regexFilter: "^.*$",
          requestDomains: [domain],
          resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType],
        },
      });
    }
  }
  return { rules, alarms };
}
