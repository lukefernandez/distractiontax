import { describe, expect, test } from "bun:test";
import { decide, FOLLOWING_FALLBACK } from "./gate-policy.ts";
import type { Observation } from "./gate-policy.ts";

const NOW = 1_000_000;
const LIVE = NOW + 60_000;
const LAPSED = NOW - 1;

function observation(overrides: Partial<Observation>): Observation {
  return {
    trigger: "pageLoad",
    pathname: "/home",
    search: "",
    renderedTab: null,
    windowExpiresAt: 0,
    now: NOW,
    ...overrides,
  };
}

describe("while locked", () => {
  test("landing on /home is switched to Following", () => {
    expect(decide(observation({ trigger: "pageLoad" }))).toBe("switchToFollowing");
  });

  test("the URL says ?following=true but X renders For You — the DOM wins", () => {
    const o = observation({
      trigger: "domChange",
      search: "?following=true",
      renderedTab: "forYou",
    });
    expect(decide(o)).toBe("switchToFollowing");
  });

  test("the Following fallback URL needs nothing before X renders its tabs — no reload loop", () => {
    const { pathname, search } = new URL(FOLLOWING_FALLBACK, "https://x.com");
    for (const trigger of [
      "pageLoad",
      "spaNavigation",
      "domChange",
      "expiryTimer",
      "visibilityReturn",
      "windowChange",
    ] as const) {
      expect(decide(observation({ trigger, pathname, search, renderedTab: null }))).toBe("none");
    }
  });

  test("the Following feed on screen needs nothing", () => {
    expect(decide(observation({ trigger: "domChange", renderedTab: "following" }))).toBe("none");
  });

  test("a pinned-list tab on screen needs nothing", () => {
    expect(decide(observation({ trigger: "domChange", renderedTab: "other" }))).toBe("none");
  });

  test("clicking the For You tab is a Deliberate Request — Challenge", () => {
    expect(decide(observation({ trigger: "forYouTabClick", renderedTab: "following" }))).toEqual({
      challenge: {
        name: "For You & Explore",
        label: "For You is locked.",
        returnUrl: "https://x.com/home",
      },
    });
  });

  test("clicking Explore in the nav is a Deliberate Request — Challenge", () => {
    expect(decide(observation({ trigger: "exploreNavClick", pathname: "/home" }))).toEqual({
      challenge: {
        name: "For You & Explore",
        label: "Explore is locked.",
        returnUrl: "https://x.com/explore",
      },
    });
  });

  test("navigating to Explore is a Deliberate Request — Challenge", () => {
    for (const trigger of ["pageLoad", "spaNavigation"] as const) {
      expect(decide(observation({ trigger, pathname: "/explore" }))).toEqual({
        challenge: {
          name: "For You & Explore",
          label: "Explore is locked.",
          returnUrl: "https://x.com/explore",
        },
      });
    }
  });

  test("Explore subpages count as Explore", () => {
    const o = observation({ trigger: "spaNavigation", pathname: "/explore/tabs/news" });
    expect(decide(o)).not.toBe("none");
  });

  test("pages outside the Gated Surface need nothing", () => {
    for (const pathname of ["/notifications", "/someuser", "/messages"]) {
      expect(decide(observation({ trigger: "spaNavigation", pathname }))).toBe("none");
    }
  });
});

describe("with a live Access Window", () => {
  test("every trigger is a no-op", () => {
    const triggers = [
      "pageLoad",
      "spaNavigation",
      "domChange",
      "expiryTimer",
      "visibilityReturn",
      "windowChange",
      "forYouTabClick",
      "exploreNavClick",
    ] as const;
    for (const trigger of triggers) {
      const o = observation({ trigger, renderedTab: "forYou", windowExpiresAt: LIVE });
      expect(decide(o)).toBe("none");
    }
    const explore = observation({ pathname: "/explore", windowExpiresAt: LIVE });
    expect(decide(explore)).toBe("none");
  });
});

describe("when the window lapses mid-view", () => {
  test("For You on screen is switched to Following on the spot", () => {
    const o = observation({
      trigger: "expiryTimer",
      renderedTab: "forYou",
      windowExpiresAt: LAPSED,
    });
    expect(decide(o)).toBe("switchToFollowing");
  });

  test("Explore on screen is switched to Following — passive, no Challenge", () => {
    for (const trigger of [
      "expiryTimer",
      "visibilityReturn",
      "windowChange",
      "domChange",
    ] as const) {
      const o = observation({ trigger, pathname: "/explore", windowExpiresAt: LAPSED });
      expect(decide(o)).toBe("switchToFollowing");
    }
  });

  test("a stale expiry timer after a re-pass is a no-op", () => {
    const o = observation({ trigger: "expiryTimer", renderedTab: "forYou", windowExpiresAt: LIVE });
    expect(decide(o)).toBe("none");
  });

  test("returning to a backgrounded tab enforces the lapse", () => {
    const o = observation({
      trigger: "visibilityReturn",
      search: "?following=true",
      renderedTab: "forYou",
      windowExpiresAt: LAPSED,
    });
    expect(decide(o)).toBe("switchToFollowing");
  });
});
