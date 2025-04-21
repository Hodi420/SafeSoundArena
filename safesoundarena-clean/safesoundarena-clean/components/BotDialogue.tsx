import { useState, useRef } from 'react';
import { motion } from 'framer-motion';

type Message = {
  id: number;
  text: string;
  isBot: boolean;
};

export default function BotDialogue() {
  const [isTalking, setIsTalking] = useState(false);
  const synthRef = useRef<typeof window.speechSynthesis | null>(typeof window !== 'undefined' ? window.speechSynthesis : null);

  function speak(text: string) {
    if (!synthRef.current) return;
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.onstart = () => setIsTalking(true);
    utter.onend = () => setIsTalking(false);
    synthRef.current.cancel(); // Stop any previous speech
    synthRef.current.speak(utter);
  }

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: '> Initializing AI interface...\n> Connection established.\n> Welcome to SafeSoundArena! How can I assist you today?', isBot: true },
  ]);
  const [input, setInput] = useState('');

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      text: input,
      isBot: false,
    };

    setMessages([...messages, newMessage]);
    setInput('');

    // Simulate bot response
    setTimeout(() => {
      const botResponse: Message = {
        id: messages.length + 2,
        text: 'I understand. Let me help you with that...',
        isBot: true,
      };
      setMessages((prev) => {
        // Speak the bot response
        speak(botResponse.text);
        return [...prev, botResponse];
      });
    }, 1000);
  };

  return (
    <div className="h-[400px] flex flex-col relative">
      {/* Animated Avatar Face */}
      <div className="flex justify-center items-center mt-2 mb-1">
        {/* Yellow glow background only when talking */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isTalking ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0 }}
          transition={isTalking ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' } : { duration: 0.3 }}
          className="absolute z-0 w-20 h-20 rounded-full bg-yellow-400 blur-2xl"
          style={{ top: '-8px' }}
        />
        <motion.div
          animate={isTalking ? { scale: [1, 1.1, 1], y: [0, 2, -2, 0] } : { scale: 1, y: 0 }}
          transition={isTalking ? { repeat: Infinity, duration: 0.25, ease: 'linear' } : {}}
          className="relative z-10 w-14 h-14 rounded bg-gray-700 flex items-center justify-center shadow-lg border border-gray-800"
        >
          {/* Pixelated black face with simple mouth movement */}
          <svg width="36" height="36" viewBox="0 0 36 36">
            {/* Background */}
            <rect x="0" y="0" width="36" height="36" fill="#6b7280" />
            {/* Face (black square) */}
            <rect x="6" y="6" width="24" height="24" fill="#111" />
            {/* Eyes (white pixels) */}
            <rect x="12" y="14" width="3" height="3" fill="#fff" />
            <rect x="21" y="14" width="3" height="3" fill="#fff" />
            {/* Mouth (moving pixel row) */}
            {isTalking ? (
              <>
                <rect x="12" y="25" width="12" height="3" fill="#00b4d8" />
                <rect x="15" y="28" width="6" height="2" fill="#00b4d8" />
              </>
            ) : (
                <rect x="15" y="27" width="6" height="2" fill="#00b4d8" />
            )}
          </svg>
        </motion.div>
      </div>
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-gray-900 to-transparent z-10" />
      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-900 to-transparent z-10" />
      <div className="flex-1 overflow-y-auto space-y-4 p-4 font-mono text-sm">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${message.isBot ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 relative ${
                message.isBot
                  ? 'bg-gray-800 text-blue-400 border-l-2 border-blue-500'
                  : 'bg-gray-800 text-purple-400 border-r-2 border-purple-500'
              }`}
            >
              {message.text}
            </div>
          </motion.div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="input"
          />
          <button type="submit" className="btn-primary whitespace-nowrap">
            Send
          </button>
        </div>
      </form>
    </div>
  );
}