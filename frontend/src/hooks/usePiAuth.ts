// React hook for Pi Network authentication and KYC status
import { useEffect, useState } from 'react';

declare global {
<<<<<<< HEAD
  interface Window { Pi: unknown; }
=======
  interface Window { Pi: any; }
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
}

export interface PiProfile {
  username: string;
  kyc_verified?: boolean;
  // add more fields as needed
}

export function usePiAuth() {
  const [profile, setProfile] = useState<PiProfile|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    if (window.Pi) {
      window.Pi.authenticate(['username', 'kyc_verified'],
<<<<<<< HEAD
        function(authData: PiAuthData) {
          setProfile(authData.user);
          setLoading(false);
        },
        function(err: unknown) {
=======
        function(authData: any) {
          setProfile(authData.user);
          setLoading(false);
        },
        function(err: any) {
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
          setError(typeof err === 'string' ? err : JSON.stringify(err));
          setLoading(false);
        }
      );
    } else {
      setError('יש להיכנס דרך Pi Browser');
      setLoading(false);
    }
  }, []);

  return { profile, loading, error };
}
