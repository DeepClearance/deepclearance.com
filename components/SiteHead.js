import Head from "next/head";
import { useRouter } from "next/router";
import {
  OG_IMAGE,
  ORG_LOGO,
  SITE_NAME,
  SITE_ORIGIN,
  pageMeta,
} from "../lib/pageMeta";

export default function SiteHead() {
  const router = useRouter();
  const meta = pageMeta(router.pathname);
  const path = (router.pathname || "/").replace(/\/$/, "") || "/";
  const graph = [
    {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_ORIGIN,
      logo: ORG_LOGO,
      sameAs: ["https://github.com/DeepClearance"],
    },
    {
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_ORIGIN,
    },
  ];
  if (path === "/") {
    graph.push({
      "@type": "SoftwareApplication",
      name: "Deep Clearance",
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Web",
      url: meta.url,
      description: meta.description,
      offers: {
        "@type": "Offer",
        url: `${SITE_ORIGIN}/pricing/`,
        priceCurrency: "BTC",
      },
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
      <link rel="canonical" href={meta.url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={meta.url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:alt" content={SITE_NAME} />
      <meta property="og:image:type" content="image/svg+xml" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content={SITE_NAME} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </Head>
  );
}
