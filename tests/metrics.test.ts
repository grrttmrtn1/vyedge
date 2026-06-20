import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

describe('collectRouterMetrics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns parsed metrics when VyOS responds successfully', async () => {
    const { collectRouterMetrics } = await import('../server/services/metrics.js');

    mockedAxios.post
      .mockResolvedValueOnce({ data: { success: true, data: { cpu: { idle: 82.0 } } } })   // cpu
      .mockResolvedValueOnce({ data: { success: true, data: { total: 8192000, used: 4096000 } } }) // memory
      .mockResolvedValueOnce({ data: { success: true, data: { uptime: '5 days, 2:34:10' } } })     // uptime
      .mockResolvedValueOnce({ data: { success: true, data: [{ ifname: 'eth0', stats: { rx_bytes: 1000, tx_bytes: 2000 } }] } }) // interfaces
      .mockResolvedValueOnce({ data: { success: true, data: { routes: 42 } } })            // routes
      .mockResolvedValueOnce({ data: { success: true, data: [] } });                        // vpn

    const router = { id: 'r1', url: 'https://192.168.1.1', api_key: 'testkey' };
    const result = await collectRouterMetrics(router);

    expect(result.routerId).toBe('r1');
    expect(result.cpu?.loadPercent).toBe(18); // 100 - 82
    expect(result.memory?.usedPercent).toBe(50);
    expect(result.uptime?.str).toBe('5 days, 2:34:10');
    expect(result.interfaces).toHaveLength(1);
    expect(result.interfaces![0].name).toBe('eth0');
    expect(result.routes?.total).toBe(42);
    expect(result.vpnPeers?.active).toBe(0);
  });

  it('returns null fields when VyOS calls fail', async () => {
    const { collectRouterMetrics } = await import('../server/services/metrics.js');

    mockedAxios.post.mockRejectedValue(new Error('ECONNREFUSED'));

    const router = { id: 'r2', url: 'https://10.0.0.1', api_key: 'key' };
    const result = await collectRouterMetrics(router);

    expect(result.routerId).toBe('r2');
    expect(result.cpu).toBeNull();
    expect(result.memory).toBeNull();
    expect(result.uptime).toBeNull();
    expect(result.interfaces).toBeNull();
    expect(result.routes).toBeNull();
    expect(result.vpnPeers).toBeNull();
  });
});
