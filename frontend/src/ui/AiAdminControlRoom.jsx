import React, { useEffect, useMemo, useState } from 'react';

const statusLabels = {
  pending_approval: 'לאישור',
  ready: 'מוכן',
  approved: 'מאושר',
  rejected: 'נדחה',
  executed: 'נשלח',
  answered: 'נענה',
  expired: 'פג'
};

const riskLabels = {
  low: 'נמוך',
  medium: 'בינוני',
  high: 'גבוה',
  critical: 'קריטי'
};

const commandOptions = [
  'inspect_health',
  'inspect_logs',
  'task_status',
  'audit_review',
  'run_diagnostic_task',
  'request_agent_answer',
  'dispatch_agent_command',
  'run_system_task',
  'propose_incident',
  'propose_block_user',
  'propose_deploy',
  'propose_rollback'
];

const initialDraft = {
  command: 'inspect_health',
  targetType: 'root-mcp',
  targetName: 'SafeSoundArena',
  risk: 'low',
  role: 'observer',
  taskTitle: 'בדיקת מערכת',
  reason: '',
  answerRequest: 'Return requestId, error, data with a short operational answer.',
  questions: ''
};

export default function AiAdminControlRoom() {
  const [commands, setCommands] = useState([]);
  const [audit, setAudit] = useState([]);
  const [status, setStatus] = useState('pending_approval');
  const [draft, setDraft] = useState(initialDraft);
  const [simulation, setSimulation] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const adminToken = typeof window !== 'undefined' ? window.ADMIN_TOKEN || '' : '';

  const counts = useMemo(() => {
    return commands.reduce((acc, command) => {
      acc[command.status] = (acc[command.status] || 0) + 1;
      return acc;
    }, {});
  }, [commands]);

  async function api(path, options = {}) {
    const response = await fetch(`/api/admin/ai${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-token': adminToken,
        'x-admin-user': 'dashboard',
        ...(options.headers || {})
      }
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.error) {
      throw new Error(payload?.error?.message || 'Admin command API failed');
    }
    return payload?.data ?? payload;
  }

  async function load(nextStatus = status) {
    setLoading(true);
    setError('');
    try {
      const query = nextStatus === 'all' ? '' : `?status=${nextStatus}`;
      const [nextCommands, nextAudit] = await Promise.all([
        api(`/commands${query}`),
        api('/logs?limit=30')
      ]);
      setCommands(Array.isArray(nextCommands) ? nextCommands : []);
      setAudit(Array.isArray(nextAudit) ? nextAudit : []);
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת מסוף הפיקוד');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(status);
  }, [status]);

  function updateDraft(field, value) {
    setDraft(current => ({ ...current, [field]: value }));
  }

  async function createCommand(event) {
    event.preventDefault();
    const questions = draft.questions
      .split('\n')
      .map(item => item.trim())
      .filter(Boolean);
    await api('/commands', {
      method: 'POST',
      body: JSON.stringify({ ...draft, questions })
    });
    setDraft(initialDraft);
    setStatus('pending_approval');
    await load('pending_approval');
  }

  async function approve(commandId) {
    await api(`/commands/${commandId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ note: 'Approved from command center' })
    });
    await load();
  }

  async function reject(commandId) {
    await api(`/commands/${commandId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: 'Rejected from command center' })
    });
    await load();
  }

  async function dispatch(commandId) {
    await api(`/commands/${commandId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ result: { dispatched: true, source: 'dashboard' } })
    });
    await load();
  }

  async function answer(commandId) {
    const data = window.prompt('תשובה חוזרת לפקודה');
    if (!data) return;
    await api(`/commands/${commandId}/answer`, {
      method: 'POST',
      body: JSON.stringify({ data })
    });
    await load();
  }

  async function simulate(commandId) {
    const result = await api(`/commands/${commandId}/simulate`, { method: 'POST' });
    setSimulation(result);
  }

  return (
    <main dir="rtl" style={{ maxWidth: 1180, margin: '0 auto', padding: 24, color: '#151515' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28 }}>מסוף פיקוד</h1>
          <div style={{ marginTop: 8, color: '#555' }}>
            {Object.entries(counts).map(([key, value]) => `${statusLabels[key] || key}: ${value}`).join(' | ') || 'אין פקודות'}
          </div>
        </div>
        <select value={status} onChange={event => setStatus(event.target.value)} style={{ minWidth: 170, height: 36 }}>
          <option value="pending_approval">לאישור</option>
          <option value="ready">מוכן</option>
          <option value="approved">מאושר</option>
          <option value="executed">נשלח</option>
          <option value="answered">נענה</option>
          <option value="rejected">נדחה</option>
          <option value="all">הכל</option>
        </select>
      </header>

      <form onSubmit={createCommand} style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.7fr', gap: 10, alignItems: 'end' }}>
        <label>
          פקודה
          <select value={draft.command} onChange={event => updateDraft('command', event.target.value)} style={{ width: '100%', height: 36 }}>
            {commandOptions.map(command => <option key={command} value={command}>{command}</option>)}
          </select>
        </label>
        <label>
          יעד
          <select value={draft.targetType} onChange={event => updateDraft('targetType', event.target.value)} style={{ width: '100%', height: 36 }}>
            <option value="root-mcp">Root MCP</option>
            <option value="mini-mcp">Mini-MCP</option>
            <option value="agent">Agent</option>
            <option value="system">System</option>
          </select>
        </label>
        <label>
          שם יעד
          <input value={draft.targetName} onChange={event => updateDraft('targetName', event.target.value)} style={{ width: '100%', height: 32 }} />
        </label>
        <label>
          סיכון
          <select value={draft.risk} onChange={event => updateDraft('risk', event.target.value)} style={{ width: '100%', height: 36 }}>
            <option value="low">נמוך</option>
            <option value="medium">בינוני</option>
            <option value="high">גבוה</option>
            <option value="critical">קריטי</option>
          </select>
        </label>
        <label style={{ gridColumn: 'span 2' }}>
          משימה
          <input value={draft.taskTitle} onChange={event => updateDraft('taskTitle', event.target.value)} style={{ width: '100%', height: 32 }} />
        </label>
        <label style={{ gridColumn: 'span 2' }}>
          סיבת פקודה
          <input value={draft.reason} onChange={event => updateDraft('reason', event.target.value)} style={{ width: '100%', height: 32 }} />
        </label>
        <label style={{ gridColumn: 'span 2' }}>
          שאלות למענה
          <textarea value={draft.questions} onChange={event => updateDraft('questions', event.target.value)} rows={3} style={{ width: '100%' }} />
        </label>
        <label style={{ gridColumn: 'span 2' }}>
          חוזה תשובה
          <textarea value={draft.answerRequest} onChange={event => updateDraft('answerRequest', event.target.value)} rows={3} style={{ width: '100%' }} />
        </label>
        <button type="submit" style={{ gridColumn: '1 / -1', height: 38 }}>צור פקודה</button>
      </form>

      {error && <div style={{ marginTop: 16, color: '#b00020' }}>{error}</div>}

      <section style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px', gap: 16 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#efefef' }}>
                <th style={cellStyle}>סטטוס</th>
                <th style={cellStyle}>פקודה</th>
                <th style={cellStyle}>יעד</th>
                <th style={cellStyle}>סיכון</th>
                <th style={cellStyle}>משימה</th>
                <th style={cellStyle}>תשובה</th>
                <th style={cellStyle}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} style={cellStyle}>טוען...</td></tr>}
              {!loading && commands.length === 0 && <tr><td colSpan={7} style={cellStyle}>אין פקודות</td></tr>}
              {!loading && commands.map(command => (
                <tr key={command.id}>
                  <td style={cellStyle}>{statusLabels[command.status] || command.status}</td>
                  <td style={cellStyle}>{command.command}</td>
                  <td style={cellStyle}>{command.target?.type}:{command.target?.name}</td>
                  <td style={cellStyle}>{riskLabels[command.risk] || command.risk}</td>
                  <td style={cellStyle}>{command.task?.title || command.reason || '-'}</td>
                  <td style={cellStyle}>{command.answer?.data || command.result?.message || '-'}</td>
                  <td style={{ ...cellStyle, minWidth: 240 }}>
                    <button onClick={() => simulate(command.id)}>בדוק</button>
                    {command.status === 'pending_approval' && <button onClick={() => approve(command.id)}>אשר</button>}
                    {['pending_approval', 'ready', 'approved'].includes(command.status) && <button onClick={() => reject(command.id)}>דחה</button>}
                    {['ready', 'approved'].includes(command.status) && !command.forbiddenForAiExecution && <button onClick={() => dispatch(command.id)}>שלח</button>}
                    <button onClick={() => answer(command.id)}>השב</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside style={{ display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ background: '#111', color: '#f6f6f6', padding: 14, borderRadius: 6 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>ביקורת</h2>
            {audit.length === 0 && <div>אין רשומות</div>}
            {audit.slice(0, 8).map(entry => (
              <div key={entry.id} style={{ borderTop: '1px solid #333', padding: '8px 0', fontSize: 13 }}>
                <strong>{entry.event}</strong>
                <div>{entry.actor}</div>
                <div>{new Date(entry.at).toLocaleString('he-IL')}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f4f4f4', padding: 14, borderRadius: 6 }}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>תשובת בדיקה</h2>
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>
              {simulation ? JSON.stringify(simulation, null, 2) : 'אין בדיקה'}
            </pre>
          </div>
        </aside>
      </section>
    </main>
  );
}

const cellStyle = {
  border: '1px solid #ddd',
  padding: 8,
  textAlign: 'right',
  verticalAlign: 'top'
};
