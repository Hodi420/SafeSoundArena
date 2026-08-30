// Centralized SDK loader for all external scripts
import Script from 'next/script';

export default function ExternalSDKs() {
  return (
    <>
      {/* Pi Network SDK - DISABLED for Brave browser testing */}
      {/* Uncomment when Pi SDK Brave compatibility is confirmed
      <Script
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          if (window.Pi) {
            window.Pi.init({ version: "2.0" });
          }
        }}
      />
      */}
      {/* Add more SDKs below as needed */}
      {/* Example:
      <Script src="https://example.com/other-sdk.js" strategy="afterInteractive" />
      */}
    </>
  );
}
