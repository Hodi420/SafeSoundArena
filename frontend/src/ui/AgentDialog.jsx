import React, { useState } from 'react';

export default function AgentDialog() {
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [output, setOutput] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function send() {
    setOutput('');
    // שלח dry-run
    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, args: args ? JSON.parse(args) : undefined, apiKey, confirm: needsConfirm ? confirm : undefined })
    });
    const data = await res.json();
    if (data.error === 'Confirmation required for this command') {
      setNeedsConfirm(true);
      setOutput('Are you sure? Please check the box and send again.');
      return;
    }
    setNeedsConfirm(false);
    setOutput(data.message || data.error);
  }

  return (
    <div style={{padding:'1rem',border:'1px solid #ddd',margin:'1rem 0',background:'#f6f6f6'}}>
      <h3>Agent Command Panel</h3>
      <input value={command} onChange={e=>setCommand(e.target.value)} placeholder="Command" style={{width:'100%',marginBottom:8}}/>
      <input value={args} onChange={e=>setArgs(e.target.value)} placeholder='Args (JSON)' style={{width:'100%',marginBottom:8}}/>
      {(command.startsWith('query_') || command === 'fetch_github') && (
        <input value={apiKey} onChange={e=>setApiKey(e.target.value)} placeholder="API Key (if required)" style={{width:'100%',marginBottom:8}}/>
      )}
      {needsConfirm && (
        <label style={{display:'block',marginBottom:8}}>
          <input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)} />
          Confirm action
        </label>
      )}
      <button onClick={send}>Send</button>
      <div style={{marginTop:8}}>{output}</div>
    </div>
  );
}
