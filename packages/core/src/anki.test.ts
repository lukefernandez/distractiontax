import { describe, expect, test } from "bun:test";
import { startProgress, updateProgress } from "./anki.ts";

describe("review progress", () => {
  test("starts at zero whatever the day's count already is", () => {
    expect(startProgress(0).done).toBe(0);
    expect(startProgress(37).done).toBe(0);
  });

  test("counts reviews as the day's count rises", () => {
    let progress = startProgress(37);
    progress = updateProgress(progress, 40);
    expect(progress.done).toBe(3);
    progress = updateProgress(progress, 47);
    expect(progress.done).toBe(10);
  });

  test("an unchanged count changes nothing", () => {
    const progress = updateProgress(startProgress(5), 5);
    expect(progress).toEqual(startProgress(5));
  });

  test("day rollover mid-Gate keeps the progress already earned", () => {
    let progress = startProgress(37);
    progress = updateProgress(progress, 41);
    progress = updateProgress(progress, 0);
    expect(progress.done).toBe(4);
  });

  test("reviews keep counting after a rollover", () => {
    let progress = startProgress(37);
    progress = updateProgress(progress, 41);
    progress = updateProgress(progress, 0);
    progress = updateProgress(progress, 6);
    expect(progress.done).toBe(10);
  });

  test("an undo never moves progress backwards", () => {
    let progress = startProgress(10);
    progress = updateProgress(progress, 13);
    progress = updateProgress(progress, 12);
    expect(progress.done).toBe(3);
    progress = updateProgress(progress, 13);
    expect(progress.done).toBe(4);
  });
});
