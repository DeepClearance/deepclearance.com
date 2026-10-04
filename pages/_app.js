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
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
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
