import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { PACKAGES, WORKER_ORIGIN, planBySku, activeSku, isUpgradeSku, upgradeSats, upgradeSkus } from "../lib/api";
import { usdApprox, useBtcUsd } from "../lib/btcUsd";
import AuthCard from "../components/AuthCard";
import CopyField from "../components/CopyField";
import IntelChrome from "../components/IntelChrome";
import InvoiceQr from "../components/InvoiceQr";
import {
  authFetch,
  consumeSessionFromHash,
  fetchMe,
  fetchReferral,
  loginWithNostr,
} from "../lib/auth";

function canonicalCoupon(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function checkoutStatus(error, extra = {}) {
  if (error === "unknown_coupon" || error === "invalid_coupon") {
    return "That code isn’t valid.";
  }
  if (error === "expired_coupon") return "That code has expired.";
  if (error === "coupon_used") return "You already used this code on this login.";
  if (error === "coupon_max") return "This code has no uses left.";
  if (error === "coupon required") return "Enter a coupon code.";
  if (error === "invoice_open") {
    return "You already have an unpaid invoice. Pay it or wait for it to expire.";
  }
  if (error === "already_active") {
    return `You already have ${extra.tier || "a plan"} until ${
      String(extra.expires_at || "").slice(0, 10) || "it expires"
    }. Pick an upgrade.`;
  }
  if (error === "login required") return "Sign in first.";
  if (error === "lightning disabled") {
    return "Lightning is off on this network. Do not send bitcoin.";
  }
  if (error === "use_invoice") return "This code is a discount. Create the invoice to use it.";
  if (error === "coupon_xor_referral") {
    return "Use a coupon or a referral code, not both.";
  }
  if (error === "unknown_referral") return "That referral code isn’t valid.";
  if (error === "revoked_referral") return "That referral code was revoked.";
  if (error === "self_referral") return "You can’t use your own referral code.";
  if (error === "flagged_referral") return "That referral code is disabled.";
  if (error === "not_first_purchase") {
    return "Referral discount applies to the first Lightning invoice only.";
  }
  if (error === "referral_used") return "This login already used a referral code.";
  return extra.fallback || error || "Something went wrong.";
}

function CouponBox({
  apply,
  coupon,
  busy,
  preview,
  planLabel,
  canGrant,
  discounted,
  chargeSats,
  onChange,
  onApply,
  onClear,
  label = "Coupon",
  placeholder = "Coupon code",
  inputId = "intel-coupon",
  note = "Optional. Apply to see the price before you pay.",
  signedOut = "Sign in to apply this code.",
  afterWord = "coupon",
}) {
  const code = canonicalCoupon(coupon);
  return (
    <div className="intel-coupon">
      <label className="intel-panel-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="intel-coupon-row">
        <input
          id={inputId}
          className="intel-input"
          value={coupon}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && apply && code) {
              e.preventDefault();
              onApply(code);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={Boolean(busy)}
        />
        {apply ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onApply(code)}
            disabled={Boolean(busy) || !code || Boolean(preview)}
          >
            {busy === "coupon" ? "Checking…" : preview ? "Applied" : "Apply"}
          </button>
        ) : null}
      </div>
      {preview ? (
        <p className="intel-coupon-ok">
          <span>
            {canGrant
              ? `Grants ${planLabel} · no invoice`
              : discounted
                ? `${Number(chargeSats).toLocaleString()} sats after ${afterWord}`
                : `${afterWord[0].toUpperCase()}${afterWord.slice(1)} applied`}
          </span>
          <button type="button" className="intel-coupon-clear" onClick={onClear}>
            Remove
          </button>
        </p>
      ) : apply ? (
        <p className="intel-coupon-note">{note}</p>
      ) : (
        <p className="intel-coupon-note">{signedOut}</p>
      )}
    </div>
  );
}

export default function SubscribePage() {
  const router = useRouter();
  const [pack, setPack] = useState("researcher");
  const [coupon, setCoupon] = useState("");
  const [referral, setReferral] = useState("");
  const [ownReferral, setOwnReferral] = useState("");
  const [preview, setPreview] = useState(null);
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState("");
  const [invoice, setInvoice] = useState("");
  const [swapId, setSwapId] = useState("");
  const [paid, setPaid] = useState(false);
  const [status, setStatus] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [lnNote, setLnNote] = useState("");
  const [lnOk, setLnOk] = useState(null);
  const [granted, setGranted] = useState(false);
  const autoPreviewed = useRef("");
  const btcUsd = useBtcUsd();

  function applyPaid(data) {
    setPaid(true);
    setInvoice("");
    setStatus("");
    setGranted(Boolean(data.grant));
  }

  function applyInvoice(data) {
    setPaid(false);
    setInvoice(data.invoice || "");
    setSwapId(data.swap_id || "");
    if (PACKAGES.some((p) => p.id === data.package)) setPack(data.package);
    setStatus("Waiting for payment.");
  }

  useEffect(() => {
    if (!router.isReady) return;
    if (invoice || paid) return;
    const q = String(router.query.plan || "");
    if (PACKAGES.some((p) => p.id === q)) setPack(q);
    const c = canonicalCoupon(router.query.coupon);
    if (c) setCoupon(c);
    const r = canonicalCoupon(router.query.ref);
    if (r) setReferral(r);
  }, [router.isReady, router.query.plan, router.query.coupon, router.query.ref, invoice, paid]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await consumeSessionFromHash();
      try {
        const me = await fetchMe();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setOwnReferral("");
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchReferral();
        if (!cancelled) setOwnReferral(canonicalCoupon(data.code));
      } catch {
        if (!cancelled) setOwnReferral("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${WORKER_ORIGIN}/lightning/status`);
        const data = await res.json();
        if (cancelled) return;
        if (data.enabled) {
          setLnOk(true);
          setLnNote("");
          return;
        }
        setLnOk(false);
        const reason = String(data.reason || "");
        setLnNote(
          /fixture/i.test(reason)
            ? "Lightning invoices are not available on this network."
            : reason || "Lightning invoices are not available right now.",
        );
      } catch {
        if (!cancelled) {
          setLnOk(false);
          setLnNote("Could not reach Lightning status.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await authFetch(`${WORKER_ORIGIN}/lightning/pending`);
        if (cancelled || res.status === 404) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.paid || data.key) applyPaid(data);
        else if (data.invoice) applyInvoice(data);
      } catch {
        /* none */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!swapId || paid) return undefined;
    checkSwap();
    const t = setInterval(() => {
      checkSwap();
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapId, paid]);

  async function onNostr() {
    setLoginErr("");
    try {
      await loginWithNostr();
      setUser(await fetchMe());
    } catch (err) {
      setLoginErr(err instanceof Error ? err.message : String(err));
    }
  }

  async function applyReferral(raw) {
    const code = canonicalCoupon(raw ?? referral);
    if (!user || !code) return;
    if (user.paid_lightning) {
      setStatus(checkoutStatus("not_first_purchase"));
      return;
    }
    if (ownReferral && code === ownReferral) {
      setStatus(checkoutStatus("self_referral"));
      return;
    }
    if (canonicalCoupon(coupon)) {
      setStatus(checkoutStatus("coupon_xor_referral"));
      return;
    }
    setReferral(code);
    setBusy("referral");
    setStatus("");
    try {
      const res = await authFetch(`${WORKER_ORIGIN}/lightning/invoice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          package: pack,
          referral: code,
          preview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setStatus(
          checkoutStatus(data.error, { ...data, fallback: "Could not apply referral" }),
        );
        return;
      }
      setPreview(data);
      setInvoice("");
      setSwapId("");
      setStatus("");
    } catch {
      setStatus("Could not reach the Worker.");
    } finally {
      setBusy("");
    }
  }

  async function applyCoupon(raw) {
    const code = canonicalCoupon(raw ?? coupon);
    if (!user || !code) return;
    if (canonicalCoupon(referral)) {
      setStatus(checkoutStatus("coupon_xor_referral"));
      return;
    }
    setCoupon(code);
    setBusy("coupon");
    setStatus("");
    try {
      const res = await authFetch(`${WORKER_ORIGIN}/lightning/coupon`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          coupon: code,
          package: pack,
          preview: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPreview(null);
        setStatus(checkoutStatus(data.error, { ...data, fallback: "Could not apply coupon" }));
        return;
      }
      setPreview(data);
      if (PACKAGES.some((p) => p.id === data.package)) setPack(data.package);
      setInvoice("");
      setSwapId("");
      setStatus("");
    } catch {
      setStatus("Could not reach the Worker.");
    } finally {
      setBusy("");
    }
  }

  async function startPay() {
    if (!user) return;
    setBusy("invoice");
    setStatus("");
    try {
      const grant = Boolean(preview?.grant);
      const res = await authFetch(
        `${WORKER_ORIGIN}/lightning/${grant ? "coupon" : "invoice"}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            package: pack,
            coupon: canonicalCoupon(coupon) || undefined,
            referral:
              user.paid_lightning ||
              (ownReferral && canonicalCoupon(referral) === ownReferral)
                ? undefined
                : canonicalCoupon(referral) || undefined,
          }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setStatus(
          checkoutStatus(data.error, { ...data, fallback: "Could not create invoice" }),
        );
        return;
      }
      if (data.paid || data.key || data.grant) applyPaid(data);
      else applyInvoice(data);
    } catch {
      setStatus("Could not reach the Worker.");
    } finally {
      setBusy("");
    }
  }

  async function checkSwap() {
    if (!swapId) return;
    try {
      const res = await fetch(`${WORKER_ORIGIN}/lightning/swap/${swapId}`);
      const data = await res.json();
      if (data.paid || data.key) applyPaid(data);
    } catch {
      /* next poll */
    }
  }

  useEffect(() => {
    if (!user || !router.isReady || invoice || paid) return;
    const code = canonicalCoupon(router.query.coupon);
    if (!code || autoPreviewed.current === code) return;
    autoPreviewed.current = code;
    applyCoupon(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router.isReady, router.query.coupon]);

  useEffect(() => {
    if (!user || !router.isReady || invoice || paid) return;
    if (user.paid_lightning) return;
    const code = canonicalCoupon(router.query.ref);
    if (!code || autoPreviewed.current === `ref:${code}`) return;
    if (canonicalCoupon(router.query.coupon)) return;
    if (ownReferral && code === ownReferral) {
      autoPreviewed.current = `ref:${code}`;
      setStatus(checkoutStatus("self_referral"));
      return;
    }
    autoPreviewed.current = `ref:${code}`;
    applyReferral(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router.isReady, router.query.ref, ownReferral]);

  function onCouponChange(value) {
    setCoupon(canonicalCoupon(value));
    if (preview) setPreview(null);
  }

  function clearCoupon() {
    setCoupon("");
    setPreview(null);
    setStatus("");
    autoPreviewed.current = "";
  }

  function onReferralChange(value) {
    setReferral(canonicalCoupon(value));
    if (preview) setPreview(null);
  }

  function clearReferral() {
    setReferral("");
    setPreview(null);
    setStatus("");
  }

  const { plan, opt } = planBySku(pack);
  const current = activeSku(user);
  const upgrading = Boolean(current && isUpgradeSku(current, pack));
  const blocked = Boolean(current && !upgrading && !invoice && !paid && !preview?.grant);
  const listSats =
    preview && Number.isFinite(preview.list_sats)
      ? preview.list_sats
      : upgrading
        ? upgradeSats(current, pack)
        : opt.sats;
  const chargeSats =
    preview && Number.isFinite(preview.charged_sats) ? preview.charged_sats : listSats;
  const usd = usdApprox(chargeSats, btcUsd);
  const nextUp = current ? upgradeSkus(current) : [];
  const canGrant = Boolean(preview?.grant);
  const grantLabel = (preview && preview.label) || plan.label;
  const discounted = Boolean(preview && !canGrant && listSats > chargeSats);
  const payDisabled = Boolean(busy) || (!canGrant && lnOk === false);
  const offerReferral = Boolean(user) && !user.paid_lightning;
  const couponCode = canonicalCoupon(coupon);
  const referralCode = canonicalCoupon(referral);
  const queryCoupon = canonicalCoupon(router.query.coupon);
  const queryRef = canonicalCoupon(router.query.ref);
  const couponProps = {
    coupon,
    busy,
    preview: preview && !preview.referral ? preview : null,
    planLabel: grantLabel,
    canGrant,
    discounted,
    chargeSats,
    onChange: onCouponChange,
    onApply: applyCoupon,
    onClear: clearCoupon,
    note: "Optional. Cannot combine with a referral code.",
  };
  const referralProps = {
    coupon: referral,
    busy,
    preview: preview && preview.referral ? preview : null,
    planLabel: grantLabel,
    canGrant: false,
    discounted,
    chargeSats,
    onChange: onReferralChange,
    onApply: applyReferral,
    onClear: clearReferral,
    label: "Referral",
    placeholder: "BDI-…",
    inputId: "intel-referral",
    note: "Optional. 5,000 sats off the first Lightning invoice. Cannot combine with a coupon.",
    afterWord: "referral",
  };

  return (
    <IntelChrome title="Checkout">
      <div className="intel-split">
        <article className={`intel-plan${preview ? " intel-plan--coupon" : ""}`}>
          {preview ? (
            <p className="intel-plan-badge">{canGrant ? grantLabel : "Coupon"}</p>
          ) : null}
          <h3>{canGrant ? grantLabel : plan.label}</h3>
          <p className="intel-plan-blurb">{plan.blurb}</p>
          <p className="intel-plan-price">
            {canGrant ? (
              <span className="intel-plan-sats intel-plan-sats--free">No invoice</span>
            ) : (
              <>
                {discounted ? (
                  <span className="intel-plan-was">{listSats.toLocaleString()} sats</span>
                ) : null}
                <span className="intel-plan-sats">{chargeSats.toLocaleString()}</span>
                <span className="intel-plan-unit"> sats</span>
              </>
            )}
          </p>
          <p className="intel-plan-meta">
            {opt.days} days
            {!canGrant && usd ? ` · ${usd}` : ""}
            {upgrading ? " · upgrade" : ""}
          </p>
          {plan.options.length > 1 && !invoice && !paid ? (
            <div className="intel-plan-toggle" role="group" aria-label="Term">
              {plan.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={o.id === pack ? "is-on" : ""}
                  onClick={() => {
                    setPack(o.id);
                    if (preview) setPreview(null);
                  }}
                >
                  {o.days}d
                </button>
              ))}
            </div>
          ) : null}
          {current && !invoice ? (
            <p className="intel-plan-meta">
              You have {planBySku(current).plan.label} until{" "}
              {String(user.key_expires_at || "").slice(0, 10) || "expiry"}.
            </p>
          ) : null}
          {invoice ? null : (
            <p className="intel-plan-meta">
              <Link href="/pricing/">Change plan</Link>
            </p>
          )}
        </article>
        {!user ? (
          <div className="intel-panel">
            {queryCoupon ? <CouponBox apply={false} {...couponProps} /> : null}
            {queryRef ? <CouponBox apply={false} {...referralProps} /> : null}
            <AuthCard
              title="Sign in"
              returnPath={`/subscribe/?plan=${encodeURIComponent(pack)}${
                couponCode ? `&coupon=${encodeURIComponent(couponCode)}` : ""
              }${referralCode ? `&ref=${encodeURIComponent(referralCode)}` : ""}`}
              onNostr={onNostr}
              error={loginErr}
            />
            {queryCoupon ? null : (
              <details className="intel-coupon-details">
                <summary>Have a coupon?</summary>
                <CouponBox apply={false} {...couponProps} />
              </details>
            )}
            {queryRef ? null : (
              <details className="intel-coupon-details">
                <summary>Have a referral code?</summary>
                <CouponBox apply={false} {...referralProps} />
              </details>
            )}
          </div>
        ) : paid ? (
          <div className="intel-panel intel-panel--ok">
            <h3>{granted ? "Activated" : "Paid"}</h3>
            <p>
              The key is on <Link href="/account/">Account</Link>.
            </p>
            <div className="hero-ctas intel-ctas">
              <Link href="/account/" className="btn btn-primary">
                Open Account
              </Link>
            </div>
          </div>
        ) : (
          <div className="intel-panel">
            <h3>
              {blocked
                ? "Already on this plan"
                : canGrant
                  ? "Redeem"
                  : "Pay with Lightning"}
            </h3>
            {lnNote && !canGrant ? <p className="intel-status">{lnNote}</p> : null}
            <CouponBox apply {...couponProps} />
            {offerReferral ? <CouponBox apply {...referralProps} /> : null}
            {blocked ? (
              <>
                <p>
                  The key is on <Link href="/account/">Account</Link>.
                  {nextUp.length ? " A higher plan is an upgrade, not a second copy." : ""}
                </p>
                <div className="hero-ctas intel-ctas">
                  <Link href="/account/" className="btn btn-primary">
                    Open Account
                  </Link>
                  {nextUp.length ? (
                    <Link href="/pricing/" className="btn btn-secondary">
                      See upgrades
                    </Link>
                  ) : null}
                </div>
              </>
            ) : canGrant || !invoice ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary intel-pay-btn"
                  onClick={startPay}
                  disabled={payDisabled}
                >
                  {busy === "invoice"
                    ? canGrant
                      ? "Redeeming…"
                      : "Creating invoice…"
                    : canGrant
                      ? `Redeem ${grantLabel}`
                      : upgrading
                        ? `Upgrade to ${plan.label}`
                        : "Create invoice"}
                </button>
                <p className="intel-fineprint">
                  Paying or redeeming this plan is agreeing to the{" "}
                  <Link href="/terms/">Terms</Link>.
                </p>
              </>
            ) : (
              <div className="intel-invoice">
                {preview || discounted ? (
                  <p className="intel-plan-meta">
                    {chargeSats.toLocaleString()} sats
                    {discounted ? ` · was ${listSats.toLocaleString()}` : ""}
                  </p>
                ) : null}
                <InvoiceQr value={invoice} />
                <CopyField value={invoice} label="Copy invoice" />
                <p className="intel-fineprint">
                  Paying this invoice is agreeing to the{" "}
                  <Link href="/terms/">Terms</Link>.
                </p>
              </div>
            )}
            {status ? (
              <p className="intel-status" role="status">
                {status}
              </p>
            ) : null}
          </div>
        )}
      </div>
      <p className="intel-fineprint">
        Paying or redeeming a plan is agreeing to the{" "}
        <Link href="/terms/">Terms</Link>.
      </p>
    </IntelChrome>
  );
}
