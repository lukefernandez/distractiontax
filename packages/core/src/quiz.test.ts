import { describe, expect, test } from "bun:test";
import { drawChallenge } from "./quiz.ts";
import type { WordItem } from "./quiz.ts";

function wordlist(n: number): WordItem[] {
  return Array.from({ length: n }, (_, i) => ({
    prompt: `prompt-${i}`,
    gloss: `gloss-${i}`,
    pos: "n",
  }));
}

const DRAWS = 50;

describe("drawChallenge", () => {
  test("respects a custom item count", () => {
    expect(drawChallenge(wordlist(20), 3)).toHaveLength(3);
  });

  test("correctIndex points at the prompt's Gloss", () => {
    const list = wordlist(20);
    const byPrompt = new Map(list.map((item) => [item.prompt, item.gloss]));
    for (let draw = 0; draw < DRAWS; draw++) {
      for (const item of drawChallenge(list)) {
        expect(item.options[item.correctIndex]).toBe(byPrompt.get(item.prompt)!);
      }
    }
  });

  test("options never repeat — Distractors differ from the Gloss and each other", () => {
    const list = wordlist(20);
    for (let draw = 0; draw < DRAWS; draw++) {
      for (const item of drawChallenge(list)) {
        expect(new Set(item.options).size).toBe(item.options.length);
      }
    }
  });

  test("every option is a Gloss from the Wordlist", () => {
    const list = wordlist(20);
    const glosses = new Set(list.map((item) => item.gloss));
    for (const item of drawChallenge(list)) {
      for (const option of item.options) expect(glosses.has(option)).toBe(true);
    }
  });

  test("prompts within a draw are distinct", () => {
    for (let draw = 0; draw < DRAWS; draw++) {
      const prompts = drawChallenge(wordlist(20)).map((item) => item.prompt);
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  test("throws when there are fewer entries than items", () => {
    expect(() => drawChallenge(wordlist(4))).toThrow("Wordlist too small");
  });

  test("throws when glosses are too uniform to draw Distractors", () => {
    const uniform: WordItem[] = Array.from({ length: 10 }, (_, i) => ({
      prompt: `prompt-${i}`,
      gloss: `gloss-${i % 4}`,
      pos: "v",
    }));
    expect(() => drawChallenge(uniform)).toThrow("Wordlist too small");
  });

  test("a minimal viable Wordlist works: five entries, five distinct glosses", () => {
    const minimal = wordlist(5);
    for (let draw = 0; draw < DRAWS; draw++) {
      const items = drawChallenge(minimal);
      expect(items).toHaveLength(5);
      for (const item of items) expect(new Set(item.options).size).toBe(5);
    }
  });
});
