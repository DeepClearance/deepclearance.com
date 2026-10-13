import Link from "next/link";

export default function SiteBrand({ className = "", onClick, lockup = false }) {
  const lightSrc = lockup ? "/assets/lockup.png" : "/assets/logo.png";
  const darkSrc = lockup ? "/assets/lockup-white.png" : "/assets/logo-white.png";
  const width = lockup ? 1711 : 608;
  const height = lockup ? 392 : 608;
  return (
    <Link
      href="/"
      className={`site-brand${lockup ? " site-brand--lockup" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      <img
        src={lightSrc}
        alt="Deep Clearance"
        className="site-brand__img site-brand__img--light"
        width={width}
        height={height}
      />
      <img
        src={darkSrc}
        alt=""
        className="site-brand__img site-brand__img--forced-dark"
        width={width}
        height={height}
        aria-hidden="true"
      />
    </Link>
  );
}
