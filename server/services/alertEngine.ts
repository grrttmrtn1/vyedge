import crypto from 'crypto';
import { db } from '../db.js';
import type { RouterMetrics, AlertEvent, AlertRule } from '../../src/types.js';

function getMetricValue(metrics: RouterMetrics, metric: string): number | null {
  if (metric === 'cpu') return metrics.cpu?.loadPercent ?? null;
  if (metric === 'memory') return metrics.memory?.usedPercent ?? null;
  return null;
}

function evaluate(value: number, operator: string, threshold: number): boolean {
  if (operator === '>') return value > threshold;
  if (operator === '<') return value < threshold;
  if (operator === '==') return value === threshold;
  return false;
}

export function evaluateAlerts(routerId: string, metrics: RouterMetrics): AlertEvent[] {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'alert_rules'").get() as any;
  if (!row?.value) return [];

  let rules: AlertRule[] = [];
  try { rules = JSON.parse(row.value); } catch { return []; }
  if (!Array.isArray(rules) || rules.length === 0) return [];

  const events: AlertEvent[] = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    const value = getMetricValue(metrics, rule.metric);
    if (value === null) continue;

    const breached = evaluate(value, rule.operator, rule.threshold);
    const existing = db.prepare(
      "SELECT id FROM alerts WHERE rule_id = ? AND router_id = ? AND resolved_at IS NULL"
    ).get(rule.id, routerId) as any;

    if (breached && !existing) {
      db.prepare(`
        INSERT INTO alerts (id, rule_id, router_id, metric, value, threshold, fired_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), rule.id, routerId, rule.metric, value, rule.threshold, now);

      events.push({
        type: 'alert',
        ruleId: rule.id,
        ruleName: rule.name,
        routerId,
        metric: rule.metric,
        value,
        threshold: rule.threshold,
        firedAt: now,
      });
    } else if (!breached && existing) {
      db.prepare("UPDATE alerts SET resolved_at = ? WHERE id = ?").run(now, existing.id);
    }
  }

  return events;
}
