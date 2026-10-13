import { useEffect, useState } from "react";
import Link from "next/link";
import { MCP_URL, WORKER_ORIGIN, activeSku, upgradeSkus } from "../lib/api";
import { usdApprox, useBtcUsd } from "../lib/btcUsd";
import { mcpSnippets } from "../lib/mcpSnippets";
import AuthCard from "../components/AuthCard";
import CopyField from "../components/CopyField";
import IntelChrome from "../components/IntelChrome";
import {
  consumeSessionFromHash,
  fetchAccountKey,
  fetchMe,
  fetchReferral,
  loginWithNostr,
  logout,
  revokeReferral,
} from "../lib/auth";

const CONNECTOR_NAME = "Deep Clearance";

function tierLabel(tier) {
  if (tier === "developer") return "Control";
  if (tier === "trial") return "Trial";
  if (tier === "researcher") return "Researcher";
  return "";
}

function formatDate(iso) {
  const raw = String(iso || "");
  const parts = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = parts
    ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]))
    : new Date(Date.parse(raw));
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function expiryLabel(iso) {
  const date = formatDate(iso);
  if (!date) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return date;
  const left = ms - Date.now();
  if (left <= 0) return `ended ${date}`;
  const days = Math.max(1, Math.ceil(left / 86400000));
  const wait = days === 1 ? "1 day" : `${days} days`;
  return `until ${date} (${wait})`;
}

function formatTs(ms) {
  const d = new Date(Number(ms));
  if (!Number.isFinite(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function QueryBalance({ apiKey }) {
  const btcUsd = useBtcUsd();
  const [balance, setBalance] = useState(null);
  const [usage, setUsage] = useState([]);
  const [amount, setAmount] = useState("10000");
  const [invoicedSats, setInvoicedSats] = useState(0);
  const [invoice, setInvoice] = useState("");
  const [note, setNote] = useState("");
  const [paying, setPaying] = useState(false);

  async function load() {
    if (!apiKey) return;
    const [balRes, useRes] = await Promise.all([
      fetch(`${WORKER_ORIGIN}/api/balance?key=${encodeURIComponent(apiKey)}`),
      fetch(`${WORKER_ORIGIN}/api/usage?key=${encodeURIComponent(apiKey)}&limit=20`),
    ]);
    if (balRes.ok) setBalance(await balRes.json());
    else setNote("Balance is unavailable.");
    if (useRes.ok) {
      const data = await useRes.json();
      setUsage(Array.isArray(data) ? data : []);
    }
  }

  useEffect(() => {
    if (!apiKey) return undefined;
    load().catch(() => setNote("Balance is unavailable."));
    return undefined;
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !invoice) return undefined;
    const timer = setInterval(() => {
      fetch(`${WORKER_ORIGIN}/api/topup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          amount_sats: invoicedSats,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.balance_sats == null || data.invoice) return;
          setInvoice("");
          setNote("Payment confirmed.");
          load().catch(() => {});
        })
        .catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [apiKey, invoice, invoicedSats]);

  async function onTopUp(event) {
    event.preventDefault();
    if (!apiKey) return;
    setPaying(true);
    setNote("");
    try {
      const res = await fetch(`${WORKER_ORIGIN}/api/topup`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: apiKey,
          amount_sats: Math.floor(Number(amount) || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNote(data.error || "Could not start the payment.");
        return;
      }
      if (data.balance_sats != null && !data.invoice) {
        setInvoice("");
        setNote("Payment confirmed.");
        await load();
        return;
      }
      setInvoicedSats(Math.floor(Number(data.amount_sats) || Number(amount) || 0));
      setInvoice(data.invoice || "");
      setNote(data.invoice ? "Pay the invoice. This page updates when it settles." : "");
    } catch {
      setNote("Could not reach the Worker.");
    } finally {
      setPaying(false);
    }
  }

  const remaining = balance?.estimated_queries_remaining;
  const low = typeof remaining === "number" && remaining < 10;
  const usd = balance ? usdApprox(balance.balance_sats, btcUsd) : "";

  return (
    <div className="intel-panel">
      <h3>Credits</h3>
      <p className="intel-plan-blurb">
        Sats left on this key. Top up with Lightning. Each query spends sats
        after it runs.
      </p>
      {low ? (
        <p className="account-flash">
          About {remaining} queries left at the recent rate.
        </p>
      ) : null}
      <p className="intel-plan-meta">
        {balance
          ? `${Number(balance.balance_sats || 0).toLocaleString()} sats${usd ? ` (${usd})` : ""}`
          : "Loading credits."}
      </p>
      <p className="intel-plan-meta">
        {balance
          ? `About ${remaining == null ? "unknown" : remaining.toLocaleString()} queries remaining.`
          : ""}
      </p>
      <p className="intel-plan-meta">
        {balance
          ? `${Number(balance.total_sats_deposited || 0).toLocaleString()} sats deposited.`
          : ""}
      </p>
      <form className="intel-fields" onSubmit={onTopUp}>
        <label className="intel-field">
          <p className="intel-panel-label">Top up (sats)</p>
          <input
            className="intel-input"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <div className="home-ctas intel-ctas">
          <button type="submit" className="btn btn-primary" disabled={paying || !apiKey}>
            {paying ? "Starting" : "Pay with Lightning"}
          </button>
        </div>
      </form>
      {invoice ? <Field label="Invoice" value={invoice} copy="Copy invoice" /> : null}
      {note ? <p className="intel-status">{note}</p> : null}
      <h3>Recent queries</h3>
      {usage.length ? (
        <table className="account-usage">
          <thead>
            <tr>
              <th>When</th>
              <th>TypeSafe</th>
              <th>Embed misses</th>
              <th>Sats</th>
            </tr>
          </thead>
          <tbody>
            {usage.map((row) => (
              <tr key={row.ts}>
                <td>{formatTs(row.ts)}</td>
                <td>{row.typesafe_calls}</td>
                <td>{row.embed_misses}</td>
                <td>{row.sats_deducted}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="intel-plan-meta">No queries logged yet.</p>
      )}
    </div>
  );
}

function Field({ label, value, copy }) {
  return (
    <div className="intel-field">
      <p className="intel-panel-label">{label}</p>
      <CopyField value={value} label={copy} />
    </div>
  );
}

export default function AccountPage() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  const [key, setKey] = useState("");
  const [connector, setConnector] = useState(null);
  const [referral, setReferral] = useState(null);
  const [status, setStatus] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [billingKey, setBillingKey] = useState("");

  async function refresh() {
    try {
      const me = await fetchMe();
      setUser(me);
      if (me) {
        try {
          setReferral(await fetchReferral());
        } catch {
          setReferral(null);
        }
      } else {
        setReferral(null);
      }
    } catch {
      setUser(null);
      setReferral(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await consumeSessionFromHash();
      if (!cancelled) {
        await refresh();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.has_key) {
      setConnector(null);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${WORKER_ORIGIN}/oauth/connector`);
        const data = await res.json();
        if (!cancelled && data.oauth_client_id) setConnector(data);
      } catch {
        /* reveal still has the fields */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.has_key]);

  useEffect(() => {
    if (!user?.has_key || key) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAccountKey();
        if (!cancelled && data.key) setBillingKey(data.key);
      } catch {
        /* balance panel stays quiet until the key is available */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.has_key, key]);

  async function onNostr() {
    setLoginErr("");
    setBusy(true);
    try {
      await loginWithNostr();
      await refresh();
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function onReveal() {
    setStatus("");
    try {
      const data = await fetchAccountKey();
      setKey(data.key || "");
      if (data.oauth_client_id) setConnector(data);
      const until = formatDate(data.expires_at);
      setStatus(until ? `Expires ${until}` : "");
    } catch (err) {
      if (err.status === 404) {
        setStatus("No key on this profile yet.");
        return;
      }
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function onLogout() {
    await logout();
    setKey("");
    setBillingKey("");
    setConnector(null);
    setReferral(null);
    setUser(null);
    setStatus("");
  }

  function referralShareUrl(code) {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://deepclearance.com";
    return `${origin}/subscribe/?plan=trial&ref=${encodeURIComponent(code)}`;
  }

  async function onShareReferral() {
    const url = referral.code ? referralShareUrl(referral.code) : "";
    if (!url) return;
    setStatus("");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({
          title: "Deep Clearance",
          text: "5,000 sats off your first Lightning invoice.",
          url,
        });
        return;
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied.");
    } catch {
      setStatus("Copy the link below.");
    }
  }

  async function onRevokeReferral() {
    setStatus("");
    try {
      const data = await revokeReferral();
      setReferral((cur) => ({
        ...(cur || { balance_sats: 0, ledger: [] }),
        code: data.code,
      }));
      setStatus("New referral code issued.");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  }

  const label =
    user?.github_name ||
    (user?.github ? `@${user.github}` : null) ||
    user?.nostr_name ||
    (user?.nostr ? `nostr:${user.nostr.slice(0, 8)}…` : null) ||
    user?.id;
  const initial = String(label || "A")
    .replace(/^@/, "")
    .slice(0, 1)
    .toUpperCase();
  const provider = user?.github ? "GitHub" : user?.nostr ? "Nostr" : "";
  const plan = tierLabel(user?.key_tier);
  const until = expiryLabel(user?.key_expires_at);
  const canUpgrade = user?.has_key ? upgradeSkus(activeSku(user)).length > 0 : false;
  const mcpUrl = connector?.mcp || MCP_URL;
  const clientId = connector?.oauth_client_id || "";
  const clientSecret = connector?.oauth_client_secret || "";
  const connectorName = connector?.connector_name || CONNECTOR_NAME;
  const snippets = mcpSnippets({ url: mcpUrl, key });
  const title = !ready || user ? "Account" : "Sign in";
  const lede = !ready
    ? undefined
    : user
      ? user.has_key
        ? undefined
        : "Pay while signed in. The key stays on this account."
      : "GitHub or Nostr. A paid key is stored on this account.";

  return (
    <IntelChrome title={title} lede={lede}>
      {!ready ? (
        <p className="intel-status">Loading…</p>
      ) : user ? (
        <div className="intel-account">
          <header className="account-id">
            <span className="auth-session__avatar" aria-hidden="true">
              {initial}
            </span>
            <div className="auth-session__who">
              <p className="auth-session__name">{label}</p>
              <p className="auth-session__meta">{provider || "Signed in"}</p>
            </div>
            <button
              type="button"
              className="auth-session__out"
              onClick={onLogout}
            >
              Sign out
            </button>
          </header>

          <ul className="account-facts" aria-label="Plan">
            <li>
              <span className="account-facts__k">Plan</span>
              <span>{plan || "None"}</span>
            </li>
            <li>
              <span className="account-facts__k">Access</span>
              <span>
                {user.has_key ? until || "Active" : "No subscription"}
              </span>
            </li>
            <li>
              <span className="account-facts__k">
                {user.has_key ? (canUpgrade ? "Upgrade" : "Status") : "Next"}
              </span>
              {user.has_key && !canUpgrade ? (
                <span>Active</span>
              ) : (
                <Link href="/pricing/">See plans</Link>
              )}
            </li>
          </ul>

          {status ? (
            <p className="account-flash" role="status">
              {status}
            </p>
          ) : null}

          {user.has_key ? (
            <QueryBalance apiKey={key || billingKey} />
          ) : (
            <div className="intel-panel">
              <h3>Credits</h3>
              <p className="intel-plan-blurb">
                This account has no key yet. A key on the account is what the
                credit balance and the Lightning top up use.
              </p>
            </div>
          )}

          {user.has_key ? (
            <div className="intel-panel intel-panel--ok">
              <h3>Claude connector</h3>
              <p className="intel-plan-blurb">
                Claude asks for OAuth, not an API key. Settings → Connectors →
                Add custom connector, then paste these four fields.
              </p>
              {clientId ? (
                <div className="intel-fields">
                  <Field label="Name" value={connectorName} copy="Copy name" />
                  <Field label="MCP server URL" value={mcpUrl} copy="Copy URL" />
                  <Field
                    label="OAuth client ID"
                    value={clientId}
                    copy="Copy client ID"
                  />
                  <Field
                    label="OAuth client secret"
                    value={clientSecret}
                    copy="Copy secret"
                  />
                </div>
              ) : (
                <p className="intel-status">Loading connector fields…</p>
              )}
              <p className="intel-plan-meta">
                After Connect, sign in on mcp.deepclearance.com if asked, then Allow
                Claude.
              </p>
            </div>
          ) : (
            <div className="home-ctas intel-ctas">
              <Link href="/pricing/" className="btn btn-primary">
                See plans
              </Link>
            </div>
          )}

          <div className="account-secondary">
            {referral?.code ? (
              <div className="intel-panel">
                <h3>Referral</h3>
                <p className="intel-plan-blurb">
                  Send this link. First Lightning invoice gets 5,000 sats off.
                  You get 5,000 sats of referral credit when that invoice
                  settles. Cannot combine with a coupon. Credit is not
                  withdrawable.
                </p>
                <Field
                  label="Link"
                  value={referralShareUrl(referral.code)}
                  copy="Copy link"
                />
                <div className="home-ctas intel-ctas">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={onShareReferral}
                  >
                    Share
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onRevokeReferral}
                  >
                    Revoke and issue new code
                  </button>
                </div>
                <Field
                  label="Code"
                  value={referral.code}
                  copy="Copy code"
                />
                <p className="intel-plan-meta">
                  Credit {Number(referral.balance_sats || 0).toLocaleString()}{" "}
                  sats
                </p>
                {Array.isArray(referral.ledger) && referral.ledger.length ? (
                  <ul className="account-ledger">
                    {referral.ledger.slice(0, 8).map((row, i) => (
                      <li key={`${row.created_at}-${i}`}>
                        <span>
                          {row.delta_sats > 0 ? "+" : ""}
                          {Number(row.delta_sats).toLocaleString()}
                        </span>
                        <span>{row.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {user.has_key ? (
              <div className="intel-panel">
                <details className="intel-recover">
                  <summary>API key for other MCP clients</summary>
                  <p>
                    Streamable HTTP at the URL above. Send{" "}
                    <code>Authorization: Bearer</code> plus this key. Claude.ai
                    uses OAuth, not this key. A model provider key (OpenAI,
                    Anthropic) is a different secret.
                  </p>
                  <div className="home-ctas intel-ctas">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={onReveal}
                    >
                      Show API key
                    </button>
                  </div>
                  {key ? (
                    <Field label="API key" value={key} copy="Copy key" />
                  ) : (
                    <p className="intel-status">
                      Snippets below use YOUR_API_KEY until you reveal the key.
                    </p>
                  )}
                  {snippets.map((snip) => (
                    <details key={snip.id} className="intel-mcp-client">
                      <summary>
                        {snip.title}
                        <span className="intel-plan-meta"> · {snip.where}</span>
                      </summary>
                      <p>{snip.note}</p>
                      <CopyField
                        value={snip.body}
                        label="Copy config"
                        multiline
                      />
                    </details>
                  ))}
                </details>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="intel-account intel-account--guest">
          <div className="intel-panel">
            <AuthCard
              title={null}
              returnPath="/account/"
              onNostr={onNostr}
              error={loginErr}
              busy={busy}
            />
          </div>
        </div>
      )}
      <p className="intel-fineprint">
        Support: <Link href="/support/">contact form</Link>
        . Security reports use the same address,{" "}
        <a href="mailto:support@deepclearance.com">support@deepclearance.com</a>
        .
      </p>
    </IntelChrome>
  );
}
