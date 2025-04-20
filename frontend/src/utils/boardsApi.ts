// Utility functions for interacting with the Community Boards API
export async function getBoard(board: 'shame' | 'fame' | 'sites') {
  const res = await fetch(`/api/boards/${board}`);
  if (!res.ok) throw new Error('Failed to fetch board');
  return await res.json();
}

export async function reportUser(data: { username: string; type: string; description: string; evidence: string[] }) {
  const res = await fetch('/api/boards/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to report user');
  return await res.json();
}

export async function reportSite(data: { site: string; type: string; description?: string; evidence?: string[] }) {
  const res = await fetch('/api/boards/site', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to report site');
  return await res.json();
}
