# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Chrome users who want to break compulsive visits to distracting sites without
going cold turkey, and who like paying for access with a little Spanish
practice. A second audience is developers reading the open-source code on
GitHub.

## Product Purpose

DistractionTax is a minimal Chrome extension that gates distracting sites
behind a vocabulary Challenge. Translate ten Spanish words correctly and the
site unblocks for five minutes. Success means fewer mindless visits, with
vocabulary retained as a side effect of the urge to browse. A sibling
extension, DistractionTax for X, applies the same Gate to X's discovery
surfaces. Marketing copy centers DistractionTax.

## Positioning

The tax is the visit, not the list. You choose which sites cost ten Spanish
words on the options page, and every visit to one of them costs ten. The Gate
itself has no toggle, no snooze, and no skip. Anki mode is a separate
preference. It picks which Gate you pass, not whether you pay. A miss never
resets progress. It draws a fresh word, so the only cost of failing is a
longer Challenge.

## Operating Context

Distributed through the Chrome Web Store, with the listing in `store/`. A
fresh install gates YouTube, Instagram, and Hacker News, and the user adds and
removes sites on the options page. Visiting a blocklisted site redirects to
the Challenge page. Ten correct answers grant a five-minute Access Window for
one Gated Surface. Windows expire silently, but expiry is enforced the instant
it lapses: any open tab on the site reloads into the Challenge. The browser
synthesizes pronunciation with the Web Speech API, so no audio ships and
nothing is fetched.

## Capabilities and Constraints

- Chrome MV3 only. No Firefox or Safari.
- No accounts, no server, no telemetry. The Blocklist and Anki mode are
  stored in the extension. Anki mode is off unless the user turns it on.
- Chrome is asked for each added site one at a time, so the install warning
  names only the three defaults.
- Wordlist: the top ~2000 Spanish content words with English glosses,
  frequency-ranked, as `{ prompt, gloss, pos }`. The format is
  language-agnostic.
- Challenge mechanics: one Prompt at a time, five options (one Gloss, four
  Distractors), keys 1–5 to answer, P or the speaker icon for pronunciation,
  ten correct to pass, misses replaced by fresh Prompts.
- Domain terms are binding (see CONTEXT.md): Gate, Gated Surface, Challenge,
  Anki Gate, Anki mode, Prompt, Gloss, Distractor, Deliberate Request, Passive
  Arrival, Access Window, Blocklist, Wordlist. Avoid quiz, blocker, unlock,
  timer, settings (for the Blocklist), and blacklist.
- No pricing. The code is MIT and the wordlist data is CC BY-SA 4.0.

## Brand Commitments

Name: DistractionTax. The monorepo also ships DistractionTax for X and
`@distractiontax/core`. Tagline: "Pay for your distractions in Spanish words.
Reclaim your valuable time and presence." The voice is plain, declarative, and
slightly wry ("The friction is the feature"). No legality framing, such as
"distraction is still legal, it's just taxed". Distribution is the Chrome Web
Store, with listing copy and assets in `store/`. Extension icons are in
`packages/*/src/icons`, and the repo has no
other logo.

## Evidence on Hand

- Working extensions and quiz engine in `packages/`.
- The committed wordlist at `packages/core/src/wordlist.json`, real Spanish
  entries usable for a live demo.
- Tests for the gate policy, quiz draw, Access Windows, DNR rules, Blocklist
  parsing and editing, and wordlist invariants.
- The glossary and design decisions in CONTEXT.md.
- Absent, so never invent them: testimonials, user counts, store ratings,
  press, benchmarks, pricing, a Chrome Web Store URL.

## Product Principles

- Friction is deliberate. Never add a convenience that defeats the Gate, such
  as a snooze, a skip, or a longer window. The Blocklist editor chooses which
  sites are gated, and Anki mode chooses which Gate is offered. Neither waives
  a visit.
- Prove, don't claim. Showing the Challenge working is the best marketing.
- Local and silent. No accounts, no tracking, no countdowns. Expiry is
  enforced, not announced.
- Misses teach, they don't punish. A wrong answer costs time, not progress.
- Speak the domain language: Gate, Challenge, Access Window. Never quiz,
  blocker, or unlock.
