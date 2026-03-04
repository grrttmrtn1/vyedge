export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'read-only';
}

export interface Route {
  id: number;
  destination: string;
  next_hop: string;
  interface?: string;
  description?: string;
  created_at: string;
}

export interface FirewallRule {
  id: number;
  action: 'accept' | 'drop' | 'reject';
  protocol: string;
  source_address?: string;
  source_port?: string;
  destination_address?: string;
  destination_port?: string;
  description?: string;
  created_at: string;
}

export interface VPNTunnel {
  id: number;
  name: string;
  remote_peer: string;
  local_address?: string;
  shared_secret?: string;
  encryption: string;
  status: 'up' | 'down';
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
}
