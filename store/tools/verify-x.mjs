import { mkdirSync } from "node:fs";
import { launch, solveQuiz, readWindows, unpackStoreZip } from "./harness.mjs";

const EXT = unpackStoreZip("distractiontax-x");
console.log("loaded from", EXT);
const PROOF = "/tmp/dt-proof/x";
mkdirSync(PROOF, { recursive: true });
const results = [];
const ok = (name, cond, detail = "") => {
  results.push({ name, pass: !!cond, detail });
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

function fakeX(selected) {
  return `<!doctype html><html><body>
  <div data-testid="primaryColumn">
    <div role="tablist">
      <div><a href="#" role="tab" aria-selected="${selected === "forYou"}">For you</a></div>
      <div><a href="#" role="tab" aria-selected="${selected === "following"}">Following</a></div>
    </div>
    <a id="explore" href="/explore">Explore</a>
  </div>
  <div data-testid="sidebarColumn" id="sidebar">sidebar</div>
  <script>
    for (const tab of document.querySelectorAll('[role=tab]')) {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        for (const t of document.querySelectorAll('[role=tab]')) t.setAttribute('aria-selected', String(t === tab));
      });
    }
  </script></body></html>`;
}

const { ctx, extId, kill } = await launch(EXT, 9451);
console.log("extId:", extId);
let homeSelected = "following";
await ctx.route("https://x.com/**", (route) => {
  const url = new URL(route.request().url());
  const selected = url.pathname === "/home" ? homeSelected : "following";
  route.fulfill({ status: 200, contentType: "text/html", body: fakeX(selected) });
});

const onChallenge = (page) => page.url().startsWith(`chrome-extension://${extId}/challenge.html`);

try {
  let page = await ctx.newPage();
  await page.goto("https://x.com/home?following=true");
  await page.waitForTimeout(800);
  const sidebarHidden = await page
    .locator("#sidebar")
    .evaluate((el) => getComputedStyle(el).display === "none");
  ok("content script injected: sidebar hidden", sidebarHidden);

  homeSelected = "forYou";
  const passive = await ctx.newPage();
  await passive.goto("https://x.com/home");
  await passive.waitForTimeout(1200);
  const selectedNow = await passive.locator("[role=tab][aria-selected=true]").textContent();
  ok(
    "passive For You arrival -> switched to Following, no Challenge",
    selectedNow === "Following" && !onChallenge(passive),
    `selected=${selectedNow} url=${passive.url()}`,
  );
  await passive.close();
  homeSelected = "following";

  const explore = await ctx.newPage();
  await explore.goto("https://x.com/explore");
  await explore
    .waitForURL((u) => u.href.startsWith("chrome-extension://"), { timeout: 8000 })
    .catch(() => {});
  ok(
    "navigate to Explore while locked -> Challenge",
    onChallenge(explore),
    explore.url().slice(0, 90),
  );
  await explore.close();

  await page.locator("[role=tab]", { hasText: "For you" }).click();
  await page
    .waitForURL((u) => u.href.startsWith("chrome-extension://"), { timeout: 8000 })
    .catch(() => {});
  ok("click For You while locked -> Challenge", onChallenge(page), page.url().slice(0, 90));

  await page.waitForTimeout(1000);
  const options = await page.locator(".options button").count();
  const body = await page.locator("body").innerText();
  const ankiPath = body.includes("Open Anki") || body.includes("Checking Anki");
  ok(
    "anki off by default -> Challenge shown directly",
    options === 5 && !ankiPath,
    `options=${options} ankiPath=${ankiPath}`,
  );
  ok(
    "Challenge names the whole surface",
    body.includes("For You & Explore will be unlocked for 5 minutes."),
  );
  await page.screenshot({ path: `${PROOF}/challenge.png` });

  const passed = await solveQuiz(page);
  const passedAt = Date.now();
  ok("10 correct answers reach the pass screen", passed);
  await page.waitForURL("https://x.com/home", { timeout: 8000 }).catch(() => {});
  ok("pass returns to x.com/home", page.url() === "https://x.com/home", page.url());
  const windows = await readWindows(ctx, extId);
  const mins = ((windows["x-discovery"] ?? 0) - passedAt) / 60000;
  ok(
    "pass grants ~5-minute window for x-discovery",
    mins > 4.75 && mins < 5.02,
    `window=${mins.toFixed(3)}min`,
  );

  await page.waitForTimeout(800);
  await page.locator("[role=tab]", { hasText: "For you" }).click();
  await page.waitForTimeout(1200);
  const forYouSel = await page.locator("[role=tab][aria-selected=true]").textContent();
  ok(
    "inside the window, For You opens without a Challenge",
    !onChallenge(page) && forYouSel === "For you",
    `selected=${forYouSel}`,
  );
  await page.close();

  const opt = await ctx.newPage();
  await opt.goto(`chrome-extension://${extId}/options.html`);
  await opt.waitForTimeout(400);
  const off = (await opt.locator(".switch-state").textContent())?.trim();
  ok("options page: Anki mode Off by default", off === "Off", `state=${off}`);
  await opt.locator(".switch").click();
  await opt.waitForTimeout(300);
  const on = (await opt.locator(".switch-state").textContent())?.trim();
  const stored = await opt.evaluate(() =>
    chrome.storage.local.get("ankiMode").then((r) => r.ankiMode),
  );
  ok("toggle -> On, stored true", on === "On" && stored === true, `state=${on} stored=${stored}`);
  await opt.close();

  const gate = await ctx.newPage();
  await gate.goto(
    `chrome-extension://${extId}/challenge.html?surface=x-discovery&name=For%20You%20%26%20Explore&return=https://x.com/home&label=x`,
  );
  await gate.waitForTimeout(2500);
  const gateBody = await gate.locator("body").innerText();
  const escape = await gate.locator("button:has-text('Answer Spanish words')").count();
  ok(
    "anki on -> Gate takes the Anki path (open-Anki prompt + Challenge escape)",
    gateBody.includes("Open Anki") && escape === 1,
    `escape=${escape}`,
  );
  await gate.screenshot({ path: `${PROOF}/anki-prompt.png` });
  await gate.close();
} finally {
  await kill();
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
