import { BITCOIN_NETWORK } from "../lib/api";

export default function SignetNotice() {
  const mainnet = BITCOIN_NETWORK === "mainnet" || BITCOIN_NETWORK === "bitcoin";
  if (mainnet) return null;
  return (
    <p className="network-warning" role="status">
      This checkout is not on Bitcoin mainnet. Do not send real bitcoin.
    </p>
  );
}
