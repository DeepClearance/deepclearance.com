import Head from "next/head";
import { useRouter } from "next/router";
import { PLANS } from "../lib/api";
import { HOMEPAGE_FAQ } from "../lib/methodologyContent";
import {
  OG_IMAGE,
  ORG_LOGO,
  SITE_NAME,
  SITE_ORIGIN,
  DEFAULT_DESCRIPTION,
  pageMeta,
} from "../lib/pageMeta";

function btcFromSats(sats) {
  const whole = Math.floor(sats / 100_000_000);
  const frac = String(sats % 100_000_000)
    .padStart(8, "0")
    .replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : String(whole);
}

export default function SiteHead() {
  const router = useRouter();
  const meta = pageMeta(router.pathname);
  const path = (router.pathname || "/").replace(/\/$/, "") || "/";
  const shareTitle = meta.shareTitle || meta.title;
  const shareDescription = meta.shareDescription || meta.description;
  const orgId = `${SITE_ORIGIN}/#organization`;
  const siteId = `${SITE_ORIGIN}/#website`;
  const graph = [
    {
      "@type": "Organization",
      "@id": orgId,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: ORG_LOGO,
      sameAs: ["https://github.com/DeepClearance"],
    },
    {
      "@type": "WebSite",
      "@id": siteId,
      name: SITE_NAME,
      url: SITE_ORIGIN,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": orgId },
    },
    {
      "@type": "WebPage",
      "@id": `${meta.url}#webpage`,
      url: meta.url,
      name: meta.title,
      description: meta.description,
      inLanguage: "en",
      isPartOf: { "@id": siteId },
    },
  ];
  if (path === "/") {
    const sats = PLANS.flatMap((plan) => plan.options.map((opt) => opt.sats));
    graph.push({
      "@type": "SoftwareApplication",
      name: "Deep Clearance",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: meta.url,
      description: meta.description,
      featureList: [
        "Stored passages with the source attached",
        "Strength and depth labels on each passage",
        "MCP connector",
        "Lightning checkout",
      ],
      offers: {
        "@type": "AggregateOffer",
        url: `${SITE_ORIGIN}/pricing/`,
        priceCurrency: "BTC",
        lowPrice: btcFromSats(Math.min(...sats)),
        highPrice: btcFromSats(Math.max(...sats)),
        offerCount: sats.length,
        availability: "https://schema.org/InStock",
      },
    });
    graph.push({
      "@type": "FAQPage",
      url: meta.url,
      mainEntity: HOMEPAGE_FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    });
  }
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": graph,
  };

  return (
    <Head>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <meta
        name="robots"
        content={meta.robots || "index, follow, max-image-preview:large, max-snippet:-1"}
      />
      <link rel="canonical" href={meta.url} />
      <link rel="sitemap" type="application/xml" href={`${SITE_ORIGIN}/sitemap.xml`} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={shareTitle} />
      <meta property="og:description" content={shareDescription} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:alt" content="Deep Clearance. The suppression is the signal." />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={shareTitle} />
      <meta name="twitter:description" content={shareDescription} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="Deep Clearance. The suppression is the signal." />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}
