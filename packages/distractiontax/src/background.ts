import { getWindows, WINDOWS_KEY } from "../../core/src/windows.ts";
import type { Windows } from "../../core/src/windows.ts";
import { BLOCKLIST_KEY, getBlocklist, seedBlocklist } from "./blocklist.ts";
import type { Domain } from "./blocklist.ts";
import { deriveEnforcement, needsRegate, releaseUrl } from "./rules.ts";

async function reconcileOpenTabs(
  blocklist: Domain[],
  windows: Windows,
  now: number,
  challengePage: string,
): Promise<void> {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) continue;
    if (needsRegate(tab.url, blocklist, windows, now)) {
      void chrome.tabs.reload(tab.id);
      continue;
    }
    const released = releaseUrl(tab.url, challengePage, blocklist);
    if (released) void chrome.tabs.update(tab.id, { url: released });
  }
}

async function syncRules(): Promise<void> {
  const [blocklist, windows] = await Promise.all([getBlocklist(), getWindows()]);
  const now = Date.now();
  const challengePage = chrome.runtime.getURL("challenge.html");
  const { rules, alarms } = deriveEnforcement(blocklist, windows, now, challengePage);

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: rules,
  });

  await chrome.alarms.clearAll();
  for (const alarm of alarms) {
    chrome.alarms.create(alarm.name, { when: alarm.when });
  }

  await reconcileOpenTabs(blocklist, windows, now, challengePage);
}

let syncing = Promise.resolve();
function scheduleSync(): void {
  syncing = syncing.then(syncRules, syncRules);
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes[BLOCKLIST_KEY] || changes[WINDOWS_KEY])) scheduleSync();
});
chrome.permissions.onAdded.addListener(scheduleSync);
chrome.alarms.onAlarm.addListener(scheduleSync);
chrome.runtime.onInstalled.addListener(() => {
  void seedBlocklist().then(scheduleSync);
});
chrome.runtime.onStartup.addListener(scheduleSync);
