import React from 'react';

<<<<<<< HEAD
interface Site {
  site: string;
  type: string;
  community_score: number;
  ai_summary: string;
}

export default function SitesBoardTable({ sites }: { sites: Site[] }) {
=======
export default function SitesBoardTable({ sites }: { sites: any[] }) {
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">רשימת אתרים/קהילות</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>שם אתר</th>
            <th>סוג</th>
            <th>ציון קהילה</th>
            <th>AI סיכום</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((s, i) => (
            <tr key={i} className={s.community_score < 0 ? 'bg-red-100' : s.community_score > 0 ? 'bg-green-100' : ''}>
              <td>{s.site}</td>
              <td>{s.type}</td>
              <td>{s.community_score}</td>
              <td>{s.ai_summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
