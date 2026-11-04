import { writeFileSync } from "node:fs";
import { answerPermissionPrompt, launch, GLOSS, REPO, unpackStoreZip } from "./harness.mjs";
const ROOT = `${REPO}/store`;

async function prep(page) {
  await page.setViewportSize({ width: 1152, height: 720 });
  await page.waitForTimeout(300);
}

async function shoot(page, path) {
  const cdp = await page.context().newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    clip: { x: 0, y: 0, width: 1152, height: 720, scale: 10 / 9 },
  });
  writeFileSync(path, Buffer.from(data, "base64"));
}

async function correctIndex(page) {
  const gloss = GLOSS.get((await page.locator(".prompt").first().textContent()).trim());
  const texts = await page.locator(".options button").allTextContents();
  return texts.findIndex((t) => t.replace(/^\s*\d+\s*/, "").trim() === gloss);
}

async function answer(page, n) {
  for (let i = 0; i < n; i++) {
    await page
      .locator(".options button")
      .nth(await correctIndex(page))
      .click();
    await page.waitForTimeout(700);
  }
}

async function shootAnkiMode(opt, out) {
  await shoot(opt, `${out}/4-anki-mode.png`);
}

async function shootBlocklist(opt, out, display) {
  await opt.fill(".site-input", "twitch.tv");
  await opt.click(".site-add");
  await answerPermissionPrompt(display, true);
  await opt.waitForSelector(".site-name:text('twitch.tv')");
  await opt.locator(".site-input").blur();
  await opt.mouse.move(0, 0);
  await opt.addStyleTag({ content: "html { scrollbar-width: none; }" });
  await opt.waitForTimeout(300);
  await shoot(opt, `${out}/4-blocklist.png`);
}

async function capture({ ext, port, open, reopen = open, options = shootAnkiMode }) {
  const { ctx, extId, display, kill } = await launch(unpackStoreZip(ext), port);
  const out = `${ROOT}/${ext}/assets/screenshots`;
  try {
    const page = await ctx.newPage();
    await open(page, extId);
    await page.waitForSelector(".options button");
    await prep(page);

    await answer(page, 6);
    await page
      .locator(".options button")
      .nth(await correctIndex(page))
      .click();
    await page.waitForTimeout(120);
    await shoot(page, `${out}/1-challenge-correct.png`);
    await page.waitForTimeout(700);

    const right = await correctIndex(page);
    await page
      .locator(".options button")
      .nth((right + 1) % 5)
      .click();
    await page.waitForTimeout(250);
    await shoot(page, `${out}/2-challenge-miss.png`);
    await page.waitForTimeout(900);

    await answer(page, 2);
    await page
      .locator(".options button")
      .nth(await correctIndex(page))
      .click();
    await page.waitForSelector(".passed-title", { timeout: 3000 });
    await page.waitForTimeout(150);
    await shoot(page, `${out}/3-pass.png`);
    await page.close();

    const opt = await ctx.newPage();
    await opt.goto(`chrome-extension://${extId}/options.html`);
    await opt.waitForSelector(".switch");
    await prep(opt);
    await options(opt, out, display);

    await opt.locator(".switch").click();
    await opt.close();
    const gate = await ctx.newPage();
    await reopen(gate, extId);
    await gate.waitForSelector("text=Open Anki to review your cards.", { timeout: 10000 });
    await prep(gate);
    await shoot(gate, `${out}/5-anki-gate.png`);
    console.log(`${ext}: screenshots written to ${out}`);
  } finally {
    await kill();
  }
}

await capture({
  ext: "distractiontax",
  port: 9471,
  options: shootBlocklist,
  open: async (page, extId) => {
    for (let i = 0; i < 3 && !page.url().startsWith("chrome-extension://"); i++) {
      try {
        await page.goto("https://youtube.com/", { waitUntil: "commit", timeout: 20000 });
      } catch {}
      await page.waitForTimeout(800);
    }
    if (!page.url().startsWith(`chrome-extension://${extId}/challenge.html`))
      throw new Error("no redirect");
  },
  reopen: (page, extId) =>
    page.goto(
      `chrome-extension://${extId}/challenge.html?surface=youtube.com#https://youtube.com/`,
    ),
});

await capture({
  ext: "distractiontax-x",
  port: 9481,
  open: (page, extId) =>
    page.goto(
      `chrome-extension://${extId}/challenge.html?surface=x-discovery&name=${encodeURIComponent("For You & Explore")}` +
        `&return=${encodeURIComponent("https://x.com/home")}&label=${encodeURIComponent("For You is locked.")}`,
    ),
});
