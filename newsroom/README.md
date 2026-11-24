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

## Direct X publishing

Apply the separate migration from this directory:

```sh
npx wrangler d1 execute deep-clearance-newsroom --remote --file=x-schema.sql
```

Create a confidential OAuth 2.0 app in the [X Developer Console](https://developer.x.com/). Authorize the Deep Clearance account with authorization-code PKCE and scopes `tweet.read tweet.write users.read media.write offline.access`, using a redirect URI registered to the operator doing the authorization. Exchange the code for tokens and use the returned refresh token as the initial secret. Set these Worker secrets before deploying the new Worker:

- `X_CLIENT_ID` and `X_CLIENT_SECRET` from the same app
- `X_REFRESH_TOKEN` from that account authorization
- `X_ACCOUNT_ID`, the numeric ID returned by X's authenticated `GET /2/users/me`

Keep the D1 database and SQL backups private. The latest rotated refresh token is stored in `x_connection`, which is excluded from the editor's article export. To reauthorize the connection, pause X publishing, replace `X_REFRESH_TOKEN`, and clear the old `x_connection` row before resuming.

Publish the Dispatch on the website with its short X copy (without the canonical URL) and a card with alt text. Once Pages deploys that edition, choose **Review X post** and approve the exact preview. The newsroom checks the live edition and intended X account, attaches the card and alt text, and records the confirmed post ID.

One active send is permitted across the newsroom to serialize credential rotation. A definite failure can be reviewed and retried. A timeout, ambiguous response, or interrupted Worker can leave an uncertain or sending record. Pause publishing and verify the account before recovery. If a post exists, reconcile the record to `posted` with its ID. Mark it `failed` only when the operator has verified that X did not publish the post. Never clear a sending record while a request may still be active.
