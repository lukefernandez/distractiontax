import { build } from "bun";
import { rmSync } from "node:fs";

const outdir = "./dist";

rmSync(outdir, { recursive: true, force: true });

const result = await build({
  entrypoints: [
    "src/content.ts",
    "../core/src/challenge/challenge.ts",
    "../core/src/challenge/options.ts",
  ],
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
  "src/manifest.json",
  "../core/src/challenge/challenge.html",
  "../core/src/challenge/challenge.css",
  "../core/src/challenge/options.html",
];

for (const file of staticFiles) {
  const filename = file.split("/").pop()!;
  await Bun.write(`${outdir}/${filename}`, Bun.file(file));
}

for (const size of [16, 32, 48, 128]) {
  await Bun.write(`${outdir}/icons/icon-${size}.png`, Bun.file(`src/icons/icon-${size}.png`));
}

console.log("distractiontax-x: build complete");
