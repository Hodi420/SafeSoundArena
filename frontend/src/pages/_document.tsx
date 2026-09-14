import { Html, Head, Main, NextScript } from 'next/document';
import Script from 'next/script';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Development-only: Relax CSP for Next.js hot reload */}
        {process.env.NODE_ENV === 'development' && (
          <meta
            httpEquiv="Content-Security-Policy"
            content="script-src 'self' 'unsafe-eval' 'unsafe-inline';"
          />
        )}
        <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="beforeInteractive" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
