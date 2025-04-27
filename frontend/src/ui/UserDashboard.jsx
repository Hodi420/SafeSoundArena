import React, { useEffect, useState } from 'react';

export default function UserDashboard({ userId }) {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskLoading, setTaskLoading] = useState(false);
  const [notifLoading, setNotifLoading] = useState(false);
  const [error, setError] = useState('');
  // Notification email preferences UI state
  const [emailPrefs, setEmailPrefs] = useState(null);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/root/user-memory/${userId}`).then(res => res.json()),
      fetch(`/api/root/tasks/${userId}`).then(res => res.json()),
      fetch(`/api/root/notifications/${userId}`).then(res => res.json()),
    ]).then(([userData, tasksData, notifData]) => {
      setUser(userData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
      // Set email preferences for UI
      setEmailPrefs(userData?.preferences?.notificationEmails || {
        onboarding: true,
        notification: false,
        system: false,
        task: false
      });
      setLoading(false);
    }).catch(() => {
      setError('שגיאה בטעינת נתוני משתמש');
      setLoading(false);
    });
  }, [userId]);

  function handleLogout() {
    localStorage.removeItem('userId');
    window.location.reload();
  }

  async function markTaskDone(taskId) {
    setTaskLoading(true);
    await fetch(`/api/root/tasks/${userId}/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' })
    });
    const updated = await fetch(`/api/root/tasks/${userId}`).then(res => res.json());
    setTasks(updated);
    setTaskLoading(false);
  }

  async function deleteTask(taskId) {
    setTaskLoading(true);
    await fetch(`/api/root/tasks/${userId}/${taskId}`, { method: 'DELETE' });
    const updated = await fetch(`/api/root/tasks/${userId}`).then(res => res.json());
    setTasks(updated);
    setTaskLoading(false);
  }

  async function markNotifRead(notifId) {
    setNotifLoading(true);
    await fetch(`/api/root/notifications/${userId}/${notifId}/read`, { method: 'PUT' });
    const updated = await fetch(`/api/root/notifications/${userId}`).then(res => res.json());
    setNotifications(updated);
    setNotifLoading(false);
  }

  if (loading) return <div>טוען נתונים...</div>;
  if (error) return <div>{error}</div>;
  if (!user) return <div>משתמש לא נמצא</div>;
  return (
    <div style={{ maxWidth: 600, margin: 'auto', background: '#fafafa', padding: 24, borderRadius: 8 }}>
      <h2>ברוך הבא, {user.name || userId}!</h2>
      <div>אימייל: {user.email}</div>
      <div style={{ marginTop: 24, background: '#e7f3ff', padding: 16, borderRadius: 8 }}>
        <h3>העדפות קבלת מיילים</h3>
        {emailPrefs && (
          <form onSubmit={async e => {
            e.preventDefault();
            setPrefsSaving(true); setPrefsSaved(false); setPrefsError('');
            try {
              const res = await fetch(`/api/root/user-email-preferences/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailPrefs)
              });
              const data = await res.json();
              if (data.ok) setPrefsSaved(true);
              else setPrefsError('שגיאה בשמירת העדפות');
            } catch {
              setPrefsError('שגיאה בשמירת העדפות');
            }
            setPrefsSaving(false);
          }}>
            <label style={{ display: 'block', margin: 4 }}>
              <input type="checkbox" checked={emailPrefs.onboarding}
                disabled
                onChange={e => setEmailPrefs(p => ({ ...p, onboarding: true }))} />
              קבל מייל בהרשמה (חובה)
            </label>
            <label style={{ display: 'block', margin: 4 }}>
              <input type="checkbox" checked={emailPrefs.notification}
                onChange={e => setEmailPrefs(p => ({ ...p, notification: e.target.checked }))} />
              קבל מייל על התראות
            </label>
            <label style={{ display: 'block', margin: 4 }}>
              <input type="checkbox" checked={emailPrefs.system}
                onChange={e => setEmailPrefs(p => ({ ...p, system: e.target.checked }))} />
              קבל מייל על הודעות מערכת
            </label>
            <label style={{ display: 'block', margin: 4 }}>
              <input type="checkbox" checked={emailPrefs.task}
                onChange={e => setEmailPrefs(p => ({ ...p, task: e.target.checked }))} />
              קבל מייל על משימות
            </label>
            <button type="submit" disabled={prefsSaving} style={{ marginTop: 8 }}>שמור העדפות</button>
            {prefsSaving && <span style={{ marginRight: 8 }}>שומר...</span>}
            {prefsSaved && <span style={{ color: 'green', marginRight: 8 }}>העדפות נשמרו!</span>}
            {prefsError && <span style={{ color: 'red', marginRight: 8 }}>{prefsError}</span>}
          </form>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>משימות שלי</h3>
        {taskLoading ? <div>טוען משימות...</div> : (
          <ul>
            {tasks.length === 0 && <li>אין משימות</li>}
            {tasks.map(task => (
              <li key={task._id} style={{ marginBottom: 8 }}>
                <b>{task.title}</b> ({task.status})
                {task.agentId && <> | Agent: {task.agentId}</>}
                {task.status !== 'done' && (
                  <button style={{ marginRight: 8 }} onClick={() => markTaskDone(task._id)}>סמן כבוצע</button>
                )}
                <button style={{ marginRight: 8 }} onClick={() => deleteTask(task._id)}>מחק</button>
                {task.description && <div style={{ fontSize: 12, color: '#555' }}>{task.description}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>התראות</h3>
        {notifLoading ? <div>טוען התראות...</div> : (
          <ul>
            {notifications.length === 0 && <li>אין התראות</li>}
            {notifications.map(notif => (
              <li key={notif._id} style={{ marginBottom: 8, background: notif.read ? '#e0ffe0' : '#fff7e0', padding: 8, borderRadius: 4 }}>
                <b>{notif.type}</b>: {notif.message}
                {!notif.read && (
                  <button style={{ marginRight: 8 }} onClick={() => markNotifRead(notif._id)}>סמן כנקראה</button>
                )}
                <span style={{ float: 'left', fontSize: 10 }}>{new Date(notif.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <h3>היסטוריית פעולות</h3>
        <ul>
          {(user.logs || []).map((log, i) => <li key={i}>{log}</li>)}
        </ul>
      </div>
      <button onClick={handleLogout} style={{ marginTop: 24 }}>התנתק</button>
    </div>
  );
}
