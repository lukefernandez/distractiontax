import pw from "playwright";
import { readFileSync } from "node:fs";
const { chromium } = pw;
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");

const STORE = `${REPO}/store`;
const FONT = "'Inter Variable','Inter',system-ui,-apple-system,'Segoe UI',sans-serif";

const listings = [
  {
    ext: "distractiontax",
    ground: "#00b140",
    ink: "#ffffff",
    sub: "rgba(255,255,255,0.86)",
    mark: "#ffffff",
    check: "#00b140",
    name: "DistractionTax",
    line: "Pay for distractions in Spanish words.",
    marquee: "Blocked sites cost ten Spanish words. Pass, and you get five minutes.",
  },
  {
    ext: "distractiontax-x",
    ground: "#0f1419",
    ink: "#ffffff",
    sub: "rgba(255,255,255,0.78)",
    mark: "#ffffff",
    check: "#0f1419",
    name: "DistractionTax for X",
    line: "For You and Explore cost ten Spanish words.",
    marquee: "No sidebar, no Grok, no chat. For You and Explore cost ten Spanish words.",
  },
];

const markSvg = (size, l) => `<svg width="${size}" height="${size}" viewBox="0 0 16 16">
  <rect width="16" height="16" rx="3.6" fill="${l.mark}"/>
  <path d="m3.6 8.4 2.9 2.8L12.6 4.7" fill="none" stroke="${l.check}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function small(l) {
  return `<div style="width:440px;height:280px;background:${l.ground};display:flex;flex-direction:column;
    justify-content:center;padding:0 40px;box-sizing:border-box;font-family:${FONT};color:${l.ink}">
    ${markSvg(56, l)}
    <div style="font-size:${l.name.length > 16 ? 30 : 36}px;font-weight:700;letter-spacing:-0.02em;margin-top:22px">${l.name}</div>
    <div style="font-size:18px;color:${l.sub};margin-top:8px;line-height:1.35">${l.line}</div></div>`;
}

function marquee(l, cardUri) {
  return `<div style="width:1400px;height:560px;background:${l.ground};display:flex;align-items:center;
    box-sizing:border-box;padding:0 80px;gap:70px;font-family:${FONT};color:${l.ink};overflow:hidden">
    <div style="flex:1">
      ${markSvg(72, l)}
      <div style="font-size:56px;font-weight:700;letter-spacing:-0.025em;margin-top:28px;line-height:1.05">${l.name}</div>
      <div style="font-size:26px;color:${l.sub};margin-top:18px;line-height:1.35;max-width:560px">${l.marquee}</div>
    </div>
    <img src="${cardUri}" style="height:470px;border-radius:24px;box-shadow:0 24px 60px rgba(0,0,0,0.28)"/></div>`;
}

const browser = await chromium.launch();
for (const l of listings) {
  const shotPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const shot = readFileSync(
    `${STORE}/${l.ext}/assets/screenshots/1-challenge-correct.png`,
  ).toString("base64");
  await shotPage.setContent(`<style>*{margin:0}</style><img src="data:image/png;base64,${shot}">`);
  const card = await shotPage.screenshot({ clip: { x: 385, y: 115, width: 510, height: 655 } });
  await shotPage.close();
  const cardUri = `data:image/png;base64,${card.toString("base64")}`;

  for (const [file, w, h, html] of [
    ["promo-small-440x280.png", 440, 280, small(l)],
    ["promo-marquee-1400x560.png", 1400, 560, marquee(l, cardUri)],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<!doctype html><meta charset=utf-8><style>*{margin:0}</style>${html}`);
    await page.waitForTimeout(200);
    await page.screenshot({ path: `${STORE}/${l.ext}/assets/${file}` });
    await page.close();
  }
  console.log(`${l.ext}: promo tiles written`);
}
await browser.close();
