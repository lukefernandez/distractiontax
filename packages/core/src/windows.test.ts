import { beforeEach, describe, expect, test } from "bun:test";
import { getWindows, grantWindow, WINDOW_MINUTES } from "./windows.ts";

let store: Record<string, unknown> = {};

globalThis.chrome = {
  storage: {
    local: {
      get: (key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {}),
      set: (items: Record<string, unknown>) => {
        Object.assign(store, items);
        return Promise.resolve();
      },
    },
  },
} as unknown as typeof chrome;

const NOW = 1_000_000;
const WINDOW_MS = WINDOW_MINUTES * 60_000;

beforeEach(() => {
  store = {};
});

describe("Access Windows", () => {
  test("granting stores a five-minute window", async () => {
    const expiresAt = await grantWindow("x-discovery", NOW);
    expect(expiresAt).toBe(NOW + WINDOW_MS);
    expect(await getWindows()).toEqual({ "x-discovery": NOW + WINDOW_MS });
  });

  test("granting again during a live window resets to a fresh five minutes", async () => {
    await grantWindow("x-discovery", NOW);
    const expiresAt = await grantWindow("x-discovery", NOW + 60_000);
    expect(expiresAt).toBe(NOW + 60_000 + WINDOW_MS);
    expect((await getWindows())["x-discovery"]).toBe(expiresAt);
  });

  test("granting one surface leaves another's expiry untouched", async () => {
    const first = await grantWindow("youtube.com", NOW);
    const second = await grantWindow("x-discovery", NOW + 1_000);
    expect(await getWindows()).toEqual({ "youtube.com": first, "x-discovery": second });
  });
});
