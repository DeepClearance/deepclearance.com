import Link from "next/link";

export default function SiteBrand({ className = "", onClick, lockup = false }) {
  const lightSrc = lockup ? "/assets/lockup.png" : "/assets/logo.png";
  const darkSrc = lockup ? "/assets/lockup-white.png" : "/assets/logo-white.png";
  // Official Deep Clearance v13 rasters (lockup 1024x220, mark 1024x535).
  const width = 1024;
  const height = lockup ? 220 : 535;
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
