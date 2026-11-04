export type Trigger =
  | "pageLoad"
  | "spaNavigation"
  | "domChange"
  | "expiryTimer"
  | "visibilityReturn"
  | "windowChange"
  | "forYouTabClick"
  | "exploreNavClick";

export type RenderedTab = "forYou" | "following" | "other" | null;

export interface Observation {
  trigger: Trigger;
  pathname: string;
  search: string;
  renderedTab: RenderedTab;
  windowExpiresAt: number;
  now: number;
}

export type Action =
  | "none"
  | "switchToFollowing"
  | { challenge: { name: string; label: string; returnUrl: string } };

const SURFACE_NAME = "For You & Explore";

const FOR_YOU_CHALLENGE: Action = {
  challenge: { name: SURFACE_NAME, label: "For You is locked.", returnUrl: "https://x.com/home" },
};

const EXPLORE_CHALLENGE: Action = {
  challenge: {
    name: SURFACE_NAME,
    label: "Explore is locked.",
    returnUrl: "https://x.com/explore",
  },
};

export function decide(o: Observation): Action {
  if (o.windowExpiresAt > o.now) return "none";

  if (o.trigger === "forYouTabClick") {
    return FOR_YOU_CHALLENGE;
  }
  if (o.trigger === "exploreNavClick") {
    return EXPLORE_CHALLENGE;
  }

  if (o.pathname.startsWith("/explore")) {
    if (o.trigger === "pageLoad" || o.trigger === "spaNavigation") {
      return EXPLORE_CHALLENGE;
    }
    return "switchToFollowing";
  }

  if (o.pathname === "/home") {
    if (o.renderedTab === "forYou") return "switchToFollowing";
    if (o.renderedTab === null && !o.search.includes("following")) return "switchToFollowing";
  }

  return "none";
}
