import { Html, Head, Main, NextScript } from 'next/document';

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
        <script src="https://sdk.minepi.com/pi-sdk.js"></script>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
