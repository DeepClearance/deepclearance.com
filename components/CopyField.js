import { useState } from "react";

export default function CopyField({ value, label = "Copy", multiline = false }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1600);
    } catch {
      setDone(false);
    }
  }
  return (
    <div className={`intel-copy${multiline ? " intel-copy--block" : ""}`}>
      <code
        className={`intel-copy-value${multiline ? " intel-copy-value--block" : ""}`}
      >
        {value}
      </code>
      <button type="button" className="btn btn-secondary intel-copy-btn" onClick={copy}>
        {done ? "Copied" : label}
      </button>
    </div>
  );
}
