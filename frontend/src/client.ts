export type ApiResponse<T> = { data: T };

async function request<T>(url: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  const normalizedUrl = /^https?:\/\//i.test(url)
    ? url
    : url === '/api' || url.startsWith('/api/')
      ? url
      : `/api${url.startsWith('/') ? url : `/${url}`}`;

  const userId = typeof window !== 'undefined'
    ? window.localStorage.getItem('user_id') || window.localStorage.getItem('userId')
    : null;

  const response = await fetch(normalizedUrl, {
    ...init,
    credentials: 'same-origin',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(userId ? { 'X-User-Id': userId } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json() as T
    : await response.text() as T;

  return { data };
}

export const apiClient = {
  // JSON response shapes are validated by the individual hooks at their boundary.
  // Keep the legacy call sites usable while hooks are migrated to explicit generics.
  get: <T = any>(url: string) => request<T>(url),
  post: <T = any>(url: string, body?: unknown) => request<T>(url, {
    method: 'POST',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  put: <T = any>(url: string, body?: unknown) => request<T>(url, {
    method: 'PUT',
    body: body === undefined ? undefined : JSON.stringify(body),
  }),
  delete: <T = any>(url: string) => request<T>(url, { method: 'DELETE' }),
};
