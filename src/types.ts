export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'read-only';
  groups?: string[];
}

export interface Route {
  id: string;
  destination: string;
  next_hop: string;
  interface?: string;
  description?: string;
  created_at: string;
}

export interface FirewallRule {
  id: string;
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
  id: string;
  name: string;
  remote_peer: string;
  local_address?: string;
  shared_secret?: string;
  encryption: string;
  status: 'up' | 'down';
  created_at: string;
}

export interface AuditLog {
  id: string;
  username?: string;
  action: string;
  details: string;
  ip_address: string;
  timestamp: string;
  router_name?: string;
}

export interface Router {
  id: string;
  name: string;
  url: string;
  status: string;
  group_id?: string;
  vyos_version?: string | null;
}

export interface RouterGroup {
  id: string;
  name: string;
  tenant_id?: string;
  node_count?: number;
}

export interface SystemInfo {
  uptime: number;
  version: string;
  node_version: string;
  memory: NodeJS.MemoryUsage;
  platform: string;
  arch: string;
}

export interface Settings {
  [key: string]: string | boolean | number;
}

export type Tab = 'dashboard' | 'routers' | 'config' | 'logs' | 'settings' | 'users' | 'browser';

export interface RouterMetrics {
  routerId: string;
  collectedAt: number;
  cpu: { loadPercent: number } | null;
  memory: { usedMb: number; totalMb: number; usedPercent: number } | null;
  uptime: { seconds: number; str: string } | null;
  interfaces: Array<{ name: string; rxBytes: number; txBytes: number }> | null;
  routes: { total: number } | null;
  vpnPeers: { active: number } | null;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: 'cpu' | 'memory';
  operator: '>' | '<' | '==';
  threshold: number;
  cooldownMinutes: number;
}

export interface FirewallDraft {
  id: string;
  router_id: string;
  operation: 'set' | 'delete';
  path: string[];
  value?: string | null;
  created_at: string;
}

export interface AlertEvent {
  type: 'alert';
  ruleId: string;
  ruleName: string;
  routerId: string;
  metric: string;
  value: number;
  threshold: number;
  firedAt: string;
}
