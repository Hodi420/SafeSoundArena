import Layout from '../components/Layout';
import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function JailPage() {
  const [status, setStatus] = useState<{ active: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/jail-status`)
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-4">Jail Status</h1>
      {loading ? (
        <div>Loading…</div>
      ) : (
        <div className="p-4 rounded-md border inline-flex items-center gap-3">
          <span className={`inline-block w-3 h-3 rounded-full ${status?.active ? 'bg-red-500' : 'bg-green-500'}`} />
          <span className="font-medium">{status?.active ? 'Active' : 'Inactive'}</span>
        </div>
      )}
    </Layout>
  );
}


