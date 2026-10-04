import { useEffect, useState } from "react";
import Link from "next/link";
import { PLANS, activeSku, isUpgradeSku } from "../lib/api";
import { usdApprox, useBtcUsd } from "../lib/btcUsd";
import IntelChrome from "../components/IntelChrome";
import { consumeSessionFromHash, fetchMe } from "../lib/auth";

function PlanCard({ plan, btcUsd, current }) {
  const [sku, setSku] = useState(plan.options[0].id);
  const opt = plan.options.find((o) => o.id === sku) || plan.options[0];
  const many = plan.options.length > 1;
  const usd = usdApprox(opt.sats, btcUsd);
  const isCurrent = current && current === sku;
  const canUpgrade = current ? isUpgradeSku(current, sku) : true;
  const cta = isCurrent
    ? "Current plan"
    : current && canUpgrade
      ? `Upgrade to ${plan.label}`
      : current && !canUpgrade
        ? "Included"
        : `Get ${plan.label}`;
  return (
    <article
      className={`intel-plan${plan.featured ? " intel-plan--featured" : ""}`}
    >
      {isCurrent ? (
        <p className="intel-plan-badge">Your plan</p>
      ) : plan.featured ? (
        <p className="intel-plan-badge">PR review + automation</p>
      ) : (
        <p className="intel-plan-badge intel-plan-badge--quiet" aria-hidden="true">
          &nbsp;
        </p>
      )}
      <h3>{plan.label}</h3>
      <p className="intel-plan-blurb">{plan.blurb}</p>
      <p className="intel-plan-price">
        <span className="intel-plan-sats">{opt.sats.toLocaleString()}</span>
        <span className="intel-plan-unit"> sats</span>
      </p>
      <p className="intel-plan-meta">
        {opt.days} days{usd ? ` · ${usd}` : ""}
      </p>
      {many ? (
        <div className="intel-plan-toggle" role="group" aria-label="Term">
          {plan.options.map((o) => (
            <button
              key={o.id}
              type="button"
              className={o.id === sku ? "is-on" : ""}
              onClick={() => setSku(o.id)}
            >
              {o.days}d
            </button>
          ))}
        </div>
      ) : (
        <div className="intel-plan-toggle intel-plan-toggle--spacer" />
      )}
      <ul className="intel-plan-list">
        {plan.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {isCurrent || (current && !canUpgrade) ? (
        <Link href="/account/" className="btn btn-secondary">
          {cta}
        </Link>
      ) : (
        <Link
          href={`/subscribe/?plan=${encodeURIComponent(sku)}`}
          className="btn btn-primary"
        >
          {cta}
        </Link>
      )}
    </article>
  );
}

export default function PricingPage() {
  const btcUsd = useBtcUsd();
  const [user, setUser] = useState(null);
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
  const current = activeSku(user);
  return (
    <IntelChrome title="Plans">
      <p className="intel-lede">
        {current
          ? "You already have a plan. Checkout will not sell you the same one again. Higher tiers are upgrades: same key, sat difference only."
          : "Trial is a week on the index, 50 queries a day. Longer plans buy more days and more queries. Same key when you upgrade."}
      </p>
      <div className="intel-plan-grid">
        {PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} btcUsd={btcUsd} current={current} />
        ))}
      </div>
    </IntelChrome>
  );
}
