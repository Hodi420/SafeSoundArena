// useAuth.ts - returns current user object and role from localStorage, cookie, or API
import { useEffect, useState } from 'react';

export interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'user' | string;
  isAuthenticated: boolean;
}

export function useAuth(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Replace with real API/cookie/localStorage logic
    const stored = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser({ ...parsed, isAuthenticated: true });
      } catch {
        setUser(null);
      }
    } else {
      setUser(null);
    }
    setLoading(false);
  }, []);

  return { user, loading };
}
