import { expect, test } from "bun:test";
import { DEFAULT_BLOCKLIST } from "./blocklist.ts";

type Rule = chrome.declarativeNetRequest.Rule;
type Listener = (...args: never[]) => unknown;

function chromeEvent() {
  const listeners: Listener[] = [];
  return {
    addListener: (listener: Listener) => void listeners.push(listener),
    fire: (...args: unknown[]) => {
      for (const listener of listeners) (listener as (...a: unknown[]) => unknown)(...args);
    },
  };
}

const store: Record<string, unknown> = {};
let rules: Rule[] = [];
const ruleSets: Rule[][] = [];

const onChanged = chromeEvent();
const onInstalled = chromeEvent();
const onStartup = chromeEvent();

globalThis.chrome = {
  storage: {
    local: {
      get: async (key: string) => (key in store ? { [key]: store[key] } : {}),
      set: async (items: Record<string, unknown>) => {
        Object.assign(store, items);
        const changes = Object.fromEntries(
          Object.entries(items).map(([key, newValue]) => [key, { newValue }]),
        );
        onChanged.fire(changes, "local");
      },
    },
    onChanged,
  },
  declarativeNetRequest: {
    getDynamicRules: async () => [...rules],
    updateDynamicRules: async (options: { removeRuleIds?: number[]; addRules?: Rule[] }) => {
      const kept = rules.filter((rule) => !options.removeRuleIds?.includes(rule.id));
      for (const rule of options.addRules ?? []) {
        if (kept.some((existing) => existing.id === rule.id)) throw new Error("duplicate id");
        kept.push(rule);
      }
      rules = kept;
      ruleSets.push([...rules]);
    },
  },
  alarms: { clearAll: async () => true, create: () => {}, onAlarm: chromeEvent() },
  tabs: { query: async () => [], reload: async () => {}, update: async () => ({}) },
  permissions: { onAdded: chromeEvent() },
  runtime: {
    getURL: (path: string) => `chrome-extension://test/${path}`,
    onInstalled,
    onStartup,
  },
} as unknown as typeof chrome;

await import("./background.ts");

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function redirected(set: Rule[]): string[] {
  return set.flatMap((rule) => rule.condition.requestDomains ?? []).sort();
}

test("updating the rules never leaves a still-listed site unblocked, even for a moment", async () => {
  onInstalled.fire();
  await settle();
  expect(redirected(rules)).toEqual([...DEFAULT_BLOCKLIST].sort());

  ruleSets.length = 0;
  store.blocklist = ["reddit.com", ...DEFAULT_BLOCKLIST];
  onChanged.fire({ blocklist: { newValue: store.blocklist } }, "local");
  onStartup.fire();
  await settle();

  expect(ruleSets.length).toBeGreaterThan(0);
  for (const set of ruleSets) {
    for (const domain of DEFAULT_BLOCKLIST) expect(redirected(set)).toContain(domain);
  }
  expect(redirected(rules)).toEqual(["reddit.com", ...DEFAULT_BLOCKLIST].sort());
});
