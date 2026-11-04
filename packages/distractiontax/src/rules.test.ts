import { describe, expect, test } from "bun:test";
import { DEFAULT_BLOCKLIST } from "./blocklist.ts";
import { deriveEnforcement, hostPermission, needsRegate, releaseUrl } from "./rules.ts";

const BLOCKLIST = DEFAULT_BLOCKLIST;
const NOW = 1_000_000;
const PAGE = "chrome-extension://abc/challenge.html";

describe("hostPermission", () => {
  test("covers the domain and its subdomains, nothing else", () => {
    expect(BLOCKLIST.map(hostPermission)).toEqual([
      "*://*.youtube.com/*",
      "*://*.instagram.com/*",
      "*://*.news.ycombinator.com/*",
    ]);
  });
});

describe("needsRegate", () => {
  test("a tab on a blocked domain with no window must be re-gated", () => {
    expect(needsRegate("https://www.youtube.com/watch?v=x", BLOCKLIST, {}, NOW)).toBe(true);
  });

  test("a live window keeps the tab alone", () => {
    const windows = { "youtube.com": NOW + 60_000 };
    expect(needsRegate("https://www.youtube.com/watch?v=x", BLOCKLIST, windows, NOW)).toBe(false);
  });

  test("re-gating kicks in at the expiry instant itself", () => {
    const windows = { "youtube.com": NOW };
    expect(needsRegate("https://youtube.com/", BLOCKLIST, windows, NOW)).toBe(true);
  });

  test("tabs elsewhere are never touched", () => {
    expect(needsRegate("https://x.com/home", BLOCKLIST, {}, NOW)).toBe(false);
    expect(needsRegate("https://notyoutube.com/", BLOCKLIST, {}, NOW)).toBe(false);
    expect(needsRegate("chrome-extension://abc/challenge.html", BLOCKLIST, {}, NOW)).toBe(false);
  });

  test("a trailing-dot host is the same site", () => {
    expect(needsRegate("https://www.youtube.com./watch", BLOCKLIST, {}, NOW)).toBe(true);
  });

  test("unparseable tab URLs are ignored", () => {
    expect(needsRegate("not a url", BLOCKLIST, {}, NOW)).toBe(false);
  });
});

describe("deriveEnforcement", () => {
  test("with no windows, every Blocklist domain gets a redirect rule and no alarms", () => {
    const { rules, alarms } = deriveEnforcement(BLOCKLIST, {}, NOW, PAGE);
    expect(rules.map((rule) => rule.condition.requestDomains?.[0])).toEqual([
      "youtube.com",
      "instagram.com",
      "news.ycombinator.com",
    ]);
    expect(rules.map((rule) => rule.id)).toEqual([1, 2, 3]);
    expect(alarms).toEqual([]);
  });

  test("a live window trades the rule for an expiry alarm", () => {
    const expiresAt = NOW + 60_000;
    const { rules, alarms } = deriveEnforcement(BLOCKLIST, { "youtube.com": expiresAt }, NOW, PAGE);
    expect(rules.map((rule) => rule.condition.requestDomains?.[0])).toEqual([
      "instagram.com",
      "news.ycombinator.com",
    ]);
    expect(alarms).toEqual([{ name: "expire:youtube.com", when: expiresAt }]);
  });

  test("every domain is enforced exactly one way — rule or alarm, never both or neither", () => {
    const { rules, alarms } = deriveEnforcement(
      BLOCKLIST,
      { "youtube.com": NOW + 1, "instagram.com": NOW - 1 },
      NOW,
      PAGE,
    );
    expect(rules.length + alarms.length).toBe(BLOCKLIST.length);
  });

  test("an expired window means blocked again, with no lingering alarm", () => {
    const { rules, alarms } = deriveEnforcement(BLOCKLIST, { "youtube.com": NOW - 1 }, NOW, PAGE);
    expect(rules).toHaveLength(3);
    expect(alarms).toEqual([]);
  });

  test("the window is closed at the expiry instant itself", () => {
    const { rules, alarms } = deriveEnforcement(BLOCKLIST, { "youtube.com": NOW }, NOW, PAGE);
    expect(rules).toHaveLength(3);
    expect(alarms).toEqual([]);
  });

  test("rule ids follow Blocklist order even when earlier domains are unblocked", () => {
    const { rules } = deriveEnforcement(BLOCKLIST, { "youtube.com": NOW + 60_000 }, NOW, PAGE);
    expect(rules.map((rule) => [rule.id, rule.condition.requestDomains?.[0]])).toEqual([
      [2, "instagram.com"],
      [3, "news.ycombinator.com"],
    ]);
  });

  test("windows for domains not on the Blocklist are ignored", () => {
    const { rules, alarms } = deriveEnforcement(
      BLOCKLIST,
      { "x-discovery": NOW + 60_000 },
      NOW,
      PAGE,
    );
    expect(rules).toHaveLength(3);
    expect(alarms).toEqual([]);
  });

  test("an empty Blocklist gates nothing", () => {
    expect(deriveEnforcement([], { "youtube.com": NOW + 60_000 }, NOW, PAGE)).toEqual({
      rules: [],
      alarms: [],
    });
  });

  test("an added domain gets a rule at the end of the list", () => {
    const { rules } = deriveEnforcement([...BLOCKLIST, "reddit.com"], {}, NOW, PAGE);
    expect(rules.map((rule) => [rule.id, rule.condition.requestDomains?.[0]])).toContainEqual([
      4,
      "reddit.com",
    ]);
  });

  test("all rules redirect the main frame to the Challenge, carrying the site and URL", () => {
    const { rules } = deriveEnforcement(BLOCKLIST, {}, NOW, PAGE);
    for (const rule of rules) {
      expect(rule.action.type).toBe("redirect" as chrome.declarativeNetRequest.RuleActionType);
      const domain = rule.condition.requestDomains?.[0];
      expect(rule.action.redirect?.regexSubstitution).toBe(`${PAGE}?surface=${domain}#\\0`);
      expect(rule.condition.regexFilter).toBe("^.*$");
      expect(rule.condition.resourceTypes).toEqual([
        "main_frame" as chrome.declarativeNetRequest.ResourceType,
      ]);
    }
  });
});

describe("releaseUrl", () => {
  const blocked = `${PAGE}?surface=reddit.com#https://old.reddit.com/r/all?x=1`;

  test("a Challenge whose site left the list goes where the visit was headed", () => {
    expect(releaseUrl(blocked, PAGE, BLOCKLIST)).toBe("https://old.reddit.com/r/all?x=1");
  });

  test("a Challenge whose site is still listed stays", () => {
    expect(releaseUrl(blocked, PAGE, [...BLOCKLIST, "reddit.com"])).toBeNull();
  });

  test("a replaced subdomain's Challenge goes on, and the parent's rule takes it from there", () => {
    const sub = `${PAGE}?surface=news.ycombinator.com#https://news.ycombinator.com/`;
    expect(releaseUrl(sub, PAGE, ["ycombinator.com"])).toBe("https://news.ycombinator.com/");
  });

  test("other tabs, and a Challenge with no site, are left alone", () => {
    expect(releaseUrl("https://reddit.com/", PAGE, [])).toBeNull();
    expect(
      releaseUrl("chrome-extension://other/challenge.html?surface=reddit.com", PAGE, []),
    ).toBeNull();
    expect(releaseUrl(`${PAGE}#https://reddit.com/`, PAGE, [])).toBeNull();
    expect(releaseUrl(`${PAGE}?x=1`, PAGE, [])).toBeNull();
  });
});
