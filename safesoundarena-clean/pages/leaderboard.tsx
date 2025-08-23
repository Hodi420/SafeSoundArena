import { useEffect, useState } from 'react';
import Layout from '../components/Layout';

type Row = { rank: number; username: string; avatar: string; score: number };

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function LeaderboardPage() {
  const [type, setType] = useState<'overall' | 'scam_detection' | 'community_impact'>('overall');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/leaderboard/${type}`)
      .then(r => r.json())
      .then(setRows)
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [type]);

  return (
    <Layout>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <select value={type} onChange={e => setType(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
          <option value="overall">Overall</option>
          <option value="scam_detection">Scam Detection</option>
          <option value="community_impact">Community Impact</option>
        </select>
      </div>
      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="text-left p-3">Rank</th>
              <th className="text-left p-3">User</th>
              <th className="text-right p-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} className="p-3 text-center">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={3} className="p-3 text-center">No data</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.rank}-${r.username}`} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3">{r.rank}</td>
                  <td className="p-3 flex items-center gap-2">
                    <img src={r.avatar} className="w-6 h-6 rounded-full" alt="avatar" />
                    <span>{r.username}</span>
                  </td>
                  <td className="p-3 text-right font-medium">{r.score}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}


