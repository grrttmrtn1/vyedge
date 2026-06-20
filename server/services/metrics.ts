import axios from 'axios';
import https from 'https';
import type { RouterMetrics } from '../../src/types.js';

const allowSelfSigned = process.env.ALLOW_SELF_SIGNED === 'true';
const httpsAgent = new https.Agent({ rejectUnauthorized: !allowSelfSigned });

async function vyosOp(url: string, apiKey: string, path: string[]): Promise<any> {
  const formData = new URLSearchParams();
  formData.append('key', apiKey);
  formData.append('data', JSON.stringify({ op: 'show', path }));
  const response = await axios.post(`${url}/op`, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 10000,
    httpsAgent,
  });
  if (!response.data?.success) throw new Error(response.data?.error || 'VyOS error');
  return response.data.data;
}

function parseCpu(data: any): RouterMetrics['cpu'] {
  try {
    if (data == null) return null;
    const idle = Number(data?.cpu?.idle ?? data?.idle ?? 100);
    if (isNaN(idle)) return null;
    return { loadPercent: Math.round(100 - idle) };
  } catch { return null; }
}

function parseMem(data: any): RouterMetrics['memory'] {
  try {
    const total = Number(data?.total);
    const used = Number(data?.used);
    if (!total || !used || isNaN(total) || isNaN(used)) return null;
    return {
      usedMb: Math.round(used / 1024),
      totalMb: Math.round(total / 1024),
      usedPercent: Math.round((used / total) * 100),
    };
  } catch { return null; }
}

function parseUptime(data: any): RouterMetrics['uptime'] {
  try {
    const str = String(data?.uptime ?? data ?? '');
    if (!str) return null;
    return { seconds: 0, str };
  } catch { return null; }
}

function parseInterfaces(data: any): RouterMetrics['interfaces'] {
  try {
    if (!Array.isArray(data)) return null;
    return data.map((iface: any) => ({
      name: String(iface.ifname ?? iface.name ?? ''),
      rxBytes: Number(iface.stats?.rx_bytes ?? iface.rx_bytes ?? 0),
      txBytes: Number(iface.stats?.tx_bytes ?? iface.tx_bytes ?? 0),
    }));
  } catch { return null; }
}

function parseRoutes(data: any): RouterMetrics['routes'] {
  try {
    if (data?.routes !== undefined) return { total: Number(data.routes) };
    if (Array.isArray(data)) return { total: data.length };
    return null;
  } catch { return null; }
}

function parseVpn(data: any): RouterMetrics['vpnPeers'] {
  try {
    if (data == null) return null;
    if (!Array.isArray(data)) return { active: 0 };
    return { active: data.filter((p: any) => p.state === 'established').length };
  } catch { return null; }
}

export async function collectRouterMetrics(
  router: { id: string; url: string; api_key: string }
): Promise<RouterMetrics> {
  const [cpuRes, memRes, uptimeRes, ifaceRes, routeRes, vpnRes] = await Promise.allSettled([
    vyosOp(router.url, router.api_key, ['system', 'cpu']),
    vyosOp(router.url, router.api_key, ['system', 'memory']),
    vyosOp(router.url, router.api_key, ['system', 'uptime']),
    vyosOp(router.url, router.api_key, ['interfaces']),
    vyosOp(router.url, router.api_key, ['ip', 'route', 'summary']),
    vyosOp(router.url, router.api_key, ['vpn', 'ipsec', 'sa']),
  ]);

  return {
    routerId: router.id,
    collectedAt: Date.now(),
    cpu: parseCpu(cpuRes.status === 'fulfilled' ? cpuRes.value : null),
    memory: parseMem(memRes.status === 'fulfilled' ? memRes.value : null),
    uptime: parseUptime(uptimeRes.status === 'fulfilled' ? uptimeRes.value : null),
    interfaces: parseInterfaces(ifaceRes.status === 'fulfilled' ? ifaceRes.value : null),
    routes: parseRoutes(routeRes.status === 'fulfilled' ? routeRes.value : null),
    vpnPeers: parseVpn(vpnRes.status === 'fulfilled' ? vpnRes.value : null),
  };
}
