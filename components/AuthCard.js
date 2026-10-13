import Link from "next/link";
import { githubLoginUrl } from "../lib/auth";

export default function AuthCard({
  title = "Sign in",
  returnPath = "/account/",
  onNostr,
  error,
  busy = false,
}) {
  return (
    <div className="auth-card">
      {title ? <h3 className="auth-card__title">{title}</h3> : null}
      <a
        className="btn btn-primary auth-card__btn"
        href={githubLoginUrl(returnPath)}
      >
        <svg
          className="auth-card__icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          aria-hidden="true"
        >
          <path
            fill="currentColor"
            d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.23c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.82.58A12.01 12.01 0 0 0 24 12c0-6.63-5.37-12-12-12z"
          />
        </svg>
        Continue with GitHub
      </a>
      <p className="auth-card__or">
        <span>or</span>
      </p>
      <button
        type="button"
        className="btn btn-secondary auth-card__btn"
        onClick={onNostr}
        disabled={busy}
      >
        Continue with Nostr
      </button>
      <p className="auth-card__hint">
        Continue means you agree to the <Link href="/terms/">Terms</Link>.
      </p>
      {error ? <p className="auth-card__error">{error}</p> : null}
    </div>
  );
}
