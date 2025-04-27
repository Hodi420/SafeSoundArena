// Mock client for development and tests
// Replace with real implementation as needed

export const apiClient = {
<<<<<<< HEAD
  get: async (url: string) => {
    const res = await fetch(url, { method: 'GET', credentials: 'same-origin' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
  post: async (url: string, body?: any) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
  put: async (url: string, body?: any) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  },
  delete: async (url: string) => {
    const res = await fetch(url, { method: 'DELETE', credentials: 'same-origin' });
    if (!res.ok) throw new Error(await res.text());
    return await res.json();
  }
=======
  get: async () => ({}),
  post: async () => ({}),
  put: async () => ({}),
  delete: async () => ({})
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
};
