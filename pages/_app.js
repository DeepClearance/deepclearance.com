import Head from "next/head";
import Layout from "../components/Layout";
import NavBar from "../components/NavBar";
import SiteHead from "../components/SiteHead";
import Footer from "../components/Footer";
import "../components/styles.css";

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <link rel="icon" href="/assets/og.svg" type="image/svg+xml" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="describedby" href="/llms.txt" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </Head>
      <SiteHead />
      <Layout>
        <NavBar />
        <Component {...pageProps} />
        <Footer />
      </Layout>
    </>
  );
}
