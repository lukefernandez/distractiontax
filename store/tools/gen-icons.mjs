import pw from "playwright";
import { mkdirSync } from "node:fs";
const { chromium } = pw;
import { fileURLToPath } from "node:url";
const REPO = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");

function svg(size, tile) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 16 16">
    <rect x="0" y="0" width="16" height="16" rx="3.6" fill="${tile}"/>
    <path d="m3.6 8.4 2.9 2.8L12.6 4.7" fill="none" stroke="#ffffff" stroke-width="1.9"
      stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

const targets = [
  { dir: `${REPO}/packages/distractiontax/src/icons`, tile: "#00b140" },
  { dir: `${REPO}/packages/distractiontax-x/src/icons`, tile: "#0f1419" },
];
const sizes = [16, 32, 48, 128];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (const { dir, tile } of targets) {
  mkdirSync(dir, { recursive: true });
  for (const size of sizes) {
    const markup = svg(size, tile);
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<!doctype html><meta charset=utf-8><style>*{margin:0;padding:0}</style>${markup}`,
    );
    await page.locator("svg").screenshot({ path: `${dir}/icon-${size}.png`, omitBackground: true });
  }
  console.log(`icons written to ${dir}`);
}
await browser.close();
