# Store tools

Scripts that prove the store builds work and regenerate the listing assets.
They drive the real extensions in Chromium through Playwright, which is
pinned here so the extensions' own install stays dependency-free.

```sh
bun run package                # from the repo root: build both zips
cd store/tools
npm install --no-package-lock
npx playwright install chromium
npm run verify                 # core flows against the extracted store zips
npm run shots                  # store/*/assets/screenshots, 1280x800
npm run promo                  # promo tiles, from the screenshots
npm run icons                  # packages/*/src/icons, 16/32/48/128
```

Linux needs a display: the scripts start their own `Xvfb`, because
extensions do not load in headless Chromium. They use Playwright's Chromium
build, because an enterprise-managed Chrome can refuse `--load-extension`.

`verify-dtx.mjs` checks DistractionTax:

- A fresh install stores and lists the default Blocklist.
- With Anki mode off (the default), the Challenge starts directly.
- Ten correct answers grant a five-minute Access Window.
- The Anki mode page shows Off, and toggling it stores `true`.
- With Anki mode on, the Gate asks for Anki, and the Challenge stays one click away.
- A blocklisted navigation redirects to a Challenge naming the site.
- An open tab reloads into the Challenge when its window lapses.
- The Blocklist editor refuses local addresses, invalid input, duplicates,
  and subdomains a listed site already covers, without asking Chrome.
- Denying Chrome's permission prompt leaves the site off the list.
- Allowing it adds the normalized site. Its open tabs reload into the
  Challenge, and new visits redirect, even after the service worker stops.
- Removing a site lets it through, sends its open Challenge on to the site,
  and gives its host access back.
- With every site removed, no redirect rule remains.

The permission prompt is Chrome's own dialog, outside the page. The scripts
answer it with `xdotool` on the Xvfb display, so Linux also needs `xdotool`.

`verify-x.mjs` checks DistractionTax for X:

- The right sidebar is hidden.
- When X restores For You on its own, the tab switches silently to Following.
- Clicking For You or opening Explore while locked leads to the Challenge.
- Ten correct answers open both surfaces for five minutes.
- The Anki mode default and toggle behave as above.

It serves a minimal stand-in for x.com's DOM through Playwright routing.
The URL is still `https://x.com/...`, so Chrome injects the real built
content script. No screenshot comes from the stand-in.
