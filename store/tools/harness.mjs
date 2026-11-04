import pw from "playwright";
import { execFileSync, spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const { chromium } = pw;

export const REPO = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");

const WORDLIST = JSON.parse(readFileSync(`${REPO}/packages/core/src/wordlist.json`, "utf8"));
export const GLOSS = new Map(WORDLIST.map((e) => [e.prompt, e.gloss]));

export function unpackStoreZip(ext) {
  const { version } = JSON.parse(readFileSync(`${REPO}/packages/${ext}/src/manifest.json`, "utf8"));
  const zip = `${REPO}/store/${ext}/${ext}-v${version}.zip`;
  const dir = mkdtempSync(join(tmpdir(), `${ext}-zip-`));
  execFileSync("python3", ["-m", "zipfile", "-e", zip, dir]);
  return dir;
}

const CHROME = chromium.executablePath();

export async function launch(extPath, port) {
  const udd = mkdtempSync(join(tmpdir(), "dt-"));
  const display = `:${(port % 90) + 100}`;
  const xvfb = spawn("Xvfb", [display, "-screen", "0", "1340x900x24", "-nolisten", "tcp"], {
    stdio: "ignore",
  });
  await new Promise((r) => setTimeout(r, 800));
  const chrome = spawn(
    CHROME,
    [
      `--user-data-dir=${udd}`,
      `--remote-debugging-port=${port}`,
      `--load-extension=${extPath}`,
      `--disable-extensions-except=${extPath}`,
      "--disable-features=DisableLoadExtensionCommandLineSwitch,DialMediaRouteProvider",
      "--no-sandbox",
      "--no-first-run",
      "--no-default-browser-check",
      "--window-size=1340,900",
      "about:blank",
    ],
    { stdio: "ignore", env: { ...process.env, DISPLAY: display } },
  );
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`http://localhost:${port}/json/version`)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  const browser = await chromium.connectOverCDP(`http://localhost:${port}`);
  const ctx = browser.contexts()[0];

  const probe = await ctx.newPage();
  let extId = null;
  for (let i = 0; i < 20 && !extId; i++) {
    await probe.goto("chrome://extensions/");
    const info = await probe.evaluate(
      () => new Promise((res) => chrome.developerPrivate.getExtensionsInfo({}, res)),
    );
    const mine = info.find((e) => e.location === "UNPACKED");
    if (mine) extId = mine.id;
    else await new Promise((r) => setTimeout(r, 500));
  }
  await probe.close();
  if (!extId) throw new Error(`extension not loaded from ${extPath}`);

  const kill = async () => {
    await browser.close().catch(() => {});
    chrome.kill("SIGKILL");
    xvfb.kill("SIGKILL");
  };
  return { browser, ctx, extId, display, kill };
}

export async function answerPermissionPrompt(display, allow) {
  await new Promise((r) => setTimeout(r, 1200));
  const keys = allow ? ["Tab", "Return"] : ["Escape"];
  for (const key of keys) {
    execFileSync("xdotool", ["key", key], { env: { ...process.env, DISPLAY: display } });
    await new Promise((r) => setTimeout(r, 300));
  }
}

export async function stopServiceWorker(browser, extId) {
  const cdp = await browser.newBrowserCDPSession();
  const { targetInfos } = await cdp.send("Target.getTargets");
  for (const t of targetInfos) {
    if (t.type === "service_worker" && t.url.startsWith(`chrome-extension://${extId}/`)) {
      await cdp.send("Target.closeTarget", { targetId: t.targetId });
    }
  }
  await new Promise((r) => setTimeout(r, 1000));
  const left = (await cdp.send("Target.getTargets")).targetInfos.filter(
    (t) => t.type === "service_worker" && t.url.startsWith(`chrome-extension://${extId}/`),
  );
  await cdp.detach();
  return left.length === 0;
}

export async function solveQuiz(page, maxPicks = 40) {
  for (let i = 0; i < maxPicks; i++) {
    if (await page.locator(".passed-title").count()) return true;
    const prompt = (await page.locator(".prompt").first().textContent())?.trim();
    const gloss = GLOSS.get(prompt);
    const options = page.locator(".options button");
    const n = await options.count();
    if (!n) {
      await page.waitForTimeout(150);
      continue;
    }
    let picked = false;
    for (let j = 0; j < n; j++) {
      const raw = (await options.nth(j).textContent()) ?? "";
      const text = raw.replace(/^\s*\d+\s*/, "").trim();
      if (text === gloss) {
        await options.nth(j).click();
        picked = true;
        break;
      }
    }
    if (!picked) await options.nth(0).click();
    await page.waitForTimeout(650);
  }
  return (await page.locator(".passed-title").count()) > 0;
}

export async function readWindows(ctx, extId) {
  const p = await ctx.newPage();
  await p.goto(`chrome-extension://${extId}/options.html`);
  const windows = await p.evaluate(() =>
    chrome.storage.local.get("windows").then((r) => r.windows ?? {}),
  );
  await p.close();
  return windows;
}
