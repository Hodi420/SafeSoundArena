import React, { useEffect } from 'react';

/**
 * Redirects the user automatically to the IPFS gateway for the given hash.
 * Shows a fallback link if the redirect does not work.
 */
const IPFS_HASH = 'QmNsyeQuby73SSSd6pGbkE5PXi8TwRpLgxupzRsWBXaJHA';
const GATEWAY_URL = `https://ipfs.io/ipfs/${IPFS_HASH}`;

const IpfsRedirect: React.FC = () => {
  useEffect(() => {
    window.location.href = GATEWAY_URL;
  }, []);

  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1>מעביר אותך לאתר ב-IPFS...</h1>
      <p>
        אם לא הופנית אוטומטית, <a href={GATEWAY_URL}>לחץ כאן לאתר ב-IPFS</a>
      </p>
    </div>
  );
};

export default IpfsRedirect;
