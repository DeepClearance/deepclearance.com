import { useEffect, useState } from "react";
import QRCode from "qrcode";

function qrPayload(bolt11) {
  const s = String(bolt11 || "").trim();
  if (!s) return "";
  const uri = /^lightning:/i.test(s) ? s : `lightning:${s}`;
  return uri.toUpperCase();
}

export default function InvoiceQr({ value }) {
  const [src, setSrc] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const payload = qrPayload(value);
    if (!payload) {
      setSrc("");
      setFailed(false);
      return undefined;
    }
    let cancelled = false;
    setSrc("");
    setFailed(false);
    (async () => {
      try {
        const url = await QRCode.toDataURL(payload, {
          width: 220,
          margin: 1,
          errorCorrectionLevel: "L",
          color: { dark: "#000000", light: "#ffffff" },
        });
        if (!cancelled) setSrc(url);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  if (!value) return null;
  return (
    <div className="intel-qr">
      {src ? (
        <img src={src} alt="Lightning invoice QR code" width={220} height={220} />
      ) : failed ? (
        <p className="intel-qr__fallback">QR unavailable. Copy the invoice below.</p>
      ) : (
        <p className="intel-qr__fallback">Generating QR…</p>
      )}
    </div>
  );
}
