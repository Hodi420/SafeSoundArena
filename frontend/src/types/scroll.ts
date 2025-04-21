export interface Scroll {
  id: string;
  title: string;
  owner: string;
  metadata: {
    type: string;
    auth_level: string;
  };
  content: string;
  timestamp: number;
}
