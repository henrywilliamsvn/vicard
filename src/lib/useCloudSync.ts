import { useEffect, useRef } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";

export interface AppData {
  owned: unknown;
  log: unknown;
  paid: unknown;
}

export function useCloudSync(data: AppData, apply: (d: AppData) => void) {
  const { session, enabled } = useAuth();
  const hydrated = useRef(false);
  const userId = session?.user.id ?? null;

  useEffect(() => {
    hydrated.current = false;
    if (!enabled || !supabase || !userId) return;
    let cancelled = false;
    (async () => {
      const { data: row } = await supabase
        .from("user_data")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (row && row.data) {
        apply(row.data as AppData);
      } else {
        await supabase.from("user_data").upsert({ user_id: userId, data });
      }
      hydrated.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, enabled]);

  useEffect(() => {
    if (!enabled || !supabase || !userId || !hydrated.current) return;
    const client = supabase;
    const t = setTimeout(() => {
      client
        .from("user_data")
        .upsert({ user_id: userId, data, updated_at: new Date().toISOString() });
    }, 800);
    return () => clearTimeout(t);
  }, [data, userId, enabled]);
}
