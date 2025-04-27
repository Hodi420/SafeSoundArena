import React, { useState } from 'react';
import Filter from 'bad-words';

const filter = new Filter();

export default function ProfanityFilterDemo() {
  const [input, setInput] = useState('');
  const [clean, setClean] = useState('');
  const [isProfane, setIsProfane] = useState(false);

  function handleChange(e) {
    const value = e.target.value;
    setInput(value);
    setIsProfane(filter.isProfane(value));
    setClean(filter.clean(value));
  }

  return (
    <div style={{padding:'1rem',border:'1px solid #ddd',margin:'1rem 0',background:'#f9f9f9'}}>
      <h3>Profanity Filter Demo</h3>
      <input
        type="text"
        value={input}
        onChange={handleChange}
        style={{width:'100%',padding:'0.5rem'}}
        placeholder="Type something..."
      />
      <div style={{marginTop:'1rem'}}>
        <strong>Is Profane?</strong> {isProfane ? <span style={{color:'red'}}>Yes</span> : <span style={{color:'green'}}>No</span>}
      </div>
      <div>
        <strong>Filtered Output:</strong> <span style={{background:'#eee',padding:'0.2rem 0.5rem'}}>{clean}</span>
      </div>
    </div>
  );
}
