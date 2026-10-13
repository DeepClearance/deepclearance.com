import { useState } from "react";
import { sendSupport } from "../lib/api";

function statusText(error) {
  if (error === "invalid_email") return "Enter a valid email so we can reply.";
  if (error === "message_required") return "Write a bit more about the issue.";
  if (error === "rate_limit") return "Too many messages from this network today. Email support@deepclearance.com.";
  if (error === "mail_unavailable" || error === "send_failed") {
    return "The form is down. Email support@deepclearance.com.";
  }
  return error || "Could not send.";
}

export default function Support() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await sendSupport({ email, message, name, company });
      setDone(true);
    } catch (err) {
      setError(statusText(err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section">
      <div className="container">
        <header className="page-head">
          <p className="page-kicker">Contact</p>
          <h1>Support</h1>
          <p className="page-lede">
            Billing, keys, and checkout. Private. We reply by email.
          </p>
        </header>

        {done ? (
          <p className="intel-status">Sent. Check your email for the reply.</p>
        ) : (
          <form className="support-form" onSubmit={onSubmit}>
            <label htmlFor="support-email">Email</label>
            <input
              id="support-email"
              className="intel-input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="support-name">Name (optional)</label>
            <input
              id="support-name"
              className="intel-input"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <label className="support-hp" htmlFor="support-company">
              Company
            </label>
            <input
              id="support-company"
              className="support-hp"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
            <label htmlFor="support-message">Message</label>
            <textarea
              id="support-message"
              className="intel-input intel-input--area"
              required
              minLength={8}
              maxLength={4000}
              rows={8}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error ? <p className="intel-status">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send"}
            </button>
          </form>
        )}

        <p className="intel-plan-meta">
          You can also email{" "}
          <a href="mailto:support@deepclearance.com">support@deepclearance.com</a>
          . Security reports use that address too.
        </p>
      </div>
    </section>
  );
}
