# Privacy policy

For the Chrome extensions **DistractionTax** and **DistractionTax for X**.
Effective 2026-11-01.

Neither extension has an account, a server, analytics, or ads. Nothing either
extension handles is sent to the developer or to anyone else. What they keep
stays in your browser. If you turn on Anki mode, the extensions also talk to
Anki, which runs on your own computer.

## What DistractionTax handles

- **The list of sites.** It starts as youtube.com, instagram.com, and
  news.ycombinator.com, and you add or remove sites on the options page. Each
  site includes its subdomains. The list is kept in the extension's local
  storage.
- **Visits to the sites on its list.** When you open one of them, Chrome
  sends you to the extension's Challenge page instead. The address you were
  headed to goes along in the Challenge page's own address, so the Challenge
  can name the site and take you back after you pass. The extension does not
  store it. Chrome does not tell the extension about visits to other sites.
- **Access to the sites you add.** When you add a site, Chrome asks you to
  allow the extension access to that site. The extension uses that access
  only to send visits to the Challenge and to reload open tabs on the site.
  Removing the site gives the access back.
- **Open tabs on the sites on its list.** When a five-minute window ends, the
  extension reloads any open tab on that site so it returns to the
  Challenge. It can see the addresses of tabs on the listed sites only.
- **Access Windows.** For each listed site, the time its current five-minute
  window ends. Kept in the extension's local storage.
- **The Anki mode setting.** On or off. Kept in the extension's local storage.

## What DistractionTax for X handles

- **The state of x.com pages.** On x.com only, the extension reads which
  home-timeline tab is selected and which page you are on, and it notices
  clicks on the For You tab and the Explore link. It hides the sidebar,
  Grok, and chat with a stylesheet. It does not read posts, messages, or
  account details, and it stores nothing it reads from the page.
- **Access Windows.** The time the current five-minute window for For You
  and Explore ends. Kept in the extension's local storage.
- **The Anki mode setting.** On or off. Kept in the extension's local storage.

## What both extensions handle

- **Challenge answers** are not stored or sent anywhere.
- **Pronunciation** uses your browser's built-in speech synthesis. The
  extensions prefer a voice that runs on your device. If your system only
  offers an online voice, your browser may send the Spanish word being
  spoken to its speech service. That word comes from the extension's
  built-in word list. It is not your data.
- **Anki mode** is off by default. When you turn it on, the Challenge page
  sends requests to AnkiConnect at `http://127.0.0.1:8765`, a server the
  AnkiConnect add-on runs on your own computer. It asks Anki for permission
  once, then asks how many cards are due and how many you have reviewed
  today. It stores none of the answers, and none of this leaves your
  computer.

## Sharing

The developer receives no data from either extension, so there is nothing
to sell, share, or transfer. The use of information received by these
extensions complies with the
[Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq),
including the Limited Use requirements.

## Keeping and deleting data

Each pass overwrites the window end time for that site. Removing a site
from the list deletes its window end time. Removing an extension deletes
everything it stored.

## Changes

Changes to this policy are made in this file. Its history is the project's
git history.

## Contact

Open an issue at <https://github.com/lukefernandez/distractiontax/issues>.
