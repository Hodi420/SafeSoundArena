import React, { useEffect, useState } from 'react';

export default function AdminDashboard({ userId }) {
  const [users, setUsers] = useState([]);
  const [hierarchy, setHierarchy] = useState(null);
  const [counts, setCounts] = useState({ users: 0, tasks: 0, agents: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [log, setLog] = useState('');
  const [status, setStatus] = useState('unknown');
  const [selfUpdateMsg, setSelfUpdateMsg] = useState('');
  // Top users by tasks
  const [topUsers, setTopUsers] = useState([]);
  const [topUsersLoading, setTopUsersLoading] = useState(true);
  const [topUsersError, setTopUsersError] = useState('');
  // Time filter for top users
  const [topUsersRange, setTopUsersRange] = useState('all');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/users', { headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } }).then(r => r.json()),
      fetch('/api/root/hierarchy').then(r => r.json()),
      fetch('/api/root/stats').then(r => r.json()),
      fetch('/api/agent/log').then(r => r.text()),
      fetch('/healthz').then(r => r.json())
    ]).then(([usersData, hierarchyData, statsData, logData, healthData]) => {
      setUsers(Array.isArray(usersData) ? usersData : []);
      setHierarchy(hierarchyData);
      setCounts(statsData);
      setLog(logData);
      setStatus(healthData.status);
      setLoading(false);
    }).catch(() => {
      setError('שגיאה בטעינת נתונים ניהוליים');
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const loadTopUsers = (range = 'all') => {
      setTopUsersLoading(true);
      fetch(`/api/root/top-users-tasks-stats?range=${range}`)
        .then(r => r.json())
        .then(data => { setTopUsers(Array.isArray(data) ? data : []); setTopUsersLoading(false); })
        .catch(() => { setTopUsersError('שגיאה בטעינת טבלת משתמשים פעילים'); setTopUsersLoading(false); });
    };
    loadTopUsers(topUsersRange);
  }, [topUsersRange]);

  async function blockUser(uid) {
    await fetch(`/api/admin/users/${uid}/block`, { method: 'POST', headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } });
    const updated = await fetch('/api/admin/users', { headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } }).then(r => r.json());
    setUsers(updated);
  }

  async function deleteUser(uid) {
    await fetch(`/api/admin/users/${uid}`, { method: 'DELETE', headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } });
    const updated = await fetch('/api/admin/users', { headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } }).then(r => r.json());
    setUsers(updated);
  }

  async function promoteUser(uid) {
    await fetch(`/api/admin/users/${uid}/promote`, { method: 'POST', headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } });
    const updated = await fetch('/api/admin/users', { headers: { 'x-admin-token': window.ADMIN_TOKEN || '' } }).then(r => r.json());
    setUsers(updated);
  }

  function toggleAgent() {
    fetch('/api/agent', { method: 'POST', body: JSON.stringify({ command: 'toggle_agent', confirm: true }), headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json()).then(() => window.location.reload());
  }

  function selfUpdate() {
    fetch('/api/agent/selfupdate', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(r => r.json()).then(d => setSelfUpdateMsg(d.message || d.error || 'done'));
  }

  if (loading) return <div>טוען נתונים ניהוליים...</div>;
  if (error) return <div>{error}</div>;
  return (
    <div style={{ maxWidth: 800, margin: 'auto', background: '#f5f5f5', padding: 24, borderRadius: 8 }}>
      <h2>דשבורד ניהולי</h2>
      <div style={{ marginBottom: 24 }}>
        <h3>סטטיסטיקות</h3>
        <div>משתמשים: {counts.users} | משימות: {counts.tasks} | Agents: {counts.agents}</div>
        <div style={{ marginTop: 24 }}>
          <h4>טבלת המשתמשים הפעילים ביותר (ע"פ משימות)</h4>
          <div style={{ marginBottom: 8 }}>
            <label>סנן טווח זמן: </label>
            <select value={topUsersRange} onChange={e => setTopUsersRange(e.target.value)}>
              <option value="week">שבוע אחרון</option>
              <option value="month">חודש אחרון</option>
              <option value="all">הכל</option>
            </select>
            <button style={{ marginRight: 8 }} onClick={() => {
              // Export to CSV
              if (!topUsers.length) return;
              const header = ['Rank','User','Total Tasks','Completed Tasks','Success %'];
              const rows = topUsers.map((u, i) => [
                i+1,
                u.user,
                u.totalTasks,
                u.completedTasks,
                (u.totalTasks ? ((u.completedTasks/u.totalTasks*100).toFixed(1)+'%') : '-')
              ]);
              const csv = [header, ...rows].map(r => r.join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url; a.download = 'top-users-tasks.csv';
              document.body.appendChild(a); a.click();
              setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
            }}>יצא ל-CSV</button>
          </div>
          {/* Bar chart placeholder */}
          <div style={{ height: 200, background: '#f3f3f3', marginBottom: 12, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
            <span>Bar Chart (בהמשך)</span>
          </div>
          {topUsersLoading ? <div>טוען טבלה...</div> : topUsersError ? <div style={{ color: 'red' }}>{topUsersError}</div> : (
            <table style={{ width: '100%', background: '#fff', borderRadius: 6, marginTop: 8 }}>
              <thead>
                <tr>
                  <th>מיקום</th>
                  <th>משתמש (אנונימי)</th>
                  <th>סה"כ משימות</th>
                  <th>משימות שהושלמו</th>
                  <th>אחוז הצלחה</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.length === 0 && <tr><td colSpan={5}>אין נתונים</td></tr>}
                {topUsers.map((u, i) => (
                  <tr key={u.user}>
                    <td>{i + 1}</td>
                    <td>{u.user}</td>
                    <td>{u.totalTasks}</td>
                    <td>{u.completedTasks}</td>
                    <td>{u.totalTasks ? ((u.completedTasks/u.totalTasks*100).toFixed(1)+'%') : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h3>ניהול משתמשים</h3>
        <table style={{ width: '100%', background: '#fff', borderRadius: 6 }}>
          <thead><tr><th>id</th><th>שם</th><th>אימייל</th><th>סטטוס</th><th>הרשאות</th><th>פעולות</th></tr></thead>
          <tbody>
            {users.map(u => (
              <tr key={u.userId} style={{ background: u.blocked ? '#ffe0e0' : 'inherit' }}>
                <td>{u.userId}</td>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.blocked ? 'חסום' : 'פעיל'}</td>
                <td>{u.isAdmin ? 'Admin' : 'User'}</td>
                <td>
                  {!u.blocked && <button onClick={() => blockUser(u.userId)}>חסום</button>}
                  <button onClick={() => deleteUser(u.userId)}>מחק</button>
                  {!u.isAdmin && <button onClick={() => promoteUser(u.userId)}>הפוך למנהל</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginBottom: 24 }}>
        <h3>היררכיה (MCP > Mini-MCP > Agents)</h3>
        {hierarchy ? (
          <pre style={{ background: '#eee', padding: 12, borderRadius: 4 }}>{JSON.stringify(hierarchy, null, 2)}</pre>
        ) : 'לא נטען'}
      </div>
      <div style={{ marginBottom: 24 }}>
        <h3>Agent Status: {status}</h3>
        <button onClick={toggleAgent}>Toggle Agent</button>
        <button onClick={selfUpdate}>Self-Update Agent</button>
        <div>{selfUpdateMsg}</div>
        <h4>Agent Log</h4>
        <pre style={{ maxHeight: 300, overflow: 'auto', background: '#eee' }}>{log}</pre>
      </div>
    </div>
  );
}
