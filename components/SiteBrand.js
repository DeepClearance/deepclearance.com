import Link from "next/link";

export default function SiteBrand({ className = "", onClick }) {
  return (
    <Link
      href="/"
      className={`site-brand${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <img
        src="/assets/logo.png"
        alt="Deep Clearance"
        className="site-brand__img site-brand__img--light"
        width={608}
        height={608}
      />
      <img
        src="/assets/logo-white.png"
        alt=""
        className="site-brand__img site-brand__img--forced-dark"
        width={608}
        height={608}
        aria-hidden="true"
      />
    </Link>
  );
}
