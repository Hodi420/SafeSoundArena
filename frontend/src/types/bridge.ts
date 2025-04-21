export interface Bridge {
  id: string;
  from_chain: string;
  to_chain: string;
  assets: string[];
  status: string;
  owner: string;
}
