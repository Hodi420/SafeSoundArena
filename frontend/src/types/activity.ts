export interface ActivityLog {
  user: string;
  action: string;
  timestamp: number;
  verified: boolean;
  details: Record<string, unknown>;
}
