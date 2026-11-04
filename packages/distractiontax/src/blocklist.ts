import { getWindows, WINDOWS_KEY } from "../../core/src/windows.ts";
import type { Windows } from "../../core/src/windows.ts";

export type Domain = string;

export const DEFAULT_BLOCKLIST = [
  "youtube.com",
  "instagram.com",
  "news.ycombinator.com",
] as const satisfies readonly Domain[];

export const BLOCKLIST_KEY = "blocklist";

export const MAX_BLOCKLIST = 200;

type Parsed<T> = { ok: true; value: T } | { ok: false; reason: string };

const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const IPV4 = /^\d{1,3}(?:\.\d{1,3}){3}$/;

export function parseDomain(input: string): Parsed<Domain> {
  const text = input.trim().toLowerCase();
  if (!text) return { ok: false, reason: "Type a site, like reddit.com." };

  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(text) ? text : `https://${text}`);
  } catch {
    return { ok: false, reason: `${input.trim()} isn't a site. Try something like reddit.com.` };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, reason: "Only websites can be gated. Try something like reddit.com." };
  }

  let host = url.hostname.replace(/\.$/, "");
  if (host.startsWith("www.")) host = host.slice(4);

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    IPV4.test(host) ||
    host.startsWith("[")
  ) {
    return {
      ok: false,
      reason: "Local and IP addresses can't be gated. Use a domain like reddit.com.",
    };
  }
  const labels = host.split(".");
  if (
    host.length > 253 ||
    labels.length < 2 ||
    !labels.every((label) => LABEL.test(label)) ||
    /^\d+$/.test(labels[labels.length - 1])
  ) {
    return { ok: false, reason: `${input.trim()} isn't a site. Try something like reddit.com.` };
  }
  return { ok: true, value: host };
}

export function matchesBlocklist(hostname: string, blocklist: readonly Domain[]): Domain | null {
  for (const domain of blocklist) {
    if (hostname === domain || hostname.endsWith(`.${domain}`)) return domain;
  }
  return null;
}

export function addToBlocklist(
  blocklist: readonly Domain[],
  domain: Domain,
): Parsed<{ blocklist: Domain[]; replaced: Domain[] }> {
  const covering = matchesBlocklist(domain, blocklist);
  if (covering === domain) return { ok: false, reason: `${domain} is already on the Blocklist.` };
  if (covering) return { ok: false, reason: `${covering} already covers ${domain}.` };
  const replaced = blocklist.filter((entry) => matchesBlocklist(entry, [domain]));
  const next = [...blocklist.filter((entry) => !replaced.includes(entry)), domain];
  if (next.length > MAX_BLOCKLIST) {
    return { ok: false, reason: `The Blocklist holds up to ${MAX_BLOCKLIST} sites.` };
  }
  return { ok: true, value: { blocklist: next, replaced } };
}

export function removeFromBlocklist(blocklist: readonly Domain[], domain: Domain): Domain[] {
  return blocklist.filter((entry) => entry !== domain);
}

export function parseStoredBlocklist(stored: unknown): Domain[] {
  if (!Array.isArray(stored)) return [...DEFAULT_BLOCKLIST];
  let blocklist: Domain[] = [];
  for (const entry of stored) {
    if (typeof entry !== "string") continue;
    const domain = parseDomain(entry);
    if (!domain.ok || domain.value !== entry) continue;
    const added = addToBlocklist(blocklist, domain.value);
    if (added.ok && added.value.replaced.length === 0) blocklist = added.value.blocklist;
  }
  return blocklist;
}

export function keepListedWindows(windows: Windows, blocklist: readonly Domain[]): Windows {
  return Object.fromEntries(
    Object.entries(windows).filter(([domain]) => blocklist.includes(domain as Domain)),
  );
}

export async function getBlocklist(): Promise<Domain[]> {
  const stored = await chrome.storage.local.get(BLOCKLIST_KEY);
  return parseStoredBlocklist(stored[BLOCKLIST_KEY]);
}

export async function saveBlocklist(blocklist: readonly Domain[]): Promise<void> {
  const windows = await getWindows();
  const kept = keepListedWindows(windows, blocklist);
  await chrome.storage.local.set(
    Object.keys(kept).length === Object.keys(windows).length
      ? { [BLOCKLIST_KEY]: blocklist }
      : { [BLOCKLIST_KEY]: blocklist, [WINDOWS_KEY]: kept },
  );
}

export async function seedBlocklist(): Promise<void> {
  const stored = await chrome.storage.local.get(BLOCKLIST_KEY);
  if (stored[BLOCKLIST_KEY] === undefined) {
    await chrome.storage.local.set({ [BLOCKLIST_KEY]: [...DEFAULT_BLOCKLIST] });
  }
}
