import { describe, expect, test } from "bun:test";
import { resolveTarget } from "./target.ts";

describe("resolveTarget", () => {
  test("DistractionTax for X path: query params name the surface, return URL, and label", () => {
    const params = new URLSearchParams({
      surface: "x-discovery",
      name: "For You & Explore",
      return: "https://x.com/home",
      label: "For You is locked.",
    });
    expect(resolveTarget(params, "")).toEqual({
      surface: "x-discovery",
      name: "For You & Explore",
      returnUrl: "https://x.com/home",
      label: "For You is locked.",
    });
  });

  test("a missing label or name falls back to the surface id", () => {
    const params = new URLSearchParams("?surface=x-discovery&return=https://x.com/explore");
    const target = resolveTarget(params, "");
    expect(target?.label).toBe("x-discovery is blocked.");
    expect(target?.name).toBe("x-discovery");
  });

  test("DistractionTax path: the redirect names the site and carries the blocked URL in the hash", () => {
    const params = new URLSearchParams("?surface=youtube.com");
    expect(resolveTarget(params, "#https://m.youtube.com/watch?v=x&t=10#comments")).toEqual({
      surface: "youtube.com",
      name: "youtube.com",
      returnUrl: "https://m.youtube.com/watch?v=x&t=10#comments",
      label: "youtube.com is blocked.",
    });
  });

  test("no return URL goes back to the site root", () => {
    const target = resolveTarget(new URLSearchParams("?surface=youtube.com"), "");
    expect(target?.returnUrl).toBe("https://youtube.com/");
  });

  test("a return URL that isn't http(s) goes back to the site root instead", () => {
    const params = new URLSearchParams("?surface=youtube.com");
    expect(resolveTarget(params, "#javascript:alert(1)")?.returnUrl).toBe("https://youtube.com/");
    const crafted = new URLSearchParams("?surface=x-discovery&return=javascript:alert(1)");
    expect(resolveTarget(crafted, "")?.returnUrl).toBe("https://x-discovery/");
  });

  test("nothing to unlock resolves to null", () => {
    expect(resolveTarget(new URLSearchParams(), "#https://youtube.com/")).toBeNull();
  });
});
