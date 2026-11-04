# DistractionTax

Two minimal Chrome extensions that gate distracting surfaces behind a vocabulary challenge: DistractionTax for X (the For You feed on x.com) and DistractionTax (a blocklist of sites the user edits).

## Language

**Gate**:
A barrier between the user and a Gated Surface. Passing a Gate grants access. Two Gate types exist: the vocabulary Challenge and the Anki Gate. Anki mode decides which one opens.
_Avoid_: lock, shield, blocker

**Gated Surface**:
The specific thing access is metered for: a blocked domain in DistractionTax, or X's discovery surfaces (the For You feed and the Explore page) in DistractionTax for X, which together form one surface. Always one identifiable surface with its own Access Window, never "a site" in general.
_Avoid_: site, page, app

**Challenge**:
The vocabulary Gate. Prompts are shown one at a time, each with five options: one Gloss and four Distractors. Passing takes ten correct answers. A missed Prompt doesn't count and a fresh one takes its place, so the only cost of missing is a longer Challenge.
_Avoid_: quiz, test, exam

**Anki Gate**:
A Gate passed by reviewing ten due cards in the user's own Anki collection. The page only verifies. It polls AnkiConnect's review count while Anki renders, grades, and schedules the cards. It runs when Anki mode is on, Anki is open with the AnkiConnect add-on, this extension's origin is allowed, and at least ten cards are due. Otherwise the page asks the user to open Anki, starts the Gate on its own when Anki appears, and offers the Challenge one click away. A visible link swaps to the Challenge mid-Gate.
_Avoid_: anki challenge, anki quiz

**Anki mode**:
Whether the Anki Gate is offered. Off, the default and what nothing stored means, starts the Challenge directly. On runs the Anki Gate when Anki is reachable with ten cards due, and otherwise asks the user to open Anki, with the Challenge one click away. Stored in `chrome.storage.local` under `ankiMode`, beside Access Windows, and edited from the Anki mode page. Each extension remembers its own. The Blocklist is not part of this preference.
_Avoid_: anki setting, anki toggle, feature flag

**Prompt**:
The vocabulary item shown to the user, in the target language (Spanish in the first Wordlist).

**Gloss**:
The correct answer for a Prompt, in the user's language (English in the first Wordlist).

**Distractor**:
A wrong option drawn at random from the same Wordlist as the Gloss. Four per item.
_Avoid_: decoy, foil

**Deliberate Request**:
An explicit ask for a Gated Surface, such as clicking the For You tab, navigating to Explore, or typing a blocked URL. Always answered with a Gate.
_Avoid_: intentional visit, click-through

**Passive Arrival**:
Reaching a Gated Surface without asking for it: a default landing, the platform restoring its own state, or an Access Window lapsing mid-view. Answered by steering away, not by demanding a pass. Where the platform has a safe surface (X's Following feed), the steer is silent. A blocked site re-gates, and the visit lands on the Gate page.
_Avoid_: accidental visit, drive-by

**Access Window**:
Five minutes of access to exactly one Gated Surface, granted by passing a Gate. Expires silently. The surface re-gates the next time it would be shown, or immediately if it is on screen when the window lapses. Passing again during an active window resets it to a fresh five minutes.
_Avoid_: unlock, session, timer, cheat window

**Blocklist**:
The list of Gated Surfaces for DistractionTax: domains, each covering its subdomains, with no entry covering another. Stored in `chrome.storage.local` under `blocklist` and edited on the options page. A fresh install holds youtube.com, instagram.com, and news.ycombinator.com. Local and IP addresses can never be on it. Adding a site gates it at once; removing one lets it through at once.
_Avoid_: rules, blacklist, settings

**Wordlist**:
The vocabulary data shipped with the extensions: `{ prompt, gloss, pos }` entries, frequency-ranked. Language-agnostic by design. The only instance is the top 2000 Spanish content words with English glosses.
_Avoid_: dictionary, deck, wordbank

## Decisions

**The Blocklist is edited in the extension.** Store users can't fork and rebuild, so the list lives in storage and the options page edits it. The editor chooses which sites cost a visit, never what a visit costs.

**Only the defaults are install-time host permissions.** The build derives `host_permissions` from `DEFAULT_BLOCKLIST`, so the install warning names three sites. Each added site is requested at runtime from `optional_host_permissions` inside the Add click, because Chrome prompts only on a user gesture. `<all_urls>` or `*://*/*` in `host_permissions` would warn "all your data on all websites".

**The redirect rule carries the target.** The rule puts the site in the query and the blocked URL in the hash. Recording it from `webNavigation` misses navigations that wake a stopped service worker, and needs a "browsing history" permission.

**The Anki Gate only verifies.** The page polls AnkiConnect's review count while Anki renders, grades, and schedules the cards. An in-page reviewer would be a worse copy of Anki's and add no integrity, since reviews are self-graded anywhere. The page never launches Anki, because that needs a native-messaging helper installed per machine.

**Anki mode is opt-in.** The Challenge needs nothing else installed, so it is the default. Only a stored `true` turns Anki mode on, so a missing key or a bad write never offers a Gate the user didn't choose. It can be a plain preference because both Gates cost ten real efforts.

**Pronunciation is browser TTS.** Recorded audio covers few Wordlist entries and means tens of megabytes of bundled files or network fetches, plus per-file attribution. `speechSynthesis` covers every word in any language with no assets and no network.

**Wordlist sources.** Frequency ranking comes from doozan/spanish_data, the only open list that is lemmatized, POS-tagged, and share-alike compatible. Non-commercial and proprietary lists are excluded. Glosses come from kaikki.org's wiktextract data, whose sense tags let the build skip archaic, rare, and form-of senses. Both are Wiktionary-derived, so `wordlist.json` is CC BY-SA 4.0 and the code stays MIT (see DATA-LICENSE). The file is committed so builds never need the network.

**Design for languages, don't build them.** One Wordlist ships, with no language picker or plugin machinery, and the Challenge is one page in `@distractiontax/core` that both extensions bundle. The format stays `{ prompt, gloss, pos }`, never `es`/`en`, so a new language is a new data file. Abstraction waits for a second instance.
