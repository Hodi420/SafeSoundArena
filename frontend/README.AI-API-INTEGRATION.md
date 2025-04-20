# Preparing Your Project for AI & API Integration

This guide will help you get your frontend ready for integrating AI services, API calls, and future advanced features.

---

## 1. Organize Your Codebase

- Use clear folders for:
  - `src/services/api/` — API clients and integrations
  - `src/hooks/` — Custom hooks for data fetching (e.g., useAiCompletion, useChat)
  - `src/components/` — UI components for AI interactions (chat, results, etc.)
  - `src/utils/` — Utility functions (e.g., debounce, formatters)
  - `src/types/` — TypeScript types for API responses and requests

---

## 2. Environment Variables

Add API keys and endpoints to `.env.production` and `.env.development`:

```env
NEXT_PUBLIC_OPENAI_API_KEY=your_openai_key
NEXT_PUBLIC_ANTHROPIC_API_KEY=your_anthropic_key
NEXT_PUBLIC_AI_API_URL=https://your-ai-backend.com/api
```

**Never commit real secrets to git!**

---

## 3. Example: AI API Service (OpenAI/Anthropic)

Create a service file:

```typescript
// src/services/api/ai.ts
export async function fetchAICompletion(prompt: string): Promise<string> {
  const res = await fetch(process.env.NEXT_PUBLIC_AI_API_URL + '/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NEXT_PUBLIC_OPENAI_API_KEY}`
    },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('AI API error');
  const data = await res.json();
  return data.completion;
}
```

---

## 4. Example: React Hook for AI

```typescript
// src/hooks/useAiCompletion.ts
import { useState } from 'react';
import { fetchAICompletion } from '../services/api/ai';

export function useAiCompletion() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function getCompletion(prompt: string) {
    setLoading(true);
    setError(null);
    try {
      const completion = await fetchAICompletion(prompt);
      setResult(completion);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return { loading, result, error, getCompletion };
}
```

---

## 5. UI Example: AI Chat/Prompt Box

```tsx
// src/components/AiPromptBox.tsx
import React, { useState } from 'react';
import { useAiCompletion } from '../hooks/useAiCompletion';

export default function AiPromptBox() {
  const [input, setInput] = useState('');
  const { loading, result, error, getCompletion } = useAiCompletion();

  return (
    <div>
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Ask AI..."
      />
      <button onClick={() => getCompletion(input)} disabled={loading}>
        {loading ? 'Loading...' : 'Ask'}
      </button>
      {result && <div>AI: {result}</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}
```

---

## 6. Tips for AI/API Integration

- Use async/await for all API calls.
- Handle loading and error states in the UI.
- Keep API keys and endpoints in environment variables.
- Use TypeScript for all new code for safety and clarity.
- Document all new hooks/services.

---

## 7. Next Steps

- Choose your AI provider (OpenAI, Anthropic, Cohere, etc.).
- Register and get an API key.
- Implement the above service/hook/UI pattern.
- Expand to more advanced features (chat, streaming, etc.) as needed.

---

בהצלחה!
