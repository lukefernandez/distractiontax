import { describe, expect, test } from "bun:test";
import { drawChallenge } from "./quiz.ts";
import type { WordItem } from "./quiz.ts";
import wordlistJson from "./wordlist.json";

const wordlist = wordlistJson as WordItem[];

const CONTENT_POS = new Set(["n", "v", "adj", "adv"]);
const PROMPT_RE = /^[a-záéíóúñü]+$/;

describe("the committed Wordlist", () => {
  test("is large enough to matter", () => {
    expect(wordlist.length).toBeGreaterThanOrEqual(1000);
  });

  test("every entry is a well-formed WordItem", () => {
    for (const item of wordlist) {
      expect(PROMPT_RE.test(item.prompt)).toBe(true);
      expect(item.gloss.length).toBeGreaterThanOrEqual(2);
      expect(item.gloss.length).toBeLessThanOrEqual(50);
      expect(CONTENT_POS.has(item.pos)).toBe(true);
    }
  });

  test("prompts never repeat", () => {
    expect(new Set(wordlist.map((item) => item.prompt)).size).toBe(wordlist.length);
  });

  test("no gloss is leftover form-of or template junk", () => {
    for (const item of wordlist) {
      expect(item.gloss).not.toMatch(/form of "|spelling of "|[{#]/i);
      expect(item.gloss).not.toMatch(/^(comparative|superlative) degree of/);
    }
  });

  test("supports a full ten-item Challenge draw", () => {
    const items = drawChallenge(wordlist, 10);
    expect(items).toHaveLength(10);
    for (const item of items) {
      expect(new Set(item.options).size).toBe(5);
      expect(item.options[item.correctIndex]).toBeDefined();
    }
  });
});
