import React, { useState } from 'react';

const KEYWORDS = ['פאי', 'חלוץ', 'גלקסיה', 'בלוקצ\'יין', 'נתיב'];
function getRandomKeyword() {
  return KEYWORDS[Math.floor(Math.random() * KEYWORDS.length)];
}

export default function JailtimeVoiceAuth({ onSuccess }: { onSuccess: () => void }) {
  const [keyword] = useState(getRandomKeyword());
  const [status, setStatus] = useState<'idle' | 'recording' | 'checking' | 'success' | 'fail'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleRecord = () => {
    setStatus('recording');
    setError(null);

    // Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('דפדפן לא תומך בזיהוי קולי');
      setStatus('fail');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim();
      if (transcript === keyword) {
        setStatus('success');
        onSuccess();
      } else {
        setStatus('fail');
        setError(`המילה שזוהתה: "${transcript}" אינה תואמת!`);
      }
    };
    recognition.onerror = (e: any) => {
      setStatus('fail');
      setError('שגיאה בזיהוי קולי');
    };
    recognition.onend = () => {
      if (status !== 'success') setStatus('idle');
    };

    recognition.start();
  };

  return (
    <div className="bg-white p-4 rounded shadow text-center max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-2">אימות ווקלי ל־JAILTIME</h2>
      <div className="mb-4">
        אמור/י בקול ברור: <span className="font-mono text-lg text-blue-700">{keyword}</span>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={handleRecord}
        disabled={status === 'recording'}
      >
        {status === 'recording' ? 'מקליט...' : 'התחל הקלטה'}
      </button>
      {status === 'success' && <div className="text-green-700 mt-2">✔️ אימות עבר בהצלחה!</div>}
      {status === 'fail' && <div className="text-red-700 mt-2">{error}</div>}
      {status === 'recording' && <div className="text-blue-700 mt-2">המערכת מאזינה...</div>}
    </div>
  );
}
