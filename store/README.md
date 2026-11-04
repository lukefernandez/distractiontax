# Chrome Web Store

Two listings, one folder each. Each `SUBMISSION.md` lists every dashboard
field in order, with the value to paste and the file to upload.

```
store/distractiontax/     DistractionTax: SUBMISSION.md, assets/, the upload zip
store/distractiontax-x/   DistractionTax for X: SUBMISSION.md, assets/, the upload zip
store/tools/              Chromium checks of the zips, and the asset generators
```

Build the upload zips from the repo root:

```sh
bun run package
```

That writes `store/<extension>/<extension>-v<version>.zip`, with
`manifest.json` at the archive root. Git ignores the zips. To ship an update,
bump `version` in `packages/<extension>/src/manifest.json`, then run
`bun run package`.

## Privacy policy

Both extensions share [`PRIVACY.md`](../PRIVACY.md). The policy URL is the
file on GitHub:

```text
https://github.com/lukefernandez/distractiontax/blob/main/PRIVACY.md
```

## GitHub repo description

```text
Two Chrome extensions that gate distraction behind ten Spanish words. Pass the Challenge, get five minutes. You pick the sites; no accounts, nothing leaves your browser.
```

Suggested topics: `chrome-extension`, `manifest-v3`, `spanish`,
`vocabulary`, `anki`, `focus`, `digital-wellbeing`.
