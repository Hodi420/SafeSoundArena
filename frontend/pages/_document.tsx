import { Head, Html, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <title>SafeSoundArena</title>
        <meta
          name="description"
          content="SafeSoundArena questing, guilds, AI tools, and MSHIX control surface."
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
