import React, { useState } from 'react';
import { callAI } from '../api/ai';
import { COMMON_STRINGS } from '../constants/commonStrings';
import { FONTS } from '../constants/fonts';

const BOT_AVATARS: Record<string, string> = {
  'OpenAI Chat': '🤖',
  'Echo Bot': '🦜',
  // Add more bot avatars here
};

export function AIBotAskPanel({ userId }: { userId: string }) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOutput(null);
    setBot(null);
    setShowToast(false);
    try {
      const res = await fetch('/api/ai/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input, userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setOutput(data.result);
      setBot(data.bot || null);
      setToastMsg('AI responded successfully!');
      setShowToast(true);
      setInput('');
    } catch (err: any) {
      setError(err.message || 'Unknown error');
      setToastMsg('Error: ' + (err.message || 'Unknown error'));
      setShowToast(true);
    } finally {
      setLoading(false);
      setTimeout(() => setShowToast(false), 3000);
    }
  }

  return (
    <div
      style={{
        fontFamily: FONTS.inter,
        maxWidth: 600,
        margin: '0 auto',
        padding: 24,
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
        position: 'relative',
      }}
      aria-label="AI Ask Panel"
    >
      {showToast && (
        <div
          role="alert"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: error ? '#ffcccc' : '#d1ffe0',
            color: error ? '#a00' : '#0a4',
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 600,
            zIndex: 10,
            boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
            fontSize: 15,
          }}
        >
          {toastMsg}
        </div>
      )}
      <form onSubmit={handleAsk} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={COMMON_STRINGS.search + ' or ask anything...'}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            border: '1.5px solid #bcd',
            fontSize: 17,
            outline: 'none',
            transition: 'border 0.2s',
            boxShadow: loading ? '0 0 0 2px #0070f355' : undefined,
          }}
          disabled={loading}
          required
          aria-label="Ask AI"
        />
        <button
          type="submit"
          style={{
            padding: '10px 22px',
            borderRadius: 8,
            background: loading ? '#bcd' : '#0070f3',
            color: '#fff',
            fontWeight: 700,
            fontSize: 17,
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
            display: 'flex',
            alignItems: 'center',
          }}
          disabled={loading || !input.trim()}
          aria-busy={loading}
        >
          {loading ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span className="ai-ask-spinner" style={{ width: 18, height: 18, border: '2.5px solid #fff', borderTop: '2.5px solid #0070f3', borderRadius: '50%', display: 'inline-block', animation: 'ai-spin 1s linear infinite' }} />
              {COMMON_STRINGS.loading}
            </span>
          ) : (
            'Ask'
          )}
        </button>
      </form>
      {error && <div style={{ color: '#e00', marginTop: 10, fontWeight: 500 }}>{error}</div>}
      {output && (
        <div style={{ marginTop: 28, background: '#f7fafd', borderRadius: 10, padding: 20, boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {bot && <span style={{ fontSize: 28 }}>{BOT_AVATARS[bot] || '🤖'}</span>}
            <span style={{ fontWeight: 700, color: '#0070f3', fontSize: 18 }}>
              {bot ? bot : 'AI'}
            </span>
          </div>
          <div style={{ fontSize: 17, lineHeight: 1.7, color: '#222' }}>{output}</div>
        </div>
      )}
      {/* Spinner animation */}
      <style>{`
        @keyframes ai-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
