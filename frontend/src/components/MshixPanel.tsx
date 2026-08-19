import { useCallback, useEffect, useMemo, useState } from 'react';

type Connector = {
  id: string;
  description?: string | null;
  eventTypes: string[];
  status: string;
  deliveryCount: number;
  failureCount: number;
  lastError?: { code?: string; message?: string } | null;
};

type MshixEventRecord = {
  event: {
    id: string;
    type: string;
    source: string;
    occurredAt: string;
    execution: boolean;
    risk: string;
    payload: Record<string, unknown>;
  };
  status: string;
  completedAt?: string | null;
  deliveries: { connectorId: string; status: string; error?: { message?: string } }[];
};

type MshixMeta = {
  service: string;
  version: string;
  status: string;
  startedAt: string;
  connectorCount: number;
  connectors: Connector[];
  metrics: Record<string, number>;
  gates: {
    globalAiEnabled: boolean | null;
    lifecycleAttached: boolean;
    executionControllerAttached: boolean;
    jailProviderAttached: boolean;
  };
};

type MshixHealth = {
  status: string;
  timestamp: string;
  connectors: { id: string; status: string; details?: unknown }[];
};

type BrainStatus = {
  status: string;
  version: string;
  autoEnrich: boolean;
  storePayload: boolean;
  queueDepth: number;
  metrics: Record<string, number>;
  store?: { count?: number } | null;
  provider?: { chatModel?: string; embeddingModel?: string } | null;
};

type Props = {
  refreshIntervalMs?: number;
};

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/mshix${path}`);
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message || `MSHIX request failed (${response.status})`);
  }
  return data as T;
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function statusClass(status: string) {
  if (['ok', 'ready', 'delivered', 'accepted'].includes(status)) return 'text-emerald-300';
  if (['degraded', 'partial'].includes(status)) return 'text-amber-300';
  return 'text-rose-300';
}

export default function MshixPanel({ refreshIntervalMs = 10000 }: Props) {
  const [meta, setMeta] = useState<MshixMeta | null>(null);
  const [health, setHealth] = useState<MshixHealth | null>(null);
  const [brain, setBrain] = useState<BrainStatus | null>(null);
  const [events, setEvents] = useState<MshixEventRecord[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MshixEventRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [metaResult, healthResult, eventsResult, brainResult] = await Promise.allSettled([
        getJson<MshixMeta>('/meta'),
        getJson<MshixHealth>('/health'),
        getJson<{ events: MshixEventRecord[] }>('/events?limit=30'),
        getJson<BrainStatus>('/brain/status'),
      ]);
      if (metaResult.status === 'rejected') {
        throw metaResult.reason;
      }
      if (eventsResult.status === 'rejected') {
        throw eventsResult.reason;
      }
      setMeta(metaResult.value);
      setEvents(eventsResult.value.events || []);
      setBrain(brainResult.status === 'fulfilled' ? brainResult.value : null);
      if (healthResult.status === 'fulfilled') {
        setHealth(healthResult.value);
        setError('');
      } else {
        setHealth({ status: 'degraded', timestamp: new Date().toISOString(), connectors: [] });
        setError(healthResult.reason instanceof Error ? healthResult.reason.message : 'MSHIX health is degraded.');
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'MSHIX data could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(refresh, refreshIntervalMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refresh, refreshIntervalMs]);

  const metrics = useMemo(() => meta?.metrics || {}, [meta]);

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 text-gray-100 sm:px-6 lg:px-8">
      <header className="card flex flex-col gap-4 border-blue-500/40 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300">SafeSoundArena / exchange layer</p>
          <h1 className="mt-2 text-3xl font-bold text-white">MSHIX Control Surface</h1>
          <p className="mt-2 max-w-3xl text-sm text-gray-400">
            Read-only operational view of the event hub connecting AI governance, agents, Jail, PQS and feature activity.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold ${statusClass(health?.status || 'offline')}`}>
            {health?.status || 'offline'}
          </span>
          <button className="btn-secondary px-4 py-2 text-xs" type="button" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="rounded border border-rose-500/50 bg-rose-950/40 p-4 text-sm text-rose-200">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ['Events published', metrics.published ?? 0],
          ['Delivered', metrics.delivered ?? 0],
          ['Blocked', metrics.blocked ?? 0],
          ['Dead letters', metrics.deadLetters ?? 0],
          ['Brain memories', brain?.store?.count ?? 0],
        ].map(([label, value]) => (
          <div className="card border-gray-800" key={String(label)}>
            <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
            <p className="mt-2 text-3xl font-bold text-blue-300">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <div className="card border-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Runtime gates</h2>
              <p className="text-xs text-gray-500">Version {meta?.version || '—'}</p>
            </div>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
              Auto refresh
            </label>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-gray-800 pb-2"><dt className="text-gray-500">Global AI</dt><dd>{meta?.gates.globalAiEnabled === null ? 'not attached' : meta?.gates.globalAiEnabled ? 'enabled' : 'disabled'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-gray-800 pb-2"><dt className="text-gray-500">Agent Lifecycle</dt><dd>{meta?.gates.lifecycleAttached ? 'attached' : 'not attached'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-gray-800 pb-2"><dt className="text-gray-500">Execution Controller</dt><dd>{meta?.gates.executionControllerAttached ? 'attached' : 'not attached'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-gray-800 pb-2"><dt className="text-gray-500">Jail gate</dt><dd>{meta?.gates.jailProviderAttached ? 'attached' : 'not attached'}</dd></div>
            <div className="flex justify-between gap-4 border-b border-gray-800 pb-2"><dt className="text-gray-500">Brain Kernel</dt><dd>{brain?.status || 'offline'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Enrichment</dt><dd>{brain?.autoEnrich ? 'opt-in active' : 'observation only'}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-gray-500">Started</dt><dd>{formatDate(meta?.startedAt)}</dd></div>
          </dl>
        </div>

        <div className="card border-gray-800">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">Connectors</h2>
              <p className="text-xs text-gray-500">{meta?.connectorCount || 0} registered boundaries</p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {(meta?.connectors || []).map((connector) => (
              <div className="rounded border border-gray-800 bg-gray-950/70 p-3" key={connector.id}>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-blue-200">{connector.id}</span>
                  <span className={`text-xs ${statusClass(connector.status)}`}>{connector.status}</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">{connector.description || 'No description'}</p>
                <p className="mt-2 text-[11px] text-gray-600">{connector.eventTypes.join(' · ')}</p>
                <p className="mt-2 text-xs text-gray-400">{connector.deliveryCount} delivered · {connector.failureCount} failed</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card border-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Recent event flow</h2>
            <p className="text-xs text-gray-500">Bounded in-memory history; select an event for details.</p>
          </div>
          <span className="text-xs text-gray-500">{events.length} shown</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-gray-800 text-xs uppercase tracking-wider text-gray-500">
              <tr><th className="px-3 py-3">Type</th><th className="px-3 py-3">Source</th><th className="px-3 py-3">Mode</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">When</th></tr>
            </thead>
            <tbody>
              {events.map((record) => (
                <tr className="cursor-pointer border-b border-gray-900 hover:bg-blue-950/20" key={record.event.id} onClick={() => setSelectedEvent(record)}>
                  <td className="px-3 py-3 font-mono text-blue-200">{record.event.type}</td>
                  <td className="px-3 py-3 text-gray-400">{record.event.source}</td>
                  <td className="px-3 py-3 text-gray-400">{record.event.execution ? 'execution' : 'observe'}</td>
                  <td className={`px-3 py-3 ${statusClass(record.status)}`}>{record.status}</td>
                  <td className="px-3 py-3 text-gray-500">{formatDate(record.event.occurredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {events.length === 0 && <p className="py-8 text-center text-sm text-gray-500">No events have reached MSHIX yet.</p>}
        </div>
      </div>

      {selectedEvent && (
        <div className="card border-blue-500/40">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Event detail</h2>
            <button className="text-xs text-gray-400 hover:text-white" type="button" onClick={() => setSelectedEvent(null)}>Close</button>
          </div>
          <pre className="max-h-96 overflow-auto rounded bg-gray-950 p-4 text-xs text-blue-100">{JSON.stringify(selectedEvent, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}
