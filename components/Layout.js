export default function Layout({ children }) {
  return (
    <div className="layout-root">
      <main className="layout-main">{children}</main>
    </div>
  );
}
