import React, { useState } from 'react';

/**
 * UI helper for domain ownership validation (Pi Network, etc).
 * Explains how to create and upload the validation-key.txt file.
 * Optionally allows user to download a sample file for upload.
 */
export default function DomainValidationHelper({ validationKey }: { validationKey?: string }) {
  const [copied, setCopied] = useState(false);

  const sampleKey = validationKey || 'YOUR_VALIDATION_KEY_HERE';
  const fileContent = sampleKey + '\n';

  const handleDownload = () => {
    const blob = new Blob([fileContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'validation-key.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(sampleKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{border: '1px solid #bbb', borderRadius: 8, padding: 20, margin: '32px auto', maxWidth: 500, background: '#fafafa'}}>
      <h2>Domain Ownership Validation</h2>
      <ol>
        <li>Copy the validation key below:</li>
        <pre style={{background: '#eee', padding: 8, borderRadius: 4, userSelect: 'all'}}>{sampleKey}</pre>
        <button onClick={handleCopy} style={{marginBottom: 12}}>{copied ? 'Copied!' : 'Copy to Clipboard'}</button>
        <li>Create a file named <b>validation-key.txt</b> and paste the key inside.</li>
        <li>Upload <b>validation-key.txt</b> to the root of your hosting domain (e.g., <code>https://yourdomain.com/validation-key.txt</code>).</li>
        <li>Click below to download a sample file:</li>
        <button onClick={handleDownload}>Download validation-key.txt</button>
      </ol>
      <p style={{fontSize: 13, color: '#888'}}>Required for Pi Network and other platforms to verify domain ownership.</p>
    </div>
  );
}
