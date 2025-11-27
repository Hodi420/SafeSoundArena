import Layout from '../components/Layout';
import { useState } from 'react';

const LICENSE_SERVER = process.env.NEXT_PUBLIC_LICENSE_URL || 'http://localhost:3010';

export default function LicensePage() {
  const [key, setKey] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function verify() {
    setLoading(true);
    setResult(null);
    try {
      const r = await fetch(`${LICENSE_SERVER}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey: key, systemInfo: { app: 'safesoundarena' } }),
      });
      const data = await r.json();
      setResult(data);
    } catch (e) {
      setResult({ error: 'Request failed' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">License Verification</h1>
      <div className="flex gap-2">
        <input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Enter license key"
          className="flex-1 border rounded px-3 py-2"
        />
        <button className="px-3 py-2 rounded-md border" onClick={verify} disabled={loading || !key}>
          Verify
        </button>
      </div>
      <pre className="mt-4 text-xs bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    </Layout>
  );
}
