# Deep Clearance

<p align="center">
  <img src=".github/brand/DC_og_1200x630_v13_lockup.png" alt="Deep Clearance" width="640">
</p>

Understand the system. Challenge the narrative.

Public website for [deepclearance.com](https://deepclearance.com), served from GitHub Pages.

Deep Clearance is primary-source research on institutional power. Every answer comes with the source attached.

The Worker, keys, and ingest live in the private repo `DeepClearance/deepclearance-intel`. This repository does not contain the corpus.

```bash
npm install
npm run dev
npm run export
```

Pages deploys `docs/` from `.github/workflows/static.yml`. Enable GitHub Pages on this repo (GitHub Actions source) and point DNS for `deepclearance.com` at Pages. The connector host `mcp.deepclearance.com` is the Worker, not this site.

## Publishing dispatches

Add an approved story to `lib/dispatches.js` through a pull request. Set a unique
slug, the publication date (YYYY-MM-DD), headline, summary, body, and public
source links. Add the story URL to `public/sitemap.xml`. Keep the slug stable and append dated entries to `updates` for
follow-ups and corrections. Review the sources and run `npm run export` before
merging. After GitHub Pages deploys, open the story and use **Share on X** to
compose a post from the Deep Clearance account.
