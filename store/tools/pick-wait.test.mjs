import { expect, test } from "bun:test";
import { advanceAfterHitMs } from "../../packages/core/src/challenge/timing.json";
import { PICK_WAIT_MS } from "./pick-wait.mjs";

test("the harness waits until the Challenge has moved to the next word after a correct pick", () => {
  expect(PICK_WAIT_MS).toBeGreaterThan(advanceAfterHitMs);
});
