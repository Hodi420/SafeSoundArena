import React, { useCallback, useEffect, useMemo, useState } from 'react';

const DEFAULT_CATALOG = [
  { command: 'inspect_status', label: 'Inspect status', risk: 'low' },
  { command: 'run_diagnostic', label: 'Run diagnostic', risk: 'low' },
  { command: 'prepare_patch', label: 'Prepare patch', risk: 'low' },
  { command: 'deploy_preview', label: 'Deploy preview', risk: 'high' },
  { command: 'deploy_production', label: 'Deploy production', risk: 'critical' },
];

const DEFAULT_TARGETS = ['default', 'frontend', 'server', 'docs'];

function normalizeCatalog(catalog) {
  const source = Array.isArray(catalog) && catalog.length ? catalog : DEFAULT_CATALOG;
  return source.map((item) => {
    if (typeof item === 'string') {
      return { command: item, label: item, risk: '' };
    }

    return {
      command: item.command || item.id || item.name,
      label: item.label || item.title || item.command || item.id || item.name,
      risk: item.risk || '',
    };
  });
}

function normalizeTargets(targets) {
  const source = Array.isArray(targets) && targets.length ? targets : DEFAULT_TARGETS;
  return source.map((item) => {
    if (typeof item === 'string') {
      return { id: item, label: item };
    }

    return {
      id: item.id || item.name || item.target,
      label: item.label || item.name || item.id || item.target,
    };
  });
}

function joinApiPath(basePath, path) {
  const base = String(basePath || '/api/ai-admin').replace(/\/$/, '');
  return `${base}${path}`;
}

function shortHash(hash) {
  if (!hash) {
    return 'none';
  }
  if (hash.length <= 24) {
    return hash;
  }
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

function Badge({ children, tone }) {
  const colors = {
    neutral: ['#eef2f7', '#334155'],
    good: ['#dcfce7', '#166534'],
    warn: ['#fef3c7', '#92400e'],
    danger: ['#fee2e2', '#991b1b'],
    info: ['#dbeafe', '#1e40af'],
  };
  const [background, color] = colors[tone] || colors.neutral;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: 22,
        padding: '2px 8px',
        borderRadius: 999,
        background,
        color,
        fontSize: 12,
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

function StatusPanel({ title, children }) {
  return (
    <section
      style={{
        border: '1px solid #d8dee8',
        borderRadius: 8,
        padding: 14,
        background: '#ffffff',
      }}
    >
      <h3 style={{ margin: '0 0 10px', fontSize: 15, color: '#111827' }}>{title}</h3>
      {children}
    </section>
  );
}

function AiAdminControlRoom({
  projectName = 'Project',
  title = 'AI Control Room',
  apiBasePath = '/api/ai-admin',
  catalog,
  targets,
  adminToken,
  adminUser,
}) {
  const catalogOptions = useMemo(() => normalizeCatalog(catalog), [catalog]);
  const targetOptions = useMemo(() => normalizeTargets(targets), [targets]);
  const [commands, setCommands] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [meta, setMeta] = useState(null);
  const [auditVerify, setAuditVerify] = useState(null);
  const [policyValidation, setPolicyValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    command: catalogOptions[0]?.command || '',
    target: targetOptions[0]?.id || 'default',
    task: '',
    payload: '{}',
    risk: catalogOptions[0]?.risk || '',
  });

  useEffect(() => {
    setForm((current) => ({
      ...current,
      command: current.command || catalogOptions[0]?.command || '',
      target: current.target || targetOptions[0]?.id || 'default',
    }));
  }, [catalogOptions, targetOptions]);

  const request = useCallback(
    async (path, options) => {
      const headers = {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      };

      if (adminToken) {
        headers['x-admin-token'] = adminToken;
      }

      if (adminUser) {
        headers['x-admin-user'] = adminUser;
      }

      const response = await fetch(joinApiPath(apiBasePath, path), {
        ...options,
        headers: {
          ...headers,
          ...(options?.headers || {}),
        },
      });
      const json = await response.json();

      if (!response.ok || json.error) {
        const error = new Error(json.error?.message || 'Control room request failed.');
        error.details = json.error;
        throw error;
      }

      return json.data;
    },
    [adminToken, adminUser, apiBasePath]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setMessage('');
    try {
      const [metaData, commandsData, auditData, policyData] = await Promise.all([
        request('/meta'),
        request('/commands'),
        request('/audit/verify'),
        request('/policy/validate'),
      ]);

      setMeta(metaData);
      setCommands(commandsData.commands || []);
      setAuditVerify(auditData);
      setPolicyValidation(policyData);
      setSelectedId((current) => current || commandsData.commands?.[0]?.id || null);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedCommand = commands.find((command) => command.id === selectedId) || commands[0];

  async function createCommand(event) {
    event.preventDefault();
    setMessage('');

    let payload;
    try {
      payload = form.payload.trim() ? JSON.parse(form.payload) : {};
    } catch (error) {
      setMessage('Payload must be valid JSON.');
      return;
    }

    setLoading(true);
    try {
      const data = await request('/commands', {
        method: 'POST',
        body: JSON.stringify({
          command: form.command,
          target: form.target,
          task: form.task,
          payload,
          risk: form.risk || undefined,
        }),
      });
      await refresh();
      setSelectedId(data.command.id);
      setMessage('Command created.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function mutateCommand(commandId, action, body) {
    setLoading(true);
    setMessage('');
    try {
      await request(`/commands/${commandId}/${action}`, {
        method: 'POST',
        body: JSON.stringify(body || {}),
      });
      await refresh();
      setSelectedId(commandId);
      setMessage(`Command ${action} complete.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function answerCommand(commandId) {
    const answer = window.prompt('Answer or result JSON/text');
    if (answer === null) {
      return;
    }

    mutateCommand(commandId, 'answer', { answer });
  }

  return (
    <div
      style={{
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: '#172033',
        background: '#f6f8fb',
        minHeight: '100%',
        padding: 20,
      }}
    >
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 13, color: '#64748b', fontWeight: 700 }}>{projectName}</div>
          <h1 style={{ margin: '3px 0 0', fontSize: 28, color: '#0f172a' }}>{title}</h1>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          style={{
            minHeight: 36,
            padding: '0 14px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#0f172a',
            fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Refresh
        </button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        <StatusPanel title="Audit Chain">
          {auditVerify ? (
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div>
                <Badge tone={auditVerify.valid ? 'good' : 'danger'}>
                  {auditVerify.valid ? 'Valid' : 'Broken'}
                </Badge>
              </div>
              <div>Checked: {auditVerify.checked}</div>
              <div>Broken at: {auditVerify.brokenAt ?? 'none'}</div>
              <code style={{ wordBreak: 'break-all', color: '#475569' }}>
                {shortHash(auditVerify.latestHash)}
              </code>
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: 13 }}>Not loaded</div>
          )}
        </StatusPanel>

        <StatusPanel title="Policy Validation">
          {policyValidation ? (
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div>
                <Badge tone={policyValidation.valid ? 'good' : 'warn'}>
                  {policyValidation.valid ? 'Valid' : 'Warnings'}
                </Badge>
              </div>
              <div>Warnings: {policyValidation.warnings?.length || 0}</div>
              {(policyValidation.warnings || []).slice(0, 3).map((warning) => (
                <div key={`${warning.code}-${warning.command || warning.role}`} style={{ color: '#92400e' }}>
                  {warning.code}: {warning.command || warning.role || 'policy'}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#64748b', fontSize: 13 }}>Not loaded</div>
          )}
        </StatusPanel>

        <StatusPanel title="Authorization">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 13 }}>
            <Badge tone={meta?.adminTokenConfigured ? 'good' : 'warn'}>
              Admin token {meta?.adminTokenConfigured ? 'configured' : 'missing'}
            </Badge>
            <Badge tone={meta?.agentTokenConfigured ? 'good' : 'warn'}>
              Agent token {meta?.agentTokenConfigured ? 'configured' : 'missing'}
            </Badge>
            <Badge tone={meta?.production ? 'danger' : 'info'}>{meta?.env || 'development'}</Badge>
          </div>
        </StatusPanel>
      </div>

      {message ? (
        <div
          role="status"
          style={{
            marginBottom: 14,
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            background: '#ffffff',
            color: '#334155',
          }}
        >
          {message}
        </div>
      ) : null}

      <form
        onSubmit={createCommand}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 10,
          alignItems: 'end',
          marginBottom: 18,
          padding: 14,
          border: '1px solid #d8dee8',
          borderRadius: 8,
          background: '#ffffff',
        }}
      >
        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
          Command
          <select
            value={form.command}
            onChange={(event) => {
              const selected = catalogOptions.find((item) => item.command === event.target.value);
              setForm((current) => ({
                ...current,
                command: event.target.value,
                risk: selected?.risk || current.risk,
              }));
            }}
            style={{ minHeight: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: 8 }}
          >
            {catalogOptions.map((item) => (
              <option key={item.command} value={item.command}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
          Target
          <select
            value={form.target}
            onChange={(event) => setForm((current) => ({ ...current, target: event.target.value }))}
            style={{ minHeight: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: 8 }}
          >
            {targetOptions.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
          Risk
          <select
            value={form.risk}
            onChange={(event) => setForm((current) => ({ ...current, risk: event.target.value }))}
            style={{ minHeight: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: 8 }}
          >
            <option value="">Policy default</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>

        <label style={{ display: 'grid', gap: 5, fontSize: 13, fontWeight: 700 }}>
          Task
          <input
            value={form.task}
            onChange={(event) => setForm((current) => ({ ...current, task: event.target.value }))}
            style={{ minHeight: 36, borderRadius: 6, border: '1px solid #cbd5e1', padding: 8 }}
          />
        </label>

        <label
          style={{
            display: 'grid',
            gridColumn: '1 / -1',
            gap: 5,
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          Payload JSON
          <textarea
            value={form.payload}
            onChange={(event) => setForm((current) => ({ ...current, payload: event.target.value }))}
            rows={3}
            style={{
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              padding: 8,
              resize: 'vertical',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={loading || !form.command}
          style={{
            minHeight: 38,
            borderRadius: 6,
            border: 0,
            background: '#1f6feb',
            color: '#ffffff',
            fontWeight: 800,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          Create
        </button>
      </form>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.3fr) minmax(280px, 0.7fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <section style={{ overflowX: 'auto', border: '1px solid #d8dee8', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', minWidth: 760 }}>
            <thead>
              <tr style={{ background: '#eef2f7', textAlign: 'left' }}>
                <th style={{ padding: 10, fontSize: 12 }}>Command</th>
                <th style={{ padding: 10, fontSize: 12 }}>Risk</th>
                <th style={{ padding: 10, fontSize: 12 }}>Status</th>
                <th style={{ padding: 10, fontSize: 12 }}>Proof</th>
                <th style={{ padding: 10, fontSize: 12 }}>Flags</th>
              </tr>
            </thead>
            <tbody>
              {commands.length ? (
                commands.map((command) => (
                  <tr
                    key={command.id}
                    onClick={() => setSelectedId(command.id)}
                    style={{
                      borderTop: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      background: selectedCommand?.id === command.id ? '#f8fafc' : '#ffffff',
                    }}
                  >
                    <td style={{ padding: 10, fontWeight: 700 }}>{command.command}</td>
                    <td style={{ padding: 10 }}>{command.risk}</td>
                    <td style={{ padding: 10 }}>{command.status}</td>
                    <td style={{ padding: 10 }}>
                      <code>{shortHash(command.proofHash)}</code>
                    </td>
                    <td style={{ padding: 10 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {command.humanGated ? <Badge tone="warn">Human-gated</Badge> : null}
                        {command.forbiddenForAiExecution ? (
                          <Badge tone="danger">AI-forbidden</Badge>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 18, color: '#64748b' }}>
                    No commands yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        <aside
          style={{
            border: '1px solid #d8dee8',
            borderRadius: 8,
            background: '#ffffff',
            padding: 14,
            minWidth: 0,
          }}
        >
          <h2 style={{ margin: '0 0 12px', fontSize: 18 }}>Command Details</h2>
          {selectedCommand ? (
            <div style={{ display: 'grid', gap: 10, fontSize: 13 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <Badge tone="info">{selectedCommand.status}</Badge>
                {selectedCommand.humanGated ? <Badge tone="warn">Human-gated</Badge> : null}
                {selectedCommand.forbiddenForAiExecution ? (
                  <Badge tone="danger">AI-forbidden</Badge>
                ) : null}
              </div>
              <div>
                <strong>ID</strong>
                <div style={{ wordBreak: 'break-all' }}>{selectedCommand.id}</div>
              </div>
              <div>
                <strong>Proof hash</strong>
                <code style={{ display: 'block', wordBreak: 'break-all', marginTop: 4 }}>
                  {selectedCommand.proofHash || 'none'}
                </code>
              </div>
              <div>
                <strong>Proof version</strong>
                <div>{selectedCommand.proofVersion || 'none'}</div>
              </div>
              <div>
                <strong>Created</strong>
                <div>{selectedCommand.createdAt}</div>
              </div>
              <div>
                <strong>Updated</strong>
                <div>{selectedCommand.updatedAt}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button type="button" onClick={() => mutateCommand(selectedCommand.id, 'assess')}>
                  Assess
                </button>
                <button type="button" onClick={() => mutateCommand(selectedCommand.id, 'approve')}>
                  Approve
                </button>
                <button type="button" onClick={() => mutateCommand(selectedCommand.id, 'reject')}>
                  Reject
                </button>
                <button type="button" onClick={() => mutateCommand(selectedCommand.id, 'dispatch')}>
                  Dispatch
                </button>
                <button type="button" onClick={() => answerCommand(selectedCommand.id)}>
                  Answer
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: 10,
                  borderRadius: 6,
                  background: '#f8fafc',
                  overflowX: 'auto',
                  fontSize: 12,
                }}
              >
                {JSON.stringify(selectedCommand, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: '#64748b' }}>Select a command.</div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default AiAdminControlRoom;
