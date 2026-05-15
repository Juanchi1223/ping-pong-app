import { useEffect, useState } from 'react';
import { supabase } from '../api/supabase';
import { api } from '../api';

export function useRealtimeRankings() {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    let cancelled = false;
    async function refresh() {
      try {
        const next = await api.getPlayers();
        if (!cancelled) setData(next);
      } catch (e) {
        console.error('[realtime] refresh failed:', e.message);
      }
    }

    const channel = supabase
      .channel('rankings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, refresh)
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED');
      });

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, connected };
}
