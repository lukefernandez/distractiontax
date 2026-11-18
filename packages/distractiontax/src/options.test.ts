import { expect, test } from "bun:test";

type Handler = (event: { preventDefault: () => void }) => unknown;

class FakeElement {
  [property: string]: unknown;
  className = "";
  textContent = "";
  value = "";
  children: FakeElement[] = [];
  private attributes = new Map<string, string>();
  private handlers = new Map<string, Handler[]>();

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }
  append(...nodes: FakeElement[]): void {
    this.children.push(...nodes);
  }
  prepend(...nodes: FakeElement[]): void {
    this.children.unshift(...nodes);
  }
  replaceChildren(...nodes: FakeElement[]): void {
    this.children = nodes;
  }
  addEventListener(type: string, handler: Handler): void {
    this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler]);
  }
  dispatch(type: string): void {
    for (const handler of this.handlers.get(type) ?? []) handler({ preventDefault: () => {} });
  }
  find(className: string): FakeElement[] {
    return this.children.flatMap((child) => [
      ...(child.className === className ? [child] : []),
      ...child.find(className),
    ]);
  }
}

const app = new FakeElement();
globalThis.document = {
  getElementById: (id: string) => (id === "app" ? app : null),
  createElement: () => new FakeElement(),
} as unknown as Document;

const listener = { addListener: () => {} };
const requests: chrome.permissions.Permissions[] = [];
const withoutAccess = "*://*.instagram.com/*";

globalThis.chrome = {
  storage: {
    local: {
      get: async (key: string) =>
        key === "blocklist" ? { blocklist: ["youtube.com", "instagram.com"] } : {},
      set: async () => {},
    },
    onChanged: listener,
  },
  permissions: {
    request: (permissions: chrome.permissions.Permissions) => {
      requests.push(permissions);
      return new Promise<boolean>(() => {});
    },
    contains: async (permissions: chrome.permissions.Permissions) =>
      !permissions.origins?.includes(withoutAccess),
    remove: async () => true,
    onAdded: listener,
    onRemoved: listener,
  },
} as unknown as typeof chrome;

await import("./options.ts");
await new Promise((resolve) => setTimeout(resolve, 0));

test("adding a site asks Chrome for access while the submit is still being handled", () => {
  requests.length = 0;
  const [input] = app.find("site-input");
  input.value = "reddit.com";
  app.find("site-form")[0].dispatch("submit");
  expect(requests).toEqual([{ origins: ["*://*.reddit.com/*"] }]);
});

test("Allow access asks Chrome for access while the click is still being handled", () => {
  requests.length = 0;
  const allow = app.find("site-allow");
  expect(allow).toHaveLength(1);
  allow[0].dispatch("click");
  expect(requests).toEqual([{ origins: [withoutAccess] }]);
});
