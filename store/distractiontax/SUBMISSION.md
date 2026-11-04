# DistractionTax: Chrome Web Store submission

Every Developer Dashboard field, in dashboard order, with the value to enter.
Paths are relative to this folder. Run `bun run package` from the repo root
first. It writes the upload zip here.

## 0. One-time account setup

- [ ] Register a developer account at
      <https://chrome.google.com/webstore/devconsole> and pay the one-time $5 fee.
- [ ] Verify the contact email.
- [ ] Declare trader or non-trader status. Under the EU Digital Services Act,
      a free hobby project is usually non-trader.

## 1. Package

| Field  | Value                                                |
| ------ | ---------------------------------------------------- |
| Upload | `distractiontax-v0.1.0.zip` (from `bun run package`) |

Chrome reads these from the zip's `manifest.json`:

| Field             | Value                                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name              | `DistractionTax`                                                                                                                                 |
| Summary (132 max) | `YouTube, Instagram, Hacker News, and any site you add cost ten Spanish words. Translate them and that site opens for five minutes.` (130 chars) |
| Version           | `0.1.0`                                                                                                                                          |
| Icon              | `icons/icon-128.png`, also as `../../packages/distractiontax/src/icons/icon-128.png`                                                             |

## 2. Store listing

**Description**

```text
DistractionTax puts a price on your distracting sites: ten Spanish words. It starts with YouTube, Instagram, and Hacker News, and you can add your own.

Open one of them and you land on the Challenge instead. A Spanish word appears with five English meanings. Pick the right one with a click or the keys 1 to 5. Ten right answers open that one site for five minutes.

A miss costs nothing but time. The right answer is shown, a fresh word takes its place, and your count stays where it was.

The five minutes end quietly. Nothing counts down. When the time is up, any open tab on the site reloads into the Challenge, even if a video is still playing.

You choose the list on the options page. Type a site, like reddit.com, and Chrome asks you to allow access to that one site. Each site covers its subdomains, and a change takes effect at once. There is no snooze and no skip: every visit to a listed site costs ten words.

What's inside
• About 2,000 of the most common Spanish words, with English meanings from Wiktionary.
• Press P or tap the speaker to hear a word, spoken by your browser's built-in voice.
• Anki mode, off by default. If you study with Anki and the AnkiConnect add-on, turn it on and pay with ten reviews from your own decks instead. Anki shows and schedules the cards. The page only counts the reviews.

Private by design
No account, no server, no analytics. Everything stays in your browser. Anki mode talks only to Anki on your own computer.

Source code: https://github.com/lukefernandez/distractiontax
```

| Field                         | Value                                                             |
| ----------------------------- | ----------------------------------------------------------------- |
| Category                      | Workflow & Planning (alternative: Well-being)                     |
| Language                      | English                                                           |
| Store icon (128x128)          | `../../packages/distractiontax/src/icons/icon-128.png`            |
| Global promo video            | YouTube link to `assets/promo-video.mp4` once uploaded (optional) |
| Screenshot 1                  | `assets/screenshots/1-challenge-correct.png`                      |
| Screenshot 2                  | `assets/screenshots/2-challenge-miss.png`                         |
| Screenshot 3                  | `assets/screenshots/3-pass.png`                                   |
| Screenshot 4                  | `assets/screenshots/4-blocklist.png`                              |
| Screenshot 5                  | `assets/screenshots/5-anki-gate.png`                              |
| Small promo tile (440x280)    | `assets/promo-small-440x280.png`                                  |
| Marquee promo tile (1400x560) | `assets/promo-marquee-1400x560.png` (optional)                    |
| Official URL                  | Leave empty (needs a site verified in Search Console)             |
| Homepage URL                  | `https://github.com/lukefernandez/distractiontax`                 |
| Support URL                   | `https://github.com/lukefernandez/distractiontax/issues`          |
| Mature content                | No                                                                |

All screenshots are 1280x800, captured from the packaged extension in
Chromium by `store/tools/shots.mjs`.

## 3. Privacy practices

**Single purpose**

```text
DistractionTax gates the distracting sites on the user's list (YouTube, Instagram, and Hacker News to start, edited on the options page) behind a short Spanish vocabulary Challenge. Passing it opens that one site for five minutes. Anki mode is an optional, off-by-default way to pass the same Gate with ten Anki reviews instead.
```

**Permission justifications**

| Permission                                                                          | Justification                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `storage`                                                                           | Keeps the user's Blocklist (the sites to gate), the end time of each site's five-minute Access Window, and the Anki mode on/off setting, all on the device.                                                                                                                                                                                |
| `declarativeNetRequest`                                                             | Redirects top-level visits to the sites on the user's Blocklist to the extension's bundled Challenge page. The redirect carries the site and the address the user was headed to, so the Challenge can name the site and return there after a pass. Rules are generated locally from the list and removed while that site's window is open. |
| `alarms`                                                                            | Restores a site's redirect rule when its five-minute window ends, even if the service worker was stopped in the meantime.                                                                                                                                                                                                                  |
| Host `*://*.youtube.com/*`, `*://*.instagram.com/*`, `*://*.news.ycombinator.com/*` | The Blocklist a fresh install starts with. A redirect rule needs host access to its site, and an open tab on a listed site is reloaded into the Challenge when its window ends. No other sites are requested at install.                                                                                                                   |
| Optional host `*://*/*`                                                             | Requested one site at a time, only when the user adds that site on the options page and only after clicking Add, for the same redirect and reload. Chrome shows its own prompt naming the site. If the user denies it, the site is not added. Removing an added site gives the access back. Local and IP addresses can't be added.         |
| Host `http://127.0.0.1:8765/*`                                                      | AnkiConnect, a local server run by the Anki add-on on the user's own computer. It is used only when the user turns on Anki mode, to check due cards and count reviews. Nothing leaves the computer.                                                                                                                                        |

**Remote code**

- [x] No, I am not using remote code.

Evidence: all JavaScript is bundled in the zip. The bundles contain no
`eval`, `new Function`, `importScripts`, or dynamic `import()`. The only
network request goes to AnkiConnect on `127.0.0.1`.

**Data usage**, what the extension collects (Google counts data handled
only on the device):

| Category                            | Check?  | Why                                                                                                                                                                                                 |
| ----------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Personally identifiable information | No      |                                                                                                                                                                                                     |
| Health information                  | No      |                                                                                                                                                                                                     |
| Financial and payment information   | No      |                                                                                                                                                                                                     |
| Authentication information          | No      |                                                                                                                                                                                                     |
| Personal communications             | No      |                                                                                                                                                                                                     |
| Location                            | No      |                                                                                                                                                                                                     |
| Web history                         | **Yes** | It keeps the user's list of sites and the end time of each site's window. A redirected visit carries the address you were headed to inside the Challenge page's URL. All of it stays on the device. |
| User activity                       | No      | Challenge answers are not recorded. Anki review counts are read and not stored.                                                                                                                     |
| Website content                     | No      |                                                                                                                                                                                                     |

**Certifications** (check all three):

- [x] I do not sell or transfer user data to third parties, outside of the approved use cases.
- [x] I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- [x] I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL**

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
No account or setup is needed. After installing, open https://www.youtube.com/. The extension redirects to its Challenge page. Pick the English meaning of each Spanish word. Ten correct answers open youtube.com for five minutes, then the site is gated again. To add a site, open the options page, type a domain such as example.com, and click Add. Chrome asks to allow access to that one site. After you allow it, visiting the site opens the Challenge. Remove it and the site opens normally. Anki mode (off by default, on the same page) needs the Anki desktop app with the AnkiConnect add-on. Without Anki, turning it on shows a prompt with a button that starts the word Challenge.
```

## 6. Submit

- [ ] Review the preview, then click "Submit for review". Choosing to
      publish manually after approval gives you control of the launch moment.
