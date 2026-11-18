# DistractionTax

Pay for your distractions in Spanish words. Reclaim your valuable time and presence.

Two minimal Chrome extensions that gate distraction behind a vocabulary
Challenge. Translate 10 Spanish words correctly and get 5 minutes of access.

## The extensions

**DistractionTax for X.** X without the right sidebar or the Grok and chat
buttons. The For You tab and Explore stay visible but are gated. Click either
one and a Challenge stands between you and 5 minutes of access.

**DistractionTax.** A site gate with a Blocklist you edit on its options
page. A fresh install gates YouTube, Instagram, and Hacker News. Visiting a
blocked site redirects to the Challenge. Pass it and that one site unblocks
for 5 minutes. You choose the list, and every visit still costs ten words.

## The Challenge

The Challenge shows Spanish words one at a time, each with five English
options: the correct gloss and four random distractors from the same
wordlist. Pick by click or with keys 1–5. Ten right answers pass. A miss
doesn't count and a fresh word takes its place, so missing only makes the
Challenge longer. Tap the speaker next to a word, or press P, to hear it. The
browser synthesizes the audio with the Web Speech API, so no audio ships with
the extensions and nothing is fetched.

Passing grants a 5-minute **Access Window** to exactly one surface. Windows
expire silently, with no countdown. Expiry is enforced the moment the window
lapses, not on the next navigation. In DistractionTax for X, if For You is on
screen when the window ends, the tab switches to Following. In
DistractionTax, any open tab on the site reloads into the Challenge. An
infinite feed or a playing video never navigates, so waiting for a
navigation would make the window meaningless.

## The Anki Gate

Anki mode is off by default. It is a preference in `chrome.storage.local`,
set on the Anki mode page (the extension's options, also linked from the
Gate). When it is on, and [Anki](https://apps.ankiweb.net/) is running with
the [AnkiConnect](https://ankiweb.net/shared/info/2055492159) add-on and at
least 10 cards due, the Challenge page becomes an Anki Gate. Review 10 cards
in Anki, with your real decks and scheduling, and the Access Window opens.

The page only watches your review count, polled from AnkiConnect at
`127.0.0.1:8765`. Nothing leaves your machine, and no card is rendered outside
Anki. The first use pops an Allow dialog inside Anki, once per extension. A
"use Spanish words instead" link stays available in case Anki quits or your
deck runs dry. With Anki closed, the page says so and waits. Open Anki and
the Gate starts on its own, or press "Answer Spanish words" for the
Challenge.

## Flows

**DistractionTax for X.** Deliberate requests for discovery meet the
Challenge. Passive arrivals are steered away silently. While locked (no
Access Window):

- Opening x.com or landing on `/home` shows Following.
- If X renders For You on its own (it restores your last-used tab), the tab
  switches to Following. What's on screen decides, not the URL.
- Clicking the For You tab opens the Challenge.
- Navigating to Explore opens the Challenge.

Passing opens one 5-minute window covering both For You and Explore. When it
lapses:

- For You on screen switches to Following at once.
- Explore on screen goes back to Following.
- Anywhere else, nothing visible happens. The next discovery attempt
  re-gates.

**DistractionTax.**

- Visiting a blocklisted site opens the Challenge.
- Adding a site on the options page asks Chrome for access to that one site.
  Allow it and the site is gated at once, open tabs included. Deny it and the
  site is not added.
- Removing a site lets it open normally at once. An open Challenge for it
  continues to the site.
- Passing unblocks that one site for 5 minutes. At expiry, any open tab on
  the site reloads into the Challenge, and the next visit is blocked again.

## Layout

```
packages/distractiontax-x/  Chrome extension: minimal, gated x.com
packages/distractiontax/    Chrome extension: blocklist site gate
packages/core/              @distractiontax/core: the Challenge page, quiz engine, Anki client, wordlist
scripts/                    build-wordlist.ts, and package.ts, which zips each build for the store
store/<extension>/          Chrome Web Store listing: SUBMISSION.md, screenshots, promo tiles
store/tools/                Chromium checks of the packaged zips, and the asset generators
CONTEXT.md                  the domain glossary and the decisions behind it
PRIVACY.md                  the privacy policy for both extensions
```

## Develop

```sh
bun install
bun run build        # builds both extensions into packages/*/dist
bun run package      # builds, then zips each into store/<extension>/<extension>-v<version>.zip
bun run lint         # oxlint
bun run format       # oxfmt
bun run typecheck    # tsc --noEmit
bun test
bun run wordlist     # regenerates wordlist.json (-- --top 2500 for more words)
```

Tests cover the pure modules: the gate policy (including its guard against
a reload loop on the Following fallback), the quiz draw, Access Windows, DNR
rule derivation, Challenge target resolution, Anki review progress, Anki
mode, Blocklist parsing and editing, and the committed wordlist's
invariants. The browser adapters are unit tested against a fake Chrome only
for one ordering rule: the background replaces its redirect rules in one
update. Beyond that, mocked tests would keep passing if X or Chrome
changed underneath them. Instead, `store/tools` loads the packaged zips in
real Chromium and drives the core flows end to end (see [store/tools/README.md](./store/tools/README.md)).
Its x.com page is a stand-in, so a change to X's own markup still needs a
check in a real session.

To run unpacked, load `packages/distractiontax-x/dist` or
`packages/distractiontax/dist` at `chrome://extensions`. Chrome MV3 only.

## Chrome Web Store

Each extension is its own listing. `bun run package` builds the upload zip.
`store/<extension>/SUBMISSION.md` lists every dashboard field and its value,
in order. The build grants the default sites' hosts up front, from
`DEFAULT_BLOCKLIST` in `packages/distractiontax/src/blocklist.ts`. Chrome asks
for each site a user adds at runtime, from `optional_host_permissions`, so
added sites never appear in the install warning (see
[CONTEXT.md](./CONTEXT.md#decisions)).

## License

Code: [MIT](./LICENSE). Wordlist data: [CC BY-SA 4.0](./DATA-LICENSE), with
glosses from Wiktionary via [kaikki.org](https://kaikki.org/dictionary/Spanish/)
and frequency ranking from [doozan/spanish_data](https://github.com/doozan/spanish_data).
[DATA-LICENSE](./DATA-LICENSE) has the full chain.
