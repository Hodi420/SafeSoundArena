// React hook for Pi Network authentication and KYC status
import { useEffect, useState } from 'react';

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
    const authenticate = window.Pi?.authenticate;
    if (!authenticate) {
      setError('יש להיכנס דרך Pi Browser');
      setLoading(false);
      return;
    }

    authenticate(['username', 'kyc_verified'])
      .then((authData) => {
        const user = authData.user;
        setProfile(user ? {
          username: user.username || authData.username || authData.uid || '',
          kyc_verified: user.kyc_verified ?? authData.kyc_verified,
        } : null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(typeof err === 'string' ? err : JSON.stringify(err));
        setLoading(false);
      });
  }, []);

  return { profile, loading, error };
}
