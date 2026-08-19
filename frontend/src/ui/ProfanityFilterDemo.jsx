import React, { useMemo, useState } from 'react';

const blockedTerms = ['spam', 'abuse'];

export default function ProfanityFilterDemo() {
  const [input, setInput] = useState('');

  const result = useMemo(() => {
    const pattern = new RegExp(`\\b(${blockedTerms.join('|')})\\b`, 'gi');
    const isFlagged = pattern.test(input);
    const clean = input.replace(pattern, '***');
    return { isFlagged, clean };
  }, [input]);

  return (
    <div style={{ padding: '1rem', border: '1px solid #ddd', margin: '1rem 0', background: '#f9f9f9' }}>
      <h3>Text Moderation Demo</h3>
      <input
        type="text"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        style={{ width: '100%', padding: '0.5rem' }}
        placeholder="Type text to inspect..."
      />
      <div style={{ marginTop: '1rem' }}>
        <strong>Flagged?</strong>{' '}
        {result.isFlagged ? <span style={{ color: 'red' }}>Yes</span> : <span style={{ color: 'green' }}>No</span>}
      </div>
      <div>
        <strong>Filtered Output:</strong>{' '}
        <span style={{ background: '#eee', padding: '0.2rem 0.5rem' }}>{result.clean}</span>
      </div>
    </div>
  );
}
