import { readFileSync } from "node:fs";

const { advanceAfterHitMs } = JSON.parse(
  readFileSync(new URL("../../packages/core/src/challenge/timing.json", import.meta.url), "utf8"),
);

export const PICK_WAIT_MS = advanceAfterHitMs + 170;
