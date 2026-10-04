import SignetNotice from "./SignetNotice";
import IntelSubnav from "./IntelSubnav";

export default function IntelChrome({
  title,
  kicker = "Deep Clearance",
  lede,
  heading = true,
  children,
}) {
  return (
    <section className="section intel-page">
      <div className="container">
        <p className="fund-kicker">{kicker}</p>
        <IntelSubnav />
        {heading ? (
          <>
            <h1>{title}</h1>
            {lede ? <p className="intel-lede">{lede}</p> : null}
          </>
        ) : null}
        <SignetNotice />
        {children}
      </div>
    </section>
  );
}
