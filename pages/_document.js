import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#f7931a" />
        <meta name="color-scheme" content="light" />
        {/* Chrome Auto Dark (Android / force-dark) inverts CSS, not images.
            prefers-color-scheme is OS dark, not this. Probe from
            https://developer.chrome.com/blog/auto-dark-theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=document.createElement("div");d.style.cssText="display:none;background-color:canvas;color-scheme:light";document.documentElement.appendChild(d);var c=getComputedStyle(d).backgroundColor;d.remove();if(c!=="rgb(255, 255, 255)")document.documentElement.classList.add("auto-dark");}catch(e){}})();`,
          }}
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
