import { describe, expect, test } from "bun:test";
import {
  DEFAULT_BLOCKLIST,
  MAX_BLOCKLIST,
  addToBlocklist,
  keepListedWindows,
  matchesBlocklist,
  parseDomain,
  parseStoredBlocklist,
  removeFromBlocklist,
} from "./blocklist.ts";
import type { Domain } from "./blocklist.ts";

const domain = (text: string): Domain => text;

function parsed(input: string): string | null {
  const result = parseDomain(input);
  return result.ok ? result.value : null;
}

describe("parseDomain", () => {
  test("normalizes case, whitespace, URLs, ports, and a leading www", () => {
    expect(parsed("reddit.com")).toBe("reddit.com");
    expect(parsed("  Reddit.COM  ")).toBe("reddit.com");
    expect(parsed("www.reddit.com")).toBe("reddit.com");
    expect(parsed("https://www.reddit.com/r/all?sort=top#x")).toBe("reddit.com");
    expect(parsed("http://old.reddit.com:8080/")).toBe("old.reddit.com");
    expect(parsed("reddit.com/r/all")).toBe("reddit.com");
    expect(parsed("reddit.com.")).toBe("reddit.com");
  });

  test("keeps subdomains other than www", () => {
    expect(parsed("news.ycombinator.com")).toBe("news.ycombinator.com");
    expect(parsed("m.youtube.com")).toBe("m.youtube.com");
  });

  test("encodes international domains the way Chrome matches them", () => {
    expect(parsed("bücher.de")).toBe("xn--bcher-kva.de");
  });

  test("refuses AnkiConnect and every other local or IP address", () => {
    for (const input of [
      "127.0.0.1",
      "127.0.0.1:8765",
      "http://127.0.0.1:8765/",
      "localhost",
      "localhost:8765",
      "anki.localhost",
      "[::1]",
      "http://[::1]:8765",
      "8.8.8.8",
    ]) {
      const result = parseDomain(input);
      expect(result.ok, input).toBe(false);
    }
  });

  test("refuses input that isn't a website domain", () => {
    for (const input of [
      "",
      "   ",
      "reddit",
      "com",
      "www.com",
      "*.reddit.com",
      "red dit.com",
      "-reddit.com",
      "reddit-.com",
      "reddit..com",
      "ftp://reddit.com",
      "chrome://extensions",
      "file:///etc/hosts",
      "reddit.123",
      `${"a".repeat(64)}.com`,
      `${"abcdefghi.".repeat(26)}com`,
    ]) {
      expect(parseDomain(input).ok, input).toBe(false);
    }
  });

  test("every refusal tells the user what to type instead", () => {
    const result = parseDomain("reddit");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain("reddit.com");
  });
});

describe("matchesBlocklist", () => {
  test("matches the domain itself and any subdomain", () => {
    expect(matchesBlocklist("youtube.com", DEFAULT_BLOCKLIST)).toBe("youtube.com");
    expect(matchesBlocklist("m.youtube.com", DEFAULT_BLOCKLIST)).toBe("youtube.com");
    expect(matchesBlocklist("music.m.youtube.com", DEFAULT_BLOCKLIST)).toBe("youtube.com");
  });

  test("suffix lookalikes and unlisted hosts don't match", () => {
    expect(matchesBlocklist("notyoutube.com", DEFAULT_BLOCKLIST)).toBeNull();
    expect(matchesBlocklist("youtube.com.evil.net", DEFAULT_BLOCKLIST)).toBeNull();
    expect(matchesBlocklist("ycombinator.com", DEFAULT_BLOCKLIST)).toBeNull();
    expect(matchesBlocklist("x.com", DEFAULT_BLOCKLIST)).toBeNull();
  });

  test("an empty Blocklist matches nothing", () => {
    expect(matchesBlocklist("youtube.com", [])).toBeNull();
  });
});

describe("addToBlocklist", () => {
  test("appends a new domain", () => {
    const result = addToBlocklist(DEFAULT_BLOCKLIST, domain("reddit.com"));
    expect(result).toEqual({
      ok: true,
      value: { blocklist: [...DEFAULT_BLOCKLIST, "reddit.com"], replaced: [] },
    });
  });

  test("refuses a duplicate", () => {
    const result = addToBlocklist(DEFAULT_BLOCKLIST, domain("youtube.com"));
    expect(result).toEqual({ ok: false, reason: "youtube.com is already on the Blocklist." });
  });

  test("refuses a subdomain an entry already covers", () => {
    const result = addToBlocklist(DEFAULT_BLOCKLIST, domain("m.youtube.com"));
    expect(result).toEqual({ ok: false, reason: "youtube.com already covers m.youtube.com." });
  });

  test("a parent domain replaces the subdomains it covers", () => {
    const result = addToBlocklist(DEFAULT_BLOCKLIST, domain("ycombinator.com"));
    expect(result).toEqual({
      ok: true,
      value: {
        blocklist: ["youtube.com", "instagram.com", "ycombinator.com"],
        replaced: ["news.ycombinator.com"],
      },
    });
  });

  test("refuses to grow past the cap, but a replacing parent still fits", () => {
    const full = Array.from({ length: MAX_BLOCKLIST }, (_, i) => domain(`site${i}.example.com`));
    expect(addToBlocklist(full, domain("reddit.com")).ok).toBe(false);
    const result = addToBlocklist(full, domain("example.com"));
    expect(result.ok && result.value.blocklist).toEqual(["example.com"]);
  });

  test("adds to an empty list", () => {
    const result = addToBlocklist([], domain("reddit.com"));
    expect(result.ok && result.value.blocklist).toEqual(["reddit.com"]);
  });
});

describe("removeFromBlocklist", () => {
  test("removes only that domain", () => {
    expect(removeFromBlocklist(DEFAULT_BLOCKLIST, domain("instagram.com"))).toEqual([
      "youtube.com",
      "news.ycombinator.com",
    ]);
  });
});

describe("parseStoredBlocklist", () => {
  test("nothing stored means the defaults", () => {
    expect(parseStoredBlocklist(undefined)).toEqual([...DEFAULT_BLOCKLIST]);
  });

  test("a stored empty list stays empty", () => {
    expect(parseStoredBlocklist([])).toEqual([]);
  });

  test("a stored list is read in order", () => {
    expect(parseStoredBlocklist(["reddit.com", "youtube.com"])).toEqual([
      "reddit.com",
      "youtube.com",
    ]);
  });

  test("a value that isn't a list falls back to the defaults", () => {
    expect(parseStoredBlocklist("youtube.com")).toEqual([...DEFAULT_BLOCKLIST]);
    expect(parseStoredBlocklist({ 0: "reddit.com" })).toEqual([...DEFAULT_BLOCKLIST]);
  });

  test("drops entries that aren't normalized domains, so a bad write can't gate AnkiConnect", () => {
    expect(
      parseStoredBlocklist([
        "reddit.com",
        "127.0.0.1",
        "localhost",
        "Reddit.com",
        "www.x.com",
        42,
        null,
        "x.com",
      ]),
    ).toEqual(["reddit.com", "x.com"]);
  });

  test("drops duplicates and covered entries", () => {
    expect(
      parseStoredBlocklist(["youtube.com", "youtube.com", "m.youtube.com", "reddit.com"]),
    ).toEqual(["youtube.com", "reddit.com"]);
    expect(parseStoredBlocklist(["m.youtube.com", "youtube.com"])).toEqual(["m.youtube.com"]);
  });
});

describe("keepListedWindows", () => {
  test("drops the windows of removed domains and keeps the rest", () => {
    const windows = { "youtube.com": 5, "reddit.com": 7 };
    expect(keepListedWindows(windows, DEFAULT_BLOCKLIST)).toEqual({ "youtube.com": 5 });
    expect(keepListedWindows(windows, [])).toEqual({});
  });
});
