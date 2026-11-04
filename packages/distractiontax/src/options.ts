import { ankiModeSection } from "../../core/src/challenge/anki-mode-section.ts";
import { el } from "../../core/src/challenge/dom.ts";
import {
  BLOCKLIST_KEY,
  addToBlocklist,
  getBlocklist,
  parseDomain,
  parseStoredBlocklist,
  removeFromBlocklist,
  saveBlocklist,
} from "./blocklist.ts";
import type { Domain } from "./blocklist.ts";
import { hostPermission } from "./rules.ts";

function originsFor(domain: Domain): chrome.permissions.Permissions {
  return { origins: [hostPermission(domain)] };
}

function blocklistSection(initial: Domain[]): HTMLElement[] {
  let blocklist = initial;

  const list = el("ul", "sites");
  list.setAttribute("aria-label", "Gated sites");

  const input = document.createElement("input");
  input.className = "site-input";
  input.type = "text";
  input.placeholder = "reddit.com";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Site to gate");

  const add = el("button", "site-add", "Add");
  add.setAttribute("type", "submit");

  const form = el("form", "site-form");
  form.append(input, add);

  const status = el("p", "site-status");
  status.setAttribute("role", "status");

  const help = el(
    "p",
    "setting-help",
    "Visiting a listed site, or any of its subdomains, opens the Challenge.",
  );

  const card = el("div", "card");
  card.append(help, list, form, status);

  function say(text: string): void {
    status.textContent = text;
  }

  let editing = Promise.resolve();
  function edit(change: (current: Domain[]) => Promise<void>): void {
    editing = editing
      .then(async () => change(await getBlocklist()))
      .catch(() => say("That change didn't save. Try again."));
  }

  function row(domain: Domain, hasAccess: boolean): HTMLElement {
    const item = el("li", "site");
    item.append(el("span", "site-name", domain));
    if (!hasAccess) {
      const allow = el("button", "site-allow", "Allow access");
      allow.setAttribute("type", "button");
      allow.title = "Chrome has no access to this site, so it isn't gated.";
      allow.addEventListener("click", () => {
        void chrome.permissions.request(originsFor(domain)).then(
          (granted) => say(granted ? `${domain} is gated.` : `${domain} still isn't gated.`),
          () => say(`Chrome couldn't ask for access to ${domain}. Try again.`),
        );
      });
      item.append(allow);
    }
    const remove = el("button", "site-remove", "Remove");
    remove.setAttribute("type", "button");
    remove.setAttribute("aria-label", `Remove ${domain}`);
    remove.addEventListener("click", () =>
      edit(async (current) => {
        await saveBlocklist(removeFromBlocklist(current, domain));
        await releaseAccess([domain]);
        say(`${domain} is off the Blocklist.`);
      }),
    );
    item.append(remove);
    return item;
  }

  let paints = 0;
  async function paint(): Promise<void> {
    const turn = ++paints;
    const shown = blocklist;
    const access = await Promise.all(
      shown.map((domain) => chrome.permissions.contains(originsFor(domain))),
    );
    if (turn !== paints) return;
    list.replaceChildren(
      ...(shown.length === 0
        ? [el("li", "site-empty", "Nothing is gated.")]
        : shown.map((domain, index) => row(domain, access[index]))),
    );
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const domain = parseDomain(input.value);
    if (!domain.ok) return say(domain.reason);
    const check = addToBlocklist(blocklist, domain.value);
    if (!check.ok) return say(check.reason);

    void chrome.permissions.request(originsFor(domain.value)).then(
      (granted) => {
        if (!granted) {
          say(`Chrome didn't allow access to ${domain.value}, so it wasn't added.`);
          return;
        }
        edit(async (current) => {
          const added = addToBlocklist(current, domain.value);
          if (!added.ok) return say(added.reason);
          await saveBlocklist(added.value.blocklist);
          await releaseAccess(added.value.replaced);
          input.value = "";
          const replaced = added.value.replaced;
          say(
            replaced.length
              ? `${domain.value} is on the Blocklist, in place of ${replaced.join(", ")}.`
              : `${domain.value} is on the Blocklist.`,
          );
        });
      },
      () => say(`Chrome couldn't ask for access to ${domain.value}. Try again.`),
    );
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local" || !changes[BLOCKLIST_KEY]) return;
    blocklist = parseStoredBlocklist(changes[BLOCKLIST_KEY].newValue);
    void paint();
  });
  chrome.permissions.onAdded.addListener(() => void paint());
  chrome.permissions.onRemoved.addListener(() => void paint());

  void paint();
  return [
    el("h1", "title", "Blocklist"),
    card,
    el("p", "footnote", "Saved on this browser. Changes apply right away."),
  ];
}

async function releaseAccess(domains: readonly Domain[]): Promise<void> {
  for (const domain of domains) {
    await chrome.permissions.remove(originsFor(domain)).catch(() => false);
  }
}

async function main(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) return;
  const [blocklist, anki] = await Promise.all([getBlocklist(), ankiModeSection()]);
  app.replaceChildren(...blocklistSection(blocklist), ...anki);
}

void main();
