# Deep Clearance Newsroom

The newsroom is a separate Cloudflare Worker. Its editor holds the editor key only in memory. D1 stores append-only revisions, and R2 stores content-addressed cards. The website remains on GitHub Pages, and its build reads published editions only. A saved draft or an unpublished edit cannot replace the live edition. X copy stays in the editor and revision exports.

## Deploy once

1. In the Deep Clearance Cloudflare account, create a D1 database named `deep-clearance-newsroom` and an R2 bucket named `deep-clearance-newsroom-media`. Copy `wrangler.example.toml` to `wrangler.toml` and fill in the D1 ID.
2. From this directory, use authenticated Wrangler:

   ```sh
   npx wrangler d1 execute deep-clearance-newsroom --remote --file=schema.sql
   npx wrangler deploy
   npx wrangler d1 execute deep-clearance-newsroom --remote --file=x-schema.sql
   npx wrangler secret put EDITOR_TOKENS
   npx wrangler secret put BUILD_TOKEN
   npx wrangler secret put GITHUB_PUBLISH_TOKEN
   ```

   `x-schema.sql` must be applied before deploying: sign-in rate limiting and the approval ledger use its tables. Give each editor their own random key and store only its SHA-256 in `EDITOR_TOKENS`, for example `{"josh": "<sha256 hex>", "maya": "<sha256 hex>"}` (`printf %s "$KEY" | sha256sum`). Generate a separate random build key. Give the editor key to authorized publishers through the team's password manager. The GitHub publish token needs Actions write access scoped to `DeepClearance/deepclearance.com` so the Worker can dispatch `static.yml`. Keep the token in the Worker secret store.
3. In the website repository's Actions settings, add the Worker HTTPS origin as the `NEWSROOM_URL` variable and the build key as the `NEWSROOM_BUILD_TOKEN` secret. Merge the integration and verify a successful Pages deployment. If neither value is configured, the site builds using the existing repo articles. Once configured, a failed newsroom request aborts the build, leaving the last deployed site available.
4. Open the Worker origin, sign in, and save a draft. Preview it, add a source URL and an article card with alt text, then publish. The newsroom reports whether GitHub queued the update. Verify the Pages run and article URL. If dispatch failed, use **Retry site update** after checking the GitHub integration.

## Corrections and export

Open the same dispatch, add a dated correction, and publish. The URL stays the same. Saving a draft leaves the last published version live. The website includes a feed at `/dispatches/rss.xml`.

**Export revisions** saves the full article history, including unpublished edits. Keep it private. For a rebuild, also take a D1 SQL export and back up the original R2 objects with their exact keys and content types. Restore the SQL into an empty D1 database, restore those objects to R2, then point the Worker at both restored bindings. Rotate credentials separately from the backup. The Git repository contains the editor, schema, Worker and website integration.

## Direct X publishing

Create a confidential OAuth 2.0 app in the [X Developer Console](https://developer.x.com/). Authorize the Deep Clearance account with authorization-code PKCE and scopes `tweet.read tweet.write users.read media.write offline.access`, using a redirect URI registered to the operator doing the authorization. Exchange the code for tokens and use the returned refresh token as the initial secret. Set these Worker secrets before deploying the new Worker:

- `X_CLIENT_ID` and `X_CLIENT_SECRET` from the same app
- `X_REFRESH_TOKEN` from that account authorization
- `X_ACCOUNT_ID`, the numeric ID returned by X's authenticated `GET /2/users/me`
- `X_TOKEN_KEY`, 32 random bytes, base64 (`openssl rand -base64 32`)

Set `X_APPROVERS` to the people who may approve X posts (Access emails or `EDITOR_TOKENS` names). The shared `EDITOR_TOKEN`, if kept, can never approve.

**Where the refresh token lives.** X refresh tokens are single-use: each refresh returns a new one that must be saved before the next call. Options considered:
- Worker secret only: cannot be rewritten by the Worker itself without a Cloudflare API token that can edit Workers, which would give the editor host far more power than it needs, and each secret update redeploys the Worker.
- Workers KV: eventually consistent, so two isolates can read a stale, already-used token and break the connection.
- **D1, sealed (chosen):** strongly consistent like the rest of the newsroom, rotation is a single upsert, and the value is AES-256-GCM encrypted under the Worker secret `X_TOKEN_KEY`, so D1 rows and SQL exports never contain the token. Losing `X_TOKEN_KEY` only means re-authorizing; leaking a D1 export without the key reveals nothing.

To reauthorize, pause X publishing, replace `X_REFRESH_TOKEN`, run `DELETE FROM x_token` on the database, then resume.

## Approval ledger

Every website publish and every X decision is appended to the `approvals` table (deletes are blocked by a trigger): who (Access email or key name), when (UTC, shown in Paramaribo time), the exact X text and its SHA-256, the revision and the outcome. **Export approval ledger** downloads it as lines in the fleet's `holds.md` APPROVAL format. **Quality report** shows approvals as drafted, approvals after edits and rejections per day, for the first-week review.

## Access

Create a Cloudflare Access self-hosted application for the Worker's hostname, allow only named emails, and set `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` (the application's AUD tag). The Worker verifies the `Cf-Access-Jwt-Assertion` header itself. With Access in front, editors leave the key field empty. Failed sign-ins are limited to `AUTH_MAX_FAILURES` per IP per 10 minutes.

## Tests

`npm test` (Node 22.5 or newer for `node:sqlite`). Every X, Access and network call is mocked; the tests fail on any unexpected request.

Publish the Dispatch on the website with its X copy (without the canonical URL). The editor counts X weighted length, with the link counted as 23 characters, against the 280 limit. A card is optional; with one, alt text is required. Once Pages deploys that edition, choose **Review X post** and approve or reject the exact preview. The decision is written to the ledger before anything is sent. The newsroom checks the live edition and intended X account, attaches the card and alt text, and records the confirmed post ID.

One active send is permitted across the newsroom to serialize credential rotation. A definite failure can be reviewed and retried. A timeout, ambiguous response, or interrupted Worker can leave an uncertain or sending record. Pause publishing and verify the account before recovery. If a post exists, reconcile the record to `posted` with its ID. Mark it `failed` only when the operator has verified that X did not publish the post. Never clear a sending record while a request may still be active.

## Pipeline (monitor, draft, queue, post)

A cron trigger (`*/10 * * * *`) runs `pipeline/run.mjs`:

1. **Monitor.** Fetches every primary-source feed in `config/sources.json` (Federal Reserve, SEC, CFTC, OCC, CFPB, FTC, DOJ, Federal Register rules, GAO, CBO, BIS, ECB, Bank of England), and one fast lead account per run when `X_BEARER_TOKEN` is set. Lead accounts are discovery only: a post becomes a lead only if it links to an allowed primary-source domain (`primaryDomains`), and the lead is that source, never the post. Items older than `leadMaxAgeHours` are ignored.
2. **Dedup.** Same URL (tracking parameters, `www.` and trailing slash ignored) or a near-identical title within 48 hours is dropped.
3. **Draft.** Up to `draftsPerRun` new leads per run. The source is fetched and recorded (URL, HTTP status, fetch time, SHA-256 of the bytes). The model (`LLM_PROVIDER`, `LLM_MODEL`, secret `LLM_API_KEY`) returns a Dispatch and an X copy with a claim table. **Without a configured model nothing is drafted.** The prompt follows the adopted charter and writes no taglines.
4. **Guardrails.** A draft is kept only when every claim cites a fetched primary source and its quote appears verbatim in that source, no blocklisted term appears (`blocklist` plus `BLOCKLIST_JSON`), and the X post fits 280 weighted characters with its link. Failing drafts are listed as blocked with reasons and never become editions.
5. **Queue.** Passing drafts are unpublished editions with their claim and evidence table shown in the editor. An editor publishes to the website (ledger row), then a named approver uses **Review X post** to approve or reject the exact text (ledger row). Approvals that arrive while a cadence limit is hit are recorded and **scheduled**; the cron sends them when the gate opens, and only if the approved text and revision are still the live edition.
6. **Cadence gate** (`config/cadence.json`, override with `CADENCE_JSON`): `postsPerDay` (rolling 24 h), `minGapMinutes`, `maxPerHour` (never above the hard cap of 6), `quietHoursUtc` and `peakWindowsUtc` (auto only; off-peak gap x `offPeakGapMultiplier`). Defaults: 12/day, 20-minute gap, 4/hour, quiet 03-09 UTC, peaks 13-17 and 19-22 UTC, from the cadence research of 2026-11-26.
7. **Deploys** are debounced to one Pages run per `deployMinGapMinutes`.

Apply the pipeline tables once: `npx wrangler d1 execute deep-clearance-newsroom --remote --file=pipeline-schema.sql`.

### Posting mode and kill switch

- **Queue (default, and the only active mode).** Every X post needs a named approver's decision, recorded in the ledger. Per holds.md A-20261126-DC-AUTOPOST-QUEUE, Josh approves each post for the first week.
- **Automatic (built, off).** Only when **both** Worker vars are set by the owner: `POSTING_MODE = "auto"` **and** `AUTO_POSTING_ENABLED = "true"`. Any other value means queue. In auto mode the cron publishes one passing draft at a time within the daily target, waits for the edition to be live, and posts it inside the cadence gate, writing `site_publish` and `x_post` ledger rows with decision `auto`. To switch: review the Quality report, change both vars in `wrangler.toml` (or the dashboard), and `npx wrangler deploy`. To switch back, set either var back.
- **Kill switch.** Any signed-in editor can press **Stop all X posting** (stored in D1); only a named approver can resume. `POSTING_KILL_SWITCH = "on"` stops posting regardless of the button. Monitoring and drafting continue; nothing is sent, scheduled posts wait.

### Week-one quality review

**Quality report** (`/api/editor/quality`) gives per day: approved as drafted, approved after the X copy was edited (drafted text hash differs from approved text hash), rejected, automatic posts, posted. `approvalRate` = approved as drafted / all decisions. **Export approval ledger** gives the same decisions as holds.md lines.

### Cards

`CARD_RENDERER = "none"` (default) posts without a card; X shows the site's link preview. `"stub"` is a wiring placeholder that never produces an image. A real renderer implements `({ article, claims, env }) => { key, alt } | null` in `pipeline/cards.mjs`, storing its image in R2 first.
