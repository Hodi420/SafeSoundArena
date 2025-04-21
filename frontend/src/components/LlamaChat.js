import React, { useState } from 'react';
import axios from 'axios';
import Web3 from 'web3';

function LlamaChat() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [account, setAccount] = useState('');

  // Connect to Pi Browser's Web3 provider
  const connectWallet = async () => {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } else {
      alert('Web3 provider not found. Use Pi Browser or MetaMask.');
    }
  };

  const sendPrompt = async () => {
    const res = await axios.post('http://localhost:3001/api/llama', { prompt });
    setResponse(res.data.response);
  };

  return (
    <div>
      <button onClick={connectWallet}>
        {account ? `Connected: ${account}` : 'Connect Pi Wallet'}
      </button>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button onClick={sendPrompt}>Ask Llama</button>
      <div>
        <strong>Response:</strong>
        <pre>{response}</pre>
      </div>
    </div>
  );
}

export default LlamaChat;