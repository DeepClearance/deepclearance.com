import { useEffect, useState } from "react";

const CACHE_KEY = "intel_btc_usd";
const TTL_MS = 15 * 60 * 1000;

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { usd, at } = JSON.parse(raw);
    if (typeof usd !== "number" || usd <= 0) return null;
    if (Date.now() - at > TTL_MS) return null;
    return usd;
  } catch {
    return null;
  }
}

function writeCache(usd) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ usd, at: Date.now() }));
  } catch {
    /* ignore */
  }
}

async function fetchSpot() {
  const sources = [
    async () => {
      const res = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
      const data = await res.json();
      return Number(data?.data?.amount);
    },
    async () => {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd",
      );
      const data = await res.json();
      return Number(data?.bitcoin?.usd);
    },
  ];
  for (const src of sources) {
    try {
      const n = await src();
      if (Number.isFinite(n) && n > 0) return n;
    } catch {
      /* next */
    }
  }
  return null;
}

/** Live BTC/USD for display. Invoices stay in sats. Cached 15 minutes. */
export function useBtcUsd() {
  const [usd, setUsd] = useState(null);
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setUsd(cached);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const n = await fetchSpot();
      if (!cancelled && n) {
        writeCache(n);
        setUsd(n);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return usd;
}

export function usdApprox(sats, btcUsd) {
  if (!btcUsd) return "";
  const n = Math.round((sats / 100_000_000) * btcUsd);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `~$${n.toLocaleString()}`;
}
