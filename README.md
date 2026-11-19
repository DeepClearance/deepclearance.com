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
