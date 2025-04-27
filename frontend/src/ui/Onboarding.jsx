import React, { useState } from 'react';

export default function Onboarding({ onComplete }) {
  const [form, setForm] = useState({
    userId: '', name: '', email: '', password: '', agree: false,
    preferences: { theme: 'light', language: 'he', agentType: '' }
  });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (name.startsWith('preferences.')) {
      setForm(f => ({
        ...f,
        preferences: { ...f.preferences, [name.split('.')[1]]: value }
      }));
    } else if (type === 'checkbox') {
      setForm(f => ({ ...f, [name]: checked }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.userId || !form.name || !form.email || !form.password || !form.agree) {
      setMsg('יש למלא את כל שדות החובה ולאשר את התנאים');
      return;
    }
    setLoading(true);
    const res = await fetch('/api/root/user-register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    const data = await res.json();
    setLoading(false);
    if (data.ok) onComplete(form.userId);
    else setMsg(data.error || 'שגיאה בהרשמה');
  }

  return (
    <div style={{ background: '#fff', padding: 24, maxWidth: 400, margin: 'auto', borderRadius: 8 }}>
      <h2>צעדים ראשונים</h2>
      <form onSubmit={handleSubmit}>
        <input name="userId" placeholder="שם משתמש (חובה)" value={form.userId} onChange={handleChange} required />
        <input name="name" placeholder="שם מלא (חובה)" value={form.name} onChange={handleChange} required />
        <input name="email" type="email" placeholder="אימייל (חובה)" value={form.email} onChange={handleChange} required />
        <input name="password" type="password" placeholder="סיסמה (חובה)" value={form.password} onChange={handleChange} required />
        <label>
          <input type="checkbox" name="agree" checked={form.agree} onChange={handleChange} required />
          אני מסכים לתנאי השימוש והפרטיות
        </label>
        <hr />
        <h4>העדפות (רשות)</h4>
        <select name="preferences.theme" value={form.preferences.theme} onChange={handleChange}>
          <option value="light">בהיר</option>
          <option value="dark">כהה</option>
        </select>
        <select name="preferences.language" value={form.preferences.language} onChange={handleChange}>
          <option value="he">עברית</option>
          <option value="en">English</option>
        </select>
        <input name="preferences.agentType" placeholder="סוג Agent מועדף (רשות)" value={form.preferences.agentType} onChange={handleChange} />
        <button type="submit" disabled={loading}>הרשם והמשך</button>
        <div style={{ color: 'red' }}>{msg}</div>
      </form>
    </div>
  );
}
