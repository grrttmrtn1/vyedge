import { useState, useEffect, useRef } from 'react';
import type { RouterMetrics, AlertEvent } from '../types';

const MAX_HISTORY = 30;

export function useRouterMetrics(routerId: string, token: string | null) {
  const [latest, setLatest] = useState<RouterMetrics | null>(null);
  const [history, setHistory] = useState<RouterMetrics[]>([]);
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!token || !routerId) return;

    const es = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (msg.type === 'metrics' && msg.routerId === routerId) {
          setLatest(msg.payload as RouterMetrics);
          setHistory(prev => [...prev.slice(-(MAX_HISTORY - 1)), msg.payload as RouterMetrics]);
        } else if (msg.type === 'alert' && msg.routerId === routerId) {
          setAlerts(prev => [msg as AlertEvent, ...prev].slice(0, 50));
        }
      } catch { /* malformed event — ignore */ }
    };

    es.onerror = () => {
      // EventSource auto-reconnects; let it do so
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [routerId, token]);

  return { latest, history, alerts };
}
