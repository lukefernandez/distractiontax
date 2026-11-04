import { beforeEach, describe, expect, test } from "bun:test";
import { ANKI_MODE_KEY, getAnkiMode, setAnkiMode } from "./anki-mode.ts";

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

beforeEach(() => {
  store = {};
});

describe("stored Anki mode", () => {
  test("nothing stored reads back as off", async () => {
    expect(await getAnkiMode()).toBe(false);
  });

  test("turning it on sticks across a fresh read", async () => {
    await setAnkiMode(true);
    expect(store[ANKI_MODE_KEY]).toBe(true);
    expect(await getAnkiMode()).toBe(true);
  });

  test("turning it back off sticks across a fresh read", async () => {
    await setAnkiMode(true);
    await setAnkiMode(false);
    expect(await getAnkiMode()).toBe(false);
  });

  test("a stored value that isn't true still reads as off", async () => {
    for (const value of [null, "true", 1]) {
      store[ANKI_MODE_KEY] = value;
      expect(await getAnkiMode()).toBe(false);
    }
  });
});
