export {};

type PiAuthResult = {
  user?: {
    uid?: string;
    username?: string;
    kyc_verified?: boolean;
    wallet?: {
      address?: string;
    };
  };
  username?: string;
  uid?: string;
  wallet?: {
    address?: string;
  };
  kyc_verified?: boolean;
};

type PiSdk = {
  init?: (options?: Record<string, unknown>) => void;
  authenticate?: (...args: unknown[]) => Promise<PiAuthResult>;
};

declare global {
  interface Window {
    Pi?: PiSdk;
  }

  type PiAuthData = PiAuthResult;
}
