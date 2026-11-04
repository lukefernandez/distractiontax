import { build } from "bun";
import { rmSync } from "node:fs";
import { DEFAULT_BLOCKLIST } from "./src/blocklist.ts";
import { hostPermission } from "./src/rules.ts";

const outdir = "./dist";

rmSync(outdir, { recursive: true, force: true });

const result = await build({
  entrypoints: ["src/background.ts", "../core/src/challenge/challenge.ts", "src/options.ts"],
  outdir,
  target: "browser",
  format: "iife",
  minify: true,
  naming: "[name].[ext]",
});

if (!result.success) {
  console.error("Build failed:");
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

const staticFiles = [
  "../core/src/challenge/challenge.html",
  "../core/src/challenge/challenge.css",
  "src/options.html",
];

for (const file of staticFiles) {
  const filename = file.split("/").pop()!;
  await Bun.write(`${outdir}/${filename}`, Bun.file(file));
}

const manifest = await Bun.file("src/manifest.json").json();
manifest.host_permissions = [
  ...DEFAULT_BLOCKLIST.map(hostPermission),
  ...manifest.host_permissions,
];
await Bun.write(`${outdir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);

for (const size of [16, 32, 48, 128]) {
  await Bun.write(`${outdir}/icons/icon-${size}.png`, Bun.file(`src/icons/icon-${size}.png`));
}

console.log("distractiontax: build complete");
