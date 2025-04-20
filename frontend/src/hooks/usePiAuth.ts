// React hook for Pi Network authentication and KYC status
import { useEffect, useState } from 'react';

declare global {
  interface Window { Pi: any; }
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
        function(authData: any) {
          setProfile(authData.user);
          setLoading(false);
        },
        function(err: any) {
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
