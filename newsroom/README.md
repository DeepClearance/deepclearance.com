# Deep Clearance Newsroom

The newsroom is a separate Cloudflare Worker. Its editor holds the editor key only in memory. D1 stores append-only revisions, and R2 stores content-addressed cards. The website remains on GitHub Pages, and its build reads published editions only. A saved draft or an unpublished edit cannot replace the live edition. X copy stays in the editor and revision exports.

## Deploy once

1. In the Deep Clearance Cloudflare account, create a D1 database named `deep-clearance-newsroom` and an R2 bucket named `deep-clearance-newsroom-media`. Copy `wrangler.example.toml` to `wrangler.toml` and fill in the D1 ID.
2. From this directory, use authenticated Wrangler:

   ```sh
   npx wrangler d1 execute deep-clearance-newsroom --remote --file=schema.sql
   npx wrangler deploy
   npx wrangler secret put EDITOR_TOKEN
   npx wrangler secret put BUILD_TOKEN
   npx wrangler secret put GITHUB_PUBLISH_TOKEN
   ```

   Generate two distinct random keys for the editor and build. Give the editor key to authorized publishers through the team's password manager. The GitHub publish token needs Actions write access scoped to `DeepClearance/deepclearance.com` so the Worker can dispatch `static.yml`. Keep the token in the Worker secret store.
3. In the website repository's Actions settings, add the Worker HTTPS origin as the `NEWSROOM_URL` variable and the build key as the `NEWSROOM_BUILD_TOKEN` secret. Merge the integration and verify a successful Pages deployment. If neither value is configured, the site builds using the existing repo articles. Once configured, a failed newsroom request aborts the build, leaving the last deployed site available.
4. Open the Worker origin, sign in, and save a draft. Preview it, add a source URL and an article card with alt text, then publish. The newsroom reports whether GitHub queued the update. Verify the Pages run and article URL. If dispatch failed, use **Retry site update** after checking the GitHub integration.

## Corrections and export

Open the same dispatch, add a dated correction, and publish. The URL stays the same. Saving a draft leaves the last published version live. The website includes a feed at `/dispatches/rss.xml`.

**Export revisions** saves the full article history, including unpublished edits. Keep it private. For a rebuild, also take a D1 SQL export and back up the original R2 objects with their exact keys and content types. Restore the SQL into an empty D1 database, restore those objects to R2, then point the Worker at both restored bindings. Rotate credentials separately from the backup. The Git repository contains the editor, schema, Worker and website integration.
