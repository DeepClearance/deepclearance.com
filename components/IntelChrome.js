import SignetNotice from "./SignetNotice";
import IntelSubnav from "./IntelSubnav";

export default function IntelChrome({
  title,
  kicker = "Deep Clearance",
  lede,
  heading = true,
  subnav = true,
  home = false,
  children,
}) {
  return (
    <section className={`section intel-page${home ? " intel-page--home" : ""}`}>
      <div className="container">
        {kicker ? <p className="fund-kicker">{kicker}</p> : null}
        {subnav ? <IntelSubnav /> : null}
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
