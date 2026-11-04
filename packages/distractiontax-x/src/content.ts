import { decide } from "./gate-policy.ts";
import type { RenderedTab, Trigger } from "./gate-policy.ts";
import { getWindows, WINDOWS_KEY } from "../../core/src/windows.ts";

const DISCOVERY = "x-discovery";
const EXPIRY_SLACK_MS = 250;

let windowExpiresAt = 0;
let expiryTimer: number | undefined;

function injectCleanupCss(): void {
  const style = document.createElement("style");
  style.textContent = `
    div[data-testid="sidebarColumn"] { display: none !important; }
    div[data-testid="GrokDrawer"] { display: none !important; }
    div[data-testid="chat-drawer-root"] { display: none !important; }
  `;
  (document.head || document.documentElement).appendChild(style);
}

function homeTabs(): HTMLElement[] {
  const tablist = document.querySelector('div[data-testid="primaryColumn"] div[role="tablist"]');
  if (!tablist) return [];
  return [...tablist.querySelectorAll<HTMLElement>('[role="tab"]')];
}

function renderedTab(): RenderedTab {
  const selected = homeTabs().findIndex((tab) => tab.getAttribute("aria-selected") === "true");
  if (selected === -1) return null;
  if (selected === 0) return "forYou";
  if (selected === 1) return "following";
  return "other";
}

function enforce(trigger: Trigger, event?: Event): void {
  const action = decide({
    trigger,
    pathname: location.pathname,
    search: location.search,
    renderedTab: renderedTab(),
    windowExpiresAt,
    now: Date.now(),
  });
  if (action === "none") return;

  if (action === "switchToFollowing") {
    const following = location.pathname === "/home" ? homeTabs()[1] : undefined;
    if (following) following.click();
    else location.replace("/home?following=true");
    return;
  }

  event?.preventDefault();
  event?.stopPropagation();
  const url = new URL(chrome.runtime.getURL("challenge.html"));
  url.searchParams.set("surface", DISCOVERY);
  url.searchParams.set("name", action.challenge.name);
  url.searchParams.set("return", action.challenge.returnUrl);
  url.searchParams.set("label", action.challenge.label);
  if (event) location.href = url.toString();
  else location.replace(url.toString());
}

async function refreshWindow(trigger: Trigger): Promise<void> {
  const windows = await getWindows();
  windowExpiresAt = windows[DISCOVERY] ?? 0;
  scheduleExpiry();
  enforce(trigger);
}

function scheduleExpiry(): void {
  if (expiryTimer !== undefined) clearTimeout(expiryTimer);
  expiryTimer = undefined;
  const remaining = windowExpiresAt - Date.now();
  if (remaining <= 0) return;
  expiryTimer = window.setTimeout(() => enforce("expiryTimer"), remaining + EXPIRY_SLACK_MS);
}

function interceptDeliberateClicks(): void {
  document.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('a[href^="/explore"]')) {
        enforce("exploreNavClick", event);
        return;
      }
      if (location.pathname !== "/home") return;
      const tab = event.target.closest(
        'div[data-testid="primaryColumn"] div[role="tablist"] > div:first-child',
      );
      if (tab && !tab.closest("article")) enforce("forYouTabClick", event);
    },
    true,
  );
}

let lastPathname = location.pathname;

function observeRenderedTab(): void {
  const observer = new MutationObserver(() => {
    if (location.pathname !== lastPathname) {
      lastPathname = location.pathname;
      enforce("spaNavigation");
    } else {
      enforce("domChange");
    }
  });
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["aria-selected"],
  });
}

injectCleanupCss();
interceptDeliberateClicks();
observeRenderedTab();
void refreshWindow("pageLoad");

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[WINDOWS_KEY]) void refreshWindow("windowChange");
});

window.addEventListener("popstate", () => {
  lastPathname = location.pathname;
  enforce("spaNavigation");
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) enforce("visibilityReturn");
});
