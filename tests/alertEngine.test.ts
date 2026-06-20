import { describe, it, expect, beforeAll } from 'vitest';
import { createApp } from '../server';
import { db } from '../server/db';

describe('evaluateAlerts', () => {
  beforeAll(async () => {
    await createApp(); // ensures DB is initialized
  });

  it('returns empty array when no alert_rules configured', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');
    db.prepare("UPDATE settings SET value = '[]' WHERE key = 'alert_rules'").run();

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 90 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toEqual([]);
  });

  it('fires alert when metric breaches threshold', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    const rule = { id: 'rule-1', name: 'High CPU', metric: 'cpu', operator: '>', threshold: 80, cooldownMinutes: 5 };
    db.prepare("UPDATE settings SET value = ? WHERE key = 'alert_rules'").run(JSON.stringify([rule]));
    // Clear any previous alert for this rule/router
    db.prepare("DELETE FROM alerts WHERE rule_id = ? AND router_id = ?").run('rule-1', 'r1');

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 95 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('alert');
    expect(events[0].ruleId).toBe('rule-1');
    expect(events[0].value).toBe(95);
  });

  it('does not fire duplicate alert when already active', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    // Rule and existing unfired alert already in DB from prior test
    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 95 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(0); // already active, no new event
  });

  it('resolves alert when metric clears', async () => {
    const { evaluateAlerts } = await import('../server/services/alertEngine.js');

    const metrics = {
      routerId: 'r1', collectedAt: Date.now(),
      cpu: { loadPercent: 50 }, memory: null, uptime: null,
      interfaces: null, routes: null, vpnPeers: null,
    };

    const events = evaluateAlerts('r1', metrics);
    expect(events).toHaveLength(0); // resolved, no new event

    const resolved = db.prepare("SELECT resolved_at FROM alerts WHERE rule_id = 'rule-1' AND router_id = 'r1'").get() as any;
    expect(resolved?.resolved_at).toBeTruthy();
  });
});
