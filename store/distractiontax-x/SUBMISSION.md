# DistractionTax for X: Chrome Web Store submission

Every Developer Dashboard field, in dashboard order, with the value to enter.
Paths are relative to this folder. Run `bun run package` from the repo root
first. It writes the upload zip here. This is a separate listing from
DistractionTax, under the same developer account.

## 0. One-time account setup

Same account as DistractionTax. See section 0 of
[`../distractiontax/SUBMISSION.md`](../distractiontax/SUBMISSION.md).

## 1. Package

| Field  | Value                                                  |
| ------ | ------------------------------------------------------ |
| Upload | `distractiontax-x-v0.1.0.zip` (from `bun run package`) |

Chrome reads these from the zip's `manifest.json`:

| Field             | Value                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Name              | `DistractionTax for X`                                                                                                      |
| Summary (132 max) | `Minimal X: no sidebar, Grok, or chat. For You and Explore cost ten Spanish words, then open for five minutes.` (109 chars) |
| Version           | `0.1.0`                                                                                                                     |
| Icon              | `icons/icon-128.png`, also as `../../packages/distractiontax-x/src/icons/icon-128.png`                                      |

## 2. Store listing

**Description**

```text
DistractionTax for X keeps X, minus the parts built to keep you scrolling.

The right sidebar, Grok, and chat are gone. X opens on Following. The For You tab and Explore stay where they are, but they cost ten Spanish words. Click either one and the Challenge stands in the way. Ten right answers open both for five minutes.

If X switches to For You on its own, you go back to Following without a prompt. When the five minutes end, a For You feed on screen switches to Following on the spot.

The Challenge
A Spanish word appears with five English meanings. Pick the right one with a click or the keys 1 to 5. A miss costs nothing but time. The right answer is shown, a fresh word takes its place, and your count stays where it was.

What's inside
• About 2,000 of the most common Spanish words, with English meanings from Wiktionary.
• Press P or tap the speaker to hear a word, spoken by your browser's built-in voice.
• Anki mode, off by default. If you study with Anki and the AnkiConnect add-on, turn it on and pay with ten reviews from your own decks instead. Anki shows and schedules the cards. The page only counts the reviews.

Private by design
No account, no server, no analytics. It runs only on x.com and reads nothing but which tab and page you're on. Anki mode talks only to Anki on your own computer.

DistractionTax for X is not affiliated with X Corp.

Source code: https://github.com/lukefernandez/distractiontax
```

| Field                         | Value                                                        |
| ----------------------------- | ------------------------------------------------------------ |
| Category                      | Workflow & Planning (alternative: Well-being)                |
| Language                      | English                                                      |
| Store icon (128x128)          | `../../packages/distractiontax-x/src/icons/icon-128.png`     |
| Global promo video            | Leave empty. The existing video shows DistractionTax, not X. |
| Screenshot 1                  | `assets/screenshots/1-challenge-correct.png`                 |
| Screenshot 2                  | `assets/screenshots/2-challenge-miss.png`                    |
| Screenshot 3                  | `assets/screenshots/3-pass.png`                              |
| Screenshot 4                  | `assets/screenshots/4-anki-mode.png`                         |
| Screenshot 5                  | `assets/screenshots/5-anki-gate.png`                         |
| Small promo tile (440x280)    | `assets/promo-small-440x280.png`                             |
| Marquee promo tile (1400x560) | `assets/promo-marquee-1400x560.png` (optional)               |
| Official URL                  | Leave empty (needs a site verified in Search Console)        |
| Homepage URL                  | `https://github.com/lukefernandez/distractiontax`            |
| Support URL                   | `https://github.com/lukefernandez/distractiontax/issues`     |
| Mature content                | No                                                           |

All screenshots are 1280x800, captured from the packaged extension in
Chromium by `store/tools/shots.mjs`. None of them shows x.com itself. A real
X screenshot needs a logged-in account, and it would put other people's
posts in the listing.

## 3. Privacy practices

**Single purpose**

```text
DistractionTax for X makes x.com less distracting. It hides the sidebar, Grok, and chat, and it gates the For You feed and Explore behind a short Spanish vocabulary Challenge that opens them for five minutes. Anki mode is an optional, off-by-default way to pass the same Gate with ten Anki reviews instead.
```

**Permission justifications**

| Permission                     | Justification                                                                                                                                                                                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `storage`                      | Keeps the end time of the five-minute Access Window for For You and Explore, and the Anki mode on/off setting, both on the device.                                                                                                       |
| Host `*://x.com/*`             | Runs the content script on x.com. It hides the sidebar, Grok, and chat, keeps the home timeline on Following, and sends a click on For You or Explore to the bundled Challenge page while no window is open. No other site is requested. |
| Host `http://127.0.0.1:8765/*` | AnkiConnect, a local server run by the Anki add-on on the user's own computer. It is used only when the user turns on Anki mode, to check due cards and count reviews. Nothing leaves the computer.                                      |

**Remote code**

- [x] No, I am not using remote code.

Evidence: all JavaScript is bundled in the zip. The bundles contain no
`eval`, `new Function`, `importScripts`, or dynamic `import()`. The only
network request goes to AnkiConnect on `127.0.0.1`.

**Data usage**, what the extension collects (Google counts data handled
only on the device):

| Category                            | Check?  | Why                                                                                                                                              |
| ----------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Personally identifiable information | No      |                                                                                                                                                  |
| Health information                  | No      |                                                                                                                                                  |
| Financial and payment information   | No      |                                                                                                                                                  |
| Authentication information          | No      |                                                                                                                                                  |
| Personal communications             | No      | It never reads posts or messages.                                                                                                                |
| Location                            | No      |                                                                                                                                                  |
| Web history                         | **Yes** | It checks which x.com page is open (home or Explore) to decide whether to gate, and stores the end time of its window. Nothing is sent anywhere. |
| User activity                       | **Yes** | It notices clicks on the For You tab and the Explore link, and nothing else. It stores none of them.                                             |
| Website content                     | **Yes** | It reads which home-timeline tab is selected, plus Explore link addresses. It does not read post text, and it stores nothing it reads.           |

User activity and Website content are a conservative reading. The
extension handles these signals in the page and stores none of them. Ticking
them matches Google's rule that local processing counts. Leaving them
unticked is defensible too.

**Certifications** (check all three):

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**: the same policy covers both extensions.

```text
https://github.com/lukefernandez/distractiontax/blob/main/PRIVACY.md
```

## 4. Distribution

| Field      | Value                                  |
| ---------- | -------------------------------------- |
| Payments   | Free                                   |
| Visibility | Public (or Unlisted for a soft launch) |
| Regions    | All regions                            |

## 5. Test instructions (optional, for reviewers)

```text
Sign in to x.com. The right sidebar, Grok, and chat are hidden, and the home timeline shows Following. Click the For You tab or Explore. The extension opens its Challenge page. Pick the English meaning of each Spanish word. Ten correct answers open For You and Explore for five minutes, then they are gated again. Anki mode (off by default, on the options page) needs the Anki desktop app with the AnkiConnect add-on. Without Anki, turning it on shows a prompt with a button that starts the word Challenge.
```

## 6. Submit

- [ ] Review the preview, then click "Submit for review". Choosing to
      publish manually after approval gives you control of the launch moment.

Note: X's own brand guidelines restrict using the X logo or name in ways
that imply endorsement. The listing uses "for X" descriptively, uses no X
logo, and says it is not affiliated with X Corp.
