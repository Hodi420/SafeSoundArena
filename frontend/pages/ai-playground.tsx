import { useMemo, useState } from 'react';

interface CandidateMeta {
  model: string;
  provider: 'local' | 'api';
  reasoning: string;
  estimatedCost: number;
  estimatedLatency: number;
  preference: 'cost' | 'quality' | 'speed';
}

interface Candidate {
  response: string | null;
  error: string | null;
  metadata: CandidateMeta;
  interactionId?: string;
}

interface CandidatesResponse {
  totalTime: number;
  candidates: Candidate[];
}

export default function AIPlayground() {
  const [prompt, setPrompt] = useState('Suggest 3 fun team rituals to improve morale.');
  const [complexity, setComplexity] = useState<'low' | 'medium' | 'high'>('low');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalTime, setTotalTime] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const apiBase = useMemo(() => {
    // Prefer env when provided, fallback to backend default port
    return (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002').replace(/\/$/, '');
  }, []);

  // Helper: read dev gate token from cookie (if set by /dev-login)
  function getDevKey() {
    if (typeof document === 'undefined') return undefined;
    return document.cookie.split('; ').find((x) => x.startsWith('dev_access='))?.split('=')[1];
  }

  async function fetchCandidates() {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setFeedbackMsg(null);
    setChosenIdx(null);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        // Optional: forward a pseudo user id for the learning engine
        'x-user-id': typeof window !== 'undefined' ? (localStorage.getItem('userId') || 'frontend-demo') : 'frontend-demo',
      };
      const devKey = getDevKey();
      if (devKey) headers['X-Dev-Key'] = devKey;

      const res = await fetch(`${apiBase}/api/ai/chat/candidates`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, complexity }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Request failed with ${res.status}`);
      }
      const data: CandidatesResponse = await res.json();
      setTotalTime(data.totalTime);
      setCandidates(data.candidates || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch candidates');
      setCandidates([]);
      setTotalTime(null);
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(index: number, sentiment: 'positive' | 'negative' | 'neutral' = 'positive') {
    const candidate = candidates[index];
    if (!candidate?.interactionId) {
      setFeedbackMsg('No interactionId on selected candidate. Only successful responses can receive feedback.');
      return;
    }
    try {
      setLoading(true);
      setFeedbackMsg(null);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const devKey = getDevKey();
      if (devKey) headers['X-Dev-Key'] = devKey;

      const res = await fetch(`${apiBase}/api/ai/chat/feedback`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ interactionId: candidate.interactionId, feedback: sentiment }),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || `Feedback failed with ${res.status}`);
      }
      setChosenIdx(index);
      setFeedbackMsg('Thank you! Your feedback was recorded.');
    } catch (e: any) {
      setFeedbackMsg(e?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  }

  function devBadge(meta: CandidateMeta) {
    if (meta.model === 'dev-fallback') {
      return (
        <span className="ml-2 inline-block px-2 py-0.5 text-[10px] font-bold rounded bg-yellow-700 text-yellow-100 border border-yellow-300">DEV FALLBACK</span>
      );
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-pink-400 mb-4">AI Candidates Playground</h1>
        <p className="text-gray-300 mb-6">Explore multiple AI candidates in parallel, compare results, and send feedback to improve routing.</p>

        {/* Controls */}
        <div className="bg-gray-900 border border-pink-700 rounded-lg p-4 mb-6">
          <label className="block text-sm text-gray-300 mb-2">Your prompt</label>
          <textarea
            className="w-full p-3 rounded bg-gray-800 border border-pink-500 text-white min-h-[90px] mb-3"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your request for the AI..."
          />

          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Complexity:</span>
              <select
                className="bg-gray-800 border border-pink-500 rounded px-2 py-1 text-sm"
                value={complexity}
                onChange={(e) => setComplexity(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex-1" />
            <button
              className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700 font-bold disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={fetchCandidates}
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate Candidates'}
            </button>
          </div>
        </div>

        {/* Status */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-500 rounded text-sm">{error}</div>
        )}
        {totalTime !== null && (
          <div className="mb-4 p-3 bg-gray-900 border border-blue-700 rounded text-sm text-blue-200">
            Total time: <span className="font-bold">{totalTime} ms</span>
          </div>
        )}

        {/* Candidates */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {candidates.map((c, idx) => (
            <div key={idx} className={`flex flex-col bg-gray-900 border rounded-lg overflow-hidden ${chosenIdx === idx ? 'border-green-500' : 'border-pink-700'}`}>
              <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                <div className="text-sm font-semibold text-pink-300">
                  {c.metadata.model}
                  {devBadge(c.metadata)}
                </div>
                <div className="text-[11px] text-gray-400">{c.metadata.provider.toUpperCase()} • {c.metadata.preference}</div>
              </div>
              <div className="p-3 text-sm text-gray-200 whitespace-pre-wrap min-h-[140px]">
                {c.response ? c.response : (
                  <span className="text-red-300">{c.error || 'No response'}</span>
                )}
              </div>
              <div className="px-3 pb-3 text-[11px] text-gray-400">
                <div>Reasoning: {c.metadata.reasoning}</div>
                <div>Est. cost: ${c.metadata.estimatedCost.toFixed(5)} • Est. latency: {c.metadata.estimatedLatency}ms</div>
                {c.interactionId && <div className="text-green-300">interactionId: {c.interactionId}</div>}
              </div>
              <div className="p-3 border-t border-gray-800 flex items-center gap-2">
                <button
                  className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-sm font-bold disabled:opacity-60"
                  onClick={() => sendFeedback(idx, 'positive')}
                  disabled={!c.interactionId || loading}
                  title={!c.interactionId ? 'Feedback works on successful responses only' : 'Mark as preferred'}
                >Choose</button>
                <button
                  className="px-3 py-1 rounded bg-yellow-700 hover:bg-yellow-800 text-sm font-bold disabled:opacity-60"
                  onClick={() => sendFeedback(idx, 'neutral')}
                  disabled={!c.interactionId || loading}
                  title={!c.interactionId ? 'Feedback works on successful responses only' : 'Mark as neutral'}
                >Neutral</button>
                <button
                  className="ml-auto px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm"
                  onClick={() => navigator.clipboard.writeText(c.response || '')}
                  disabled={!c.response}
                >Copy</button>
              </div>
            </div>
          ))}
        </div>

        {feedbackMsg && (
          <div className="mt-4 p-3 bg-gray-900 border border-green-600 rounded text-sm text-green-200">{feedbackMsg}</div>
        )}

        {/* Helper */}
        <div className="mt-8 text-xs text-gray-400">
          <div>Backend URL: <span className="text-gray-300">{apiBase}</span></div>
          <div className="mt-1">Tip: Set NEXT_PUBLIC_API_URL in your frontend env to point to your backend instance.</div>
        </div>
      </div>
    </div>
  );
}