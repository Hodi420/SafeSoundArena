import React from 'react';

interface User {
  username: string;
  type: string;
  community_score: number;
  badges?: string[];
  ai_summary: string;
}

export default function UserBoardTable({ users, title }: { users: User[]; title: string }) {
  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-lg font-bold mb-2">{title}</h2>
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th>שם משתמש</th>
            <th>סוג</th>
            <th>ציון קהילה</th>
            <th>תגיות</th>
            <th>AI סיכום</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={i} className={u.type === 'scammer' ? 'bg-red-100' : u.type === 'leader' ? 'bg-green-100' : ''}>
              <td>{u.username}</td>
              <td>{u.type}</td>
              <td>{u.community_score}</td>
              <td>{u.badges?.join(', ')}</td>
              <td>{u.ai_summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
