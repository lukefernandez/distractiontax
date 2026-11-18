import { mkdirSync } from "node:fs";
import {
  answerPermissionPrompt,
  launch,
  readWindows,
  solveQuiz,
  stopServiceWorker,
  unpackStoreZip,
} from "./harness.mjs";

const EXT = unpackStoreZip("distractiontax");
console.log("loaded from", EXT);
const SHOTS = "/tmp/dt-proof/dtx";
mkdirSync(SHOTS, { recursive: true });
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

const { browser, ctx, extId, display, kill } = await launch(EXT, 9411);
console.log("extId:", extId);

async function shot(page, file) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS}/${file}` });
}

const DEFAULTS = ["youtube.com", "instagram.com", "news.ycombinator.com"];
const CHALLENGE = `chrome-extension://${extId}/challenge.html`;

async function storedBlocklist(page) {
  return page.evaluate(() => chrome.storage.local.get("blocklist").then((r) => r.blocklist));
}

async function listedSites(page) {
  return (await page.locator(".site-name").allTextContents()).map((t) => t.trim());
}

async function visit(page, url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(url, { waitUntil: "commit", timeout: 20000 });
      break;
    } catch {}
  }
  await page.waitForTimeout(800);
  return page.url();
}

async function addSite(page, text, permission) {
  await page.bringToFront();
  await page.fill(".site-input", text);
  await page.click(".site-add");
  if (permission === "allow" || permission === "deny") {
    await answerPermissionPrompt(display, permission === "allow");
  }
  await page.waitForTimeout(600);
  return (await page.locator(".site-status").textContent())?.trim();
}

try {
  const fresh = await ctx.newPage();
  await fresh.goto(`chrome-extension://${extId}/options.html`);
  await fresh.waitForSelector(".site-name");
  const seeded = await storedBlocklist(fresh);
  ok(
    "fresh install stores the default Blocklist",
    JSON.stringify(seeded) === JSON.stringify(DEFAULTS),
    `stored=${JSON.stringify(seeded)}`,
  );
  const shown = await listedSites(fresh);
  ok(
    "options page lists the defaults",
    JSON.stringify(shown) === JSON.stringify(DEFAULTS),
    `shown=${JSON.stringify(shown)}`,
  );
  await shot(fresh, "00-blocklist-defaults.png");
  await fresh.close();

  const chUrl = `chrome-extension://${extId}/challenge.html?surface=youtube.com&name=youtube.com&return=https://youtube.com/&label=youtube.com%20is%20blocked.`;
  let page = await ctx.newPage();
  await page.goto(chUrl);
  await page.waitForTimeout(1500);
  const quizVisible = await page.locator(".options button").count();
  const body0 = await page.locator("body").innerText();
  const ankiGatePath =
    body0.includes("Open Anki") ||
    body0.includes("Checking Anki") ||
    body0.includes("Review your cards");
  const promptShown = await page.locator(".prompt").count();
  ok(
    "anki off by default -> Challenge shown directly",
    quizVisible === 5 && promptShown > 0 && !ankiGatePath,
    `options=${quizVisible} prompt=${promptShown} ankiGatePath=${ankiGatePath}`,
  );
  await shot(page, "01-challenge.png");

  const passed = await solveQuiz(page);
  const passedAt = Date.now();
  ok("quiz reaches pass screen after correct answers", passed);
  await page.waitForTimeout(300);
  await shot(page, "02-passed.png");
  const windows = await readWindows(ctx, extId);
  const exp = windows["youtube.com"] ?? 0;
  const mins = (exp - passedAt) / 60000;
  ok(
    "pass grants ~5-minute window for the surface",
    mins > 4.75 && mins < 5.02,
    `window=${mins.toFixed(3)}min`,
  );
  await page.close();

  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options.html`);
  await opt.waitForTimeout(400);
  const stateOff = (await opt.locator(".switch-state").textContent())?.trim();
  const ariaOff = await opt.locator(".switch").getAttribute("aria-checked");
  ok(
    "options page: Anki mode Off by default",
    stateOff === "Off" && ariaOff === "false",
    `state=${stateOff} aria=${ariaOff}`,
  );
  await shot(opt, "03-anki-mode-off.png");

  await opt.locator(".switch").click();
  await opt.waitForTimeout(300);
  const stateOn = (await opt.locator(".switch-state").textContent())?.trim();
  const ariaOn = await opt.locator(".switch").getAttribute("aria-checked");
  ok(
    "toggle -> On, persisted to storage",
    stateOn === "On" && ariaOn === "true",
    `state=${stateOn} aria=${ariaOn}`,
  );
  const stored = await opt.evaluate(() =>
    chrome.storage.local.get("ankiMode").then((r) => r.ankiMode),
  );
  ok("ankiMode stored as true", stored === true, `stored=${stored}`);
  await shot(opt, "04-anki-mode-on.png");
  await opt.close();

  const page2 = await ctx.newPage();
  await page2.goto(chUrl);
  await page2.waitForTimeout(2500);
  const body2 = await page2.locator("body").innerText();
  const asksAnki = body2.includes("Open Anki") || body2.includes("Anki");
  const escapeHatch = await page2.locator("button:has-text('Answer Spanish words')").count();
  ok(
    "anki on -> Gate takes the Anki path (prompt + Challenge escape)",
    asksAnki && escapeHatch > 0,
    `asksAnki=${asksAnki} escape=${escapeHatch}`,
  );
  await shot(page2, "05-anki-prompt.png");
  await page2.close();

  const nav = await ctx.newPage();
  await nav.goto(`chrome-extension://${extId}/options.html`);
  await nav.evaluate(() => chrome.storage.local.set({ ankiMode: false }));
  let redirected = false,
    landedUrl = "";
  for (let attempt = 0; attempt < 3 && !redirected; attempt++) {
    try {
      await nav.goto("https://instagram.com/", { waitUntil: "commit", timeout: 20000 });
    } catch {}
    await nav.waitForTimeout(800);
    landedUrl = nav.url();
    redirected = landedUrl.startsWith(`chrome-extension://${extId}/challenge.html`);
  }
  ok("blocklisted site redirects to the Challenge", redirected, `landed=${landedUrl.slice(0, 70)}`);
  if (redirected) await shot(nav, "06-dnr-redirect.png");
  await nav.waitForTimeout(600);
  const named = (await nav.locator("body").innerText()).includes(
    "instagram.com will be unlocked for 5 minutes.",
  );
  ok("redirected Challenge names the blocked site", named);
  await nav.close();

  const setter = await ctx.newPage();
  await setter.goto(`chrome-extension://${extId}/options.html`);
  await setter.evaluate(() =>
    chrome.storage.local.get("windows").then((r) =>
      chrome.storage.local.set({
        windows: { ...r.windows, "news.ycombinator.com": Date.now() + 6000 },
      }),
    ),
  );
  await setter.waitForTimeout(800);
  const open = await ctx.newPage();
  try {
    await open.goto("https://news.ycombinator.com/", { waitUntil: "commit", timeout: 20000 });
  } catch {}
  await open.waitForTimeout(500);
  const openedInside = open.url().startsWith("https://news.ycombinator.com");
  ok("inside a live window the site opens normally", openedInside, open.url().slice(0, 60));
  await open
    .waitForURL((u) => u.href.startsWith(`chrome-extension://${extId}/challenge.html`), {
      timeout: 15000,
    })
    .catch(() => {});
  ok(
    "window lapses -> the open tab reloads into the Challenge",
    open.url().startsWith(`chrome-extension://${extId}/challenge.html`),
    open.url().slice(0, 70),
  );
  await open.close();
  await setter.close();

  await blocklistEditorChecks();
} finally {
  await kill();
}

async function blocklistEditorChecks() {
  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options.html`);
  await opt.waitForSelector(".site-name");

  for (const [input, expected] of [
    ["127.0.0.1:8765", "Local and IP addresses can't be gated"],
    ["localhost", "Local and IP addresses can't be gated"],
    ["reddit", "isn't a site"],
    ["YouTube.com", "youtube.com is already on the Blocklist."],
    ["m.youtube.com", "youtube.com already covers m.youtube.com."],
  ]) {
    const said = await addSite(opt, input, null);
    ok(`refuses "${input}" without asking Chrome`, said?.includes(expected), `status=${said}`);
  }
  ok(
    "refused input leaves the stored list alone",
    JSON.stringify(await storedBlocklist(opt)) === JSON.stringify(DEFAULTS),
  );

  const denied = await addSite(opt, "wikipedia.org", "deny");
  ok(
    "denying Chrome's prompt leaves the site off the list, and says so",
    !(await storedBlocklist(opt)).includes("wikipedia.org") &&
      denied?.includes("didn't allow access to wikipedia.org"),
    `status=${denied}`,
  );

  const already = await ctx.newPage();
  const before = await visit(already, "https://example.com/already-open");
  ok("example.com opens before it is listed", before.startsWith("https://example.com/"), before);

  const added = await addSite(opt, "  https://www.Example.COM/some/path ", "allow");
  const afterAdd = await storedBlocklist(opt);
  ok(
    "adding a pasted URL stores the normalized domain after Chrome allows it",
    afterAdd.at(-1) === "example.com" && added === "example.com is on the Blocklist.",
    `stored=${JSON.stringify(afterAdd)} status=${added}`,
  );
  ok("the editor lists the added site", (await listedSites(opt)).includes("example.com"));
  const granted = await opt.evaluate(() =>
    chrome.permissions.contains({ origins: ["*://*.example.com/*"] }),
  );
  ok("Chrome granted the added site's host", granted);
  await shot(opt, "07-blocklist-added.png");

  await already.waitForURL((u) => u.href.startsWith(CHALLENGE), { timeout: 10000 }).catch(() => {});
  ok(
    "an open tab on the added site reloads into the Challenge at once",
    already.url().startsWith(CHALLENGE),
    already.url().slice(0, 70),
  );
  await already.close();

  await opt.evaluate(() => chrome.permissions.remove({ origins: ["*://*.example.com/*"] }));
  await opt.waitForTimeout(600);
  const offered = opt.locator(".site", { hasText: "example.com" }).locator(".site-allow");
  ok("a site without host access offers Allow access", (await offered.count()) === 1);
  await opt.bringToFront();
  await offered.click();
  await opt.waitForTimeout(800);
  const restored = await opt.evaluate(() =>
    chrome.permissions.contains({ origins: ["*://*.example.com/*"] }),
  );
  ok(
    "Allow access restores the host and clears the warning",
    restored && (await opt.locator(".site-allow").count()) === 0,
  );

  const nav = await ctx.newPage();
  const landed = await visit(nav, "https://www.example.com/");
  ok("added site redirects to the Challenge", landed.startsWith(CHALLENGE), landed.slice(0, 70));
  await nav.waitForTimeout(600);
  ok(
    "the Challenge names the added site",
    (await nav.locator("body").innerText()).includes("example.com will be unlocked"),
  );
  await nav.close();

  const stopped = await stopServiceWorker(browser, extId);
  const cold = await ctx.newPage();
  const coldLanded = await visit(cold, "https://example.com/cold?q=1");
  await cold.waitForTimeout(600);
  const coldNamed = (await cold.locator("body").innerText()).includes(
    "example.com will be unlocked",
  );
  ok(
    "with the worker stopped, a visit still lands on a Challenge naming the site",
    stopped &&
      coldLanded === `${CHALLENGE}?surface=example.com#https://example.com/cold?q=1` &&
      coldNamed,
    `stopped=${stopped} landed=${coldLanded}`,
  );

  const row = opt.locator(".site", { hasText: "example.com" });
  await row.locator(".site-remove").click();
  await opt.waitForTimeout(600);
  ok(
    "removing a site drops it from storage and the editor",
    !(await storedBlocklist(opt)).includes("example.com") &&
      !(await listedSites(opt)).includes("example.com"),
  );
  await cold
    .waitForURL((u) => u.href.startsWith("https://example.com/"), { timeout: 10000 })
    .catch(() => {});
  ok(
    "an open Challenge for a removed site steps aside to the site",
    cold.url() === "https://example.com/cold?q=1",
    cold.url().slice(0, 70),
  );
  await cold.close();
  const revoked = await opt.evaluate(() =>
    chrome.permissions.contains({ origins: ["*://*.example.com/*"] }),
  );
  ok("removing an added site gives its host access back", !revoked);

  const freeNav = await ctx.newPage();
  const freeLanded = await visit(freeNav, "https://example.com/");
  ok("a removed site opens normally", freeLanded.startsWith("https://example.com/"), freeLanded);
  await freeNav.close();

  await addSite(opt, "old.example.net", "allow");
  const parent = await addSite(opt, "example.net", "allow");
  const parentAccess = await opt.evaluate(() =>
    chrome.permissions.contains({ origins: ["*://*.example.net/*"] }),
  );
  const afterParent = await storedBlocklist(opt);
  ok(
    "adding a parent replaces the subdomain entry and keeps access to the parent",
    afterParent.at(-1) === "example.net" &&
      !afterParent.includes("old.example.net") &&
      parentAccess &&
      parent === "example.net is on the Blocklist, in place of old.example.net.",
    `status=${parent} stored=${JSON.stringify(afterParent)}`,
  );
  await opt.locator(".site", { hasText: "example.net" }).locator(".site-remove").click();
  await opt.waitForTimeout(600);

  for (const domain of DEFAULTS) {
    await opt.locator(".site", { hasText: domain }).locator(".site-remove").click();
    await opt.waitForTimeout(300);
  }
  await opt.waitForTimeout(600);
  const rules = await opt.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
  const empty = (await opt.locator(".site-empty").textContent())?.trim();
  ok(
    "removing every site leaves an empty list and no redirect rules",
    JSON.stringify(await storedBlocklist(opt)) === "[]" &&
      rules.length === 0 &&
      empty === "Nothing is gated.",
    `rules=${rules.length} empty=${empty}`,
  );
  const insta = await ctx.newPage();
  const instaLanded = await visit(insta, "https://www.instagram.com/");
  ok(
    "with an empty list, a former default opens normally",
    instaLanded.startsWith("https://www.instagram.com/"),
    instaLanded.slice(0, 60),
  );
  await insta.close();

  const readded = await addSite(opt, "instagram.com", "none");
  const back = await ctx.newPage();
  const backLanded = await visit(back, "https://www.instagram.com/");
  ok(
    "re-adding a default needs no prompt and gates it again",
    readded === "instagram.com is on the Blocklist." && backLanded.startsWith(CHALLENGE),
    `status=${readded} landed=${backLanded.slice(0, 60)}`,
  );
  await back.close();
  await opt.close();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
