# Deep Clearance

Public site for the cited search index. GitHub Pages on `deepclearance.com`.

The Worker, keys, and ingest live in the private repo `DeepClearance/deepclearance-intel`. This repository does not contain the corpus.

```bash
npm install
npm run dev
npm run export
```

Pages deploys `docs/` from `.github/workflows/static.yml`. Enable GitHub Pages on this repo (GitHub Actions source) and point DNS for `deepclearance.com` at Pages. The connector host `mcp.deepclearance.com` is the Worker, not this site.
