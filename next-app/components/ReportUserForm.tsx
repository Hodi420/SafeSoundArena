import React, { useState } from 'react';

export default function ReportUserForm({ onSubmit }: { onSubmit: (data: any) => void }) {
  const [username, setUsername] = useState('');
  const [type, setType] = useState('scam');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState('');

  return (
    <form
      className="bg-white p-4 rounded shadow max-w-md mx-auto"
      onSubmit={e => {
        e.preventDefault();
        onSubmit({ username, type, description, evidence: evidence.split(',').map(s => s.trim()) });
      }}
    >
      <h2 className="text-xl font-bold mb-2">דיווח/המלצה על משתמש</h2>
      <label className="block mb-2">שם משתמש
        <input value={username} onChange={e => setUsername(e.target.value)} className="border p-1 w-full" required />
      </label>
      <label className="block mb-2">סוג דיווח
        <select value={type} onChange={e => setType(e.target.value)} className="border p-1 w-full">
          <option value="scam">סקאם/רמאות</option>
          <option value="commendation">המלצה/תרומה</option>
        </select>
      </label>
      <label className="block mb-2">תיאור
        <textarea value={description} onChange={e => setDescription(e.target.value)} className="border p-1 w-full" required />
      </label>
      <label className="block mb-2">הוכחות (קישורים, מופרדים בפסיק)
        <input value={evidence} onChange={e => setEvidence(e.target.value)} className="border p-1 w-full" />
      </label>
      <button className="bg-blue-600 text-white px-4 py-2 rounded mt-2" type="submit">שלח</button>
    </form>
  );
}
