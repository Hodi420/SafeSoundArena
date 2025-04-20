// Utility to call AI API nodes from the frontend
export async function callAI(action: string, payload: any): Promise<any> {
  const response = await fetch(`/api/ai/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`AI call failed: ${response.statusText}`);
  }
  const data = await response.json();
  return data.result;
}

// Example usage:
// const result = await callAI('echo', { message: 'Hello AI' });
