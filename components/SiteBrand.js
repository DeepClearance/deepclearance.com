import Link from "next/link";

export default function SiteBrand({ className = "", onClick }) {
  return (
    <Link
      href="/"
      className={`site-brand site-brand--text${className ? ` ${className}` : ""}`}
      onClick={onClick}
    >
      Deep Clearance
    </Link>
  );
}
