import { useEffect, useState } from "react";

// Premium entitlement — STUB. Today this is just a local flag so we can ship
// the free/subscriber split and demo both. Wire to the real source of truth
// later (Supabase user/subscription field set by your billing webhook):
//   e.g. read `profiles.is_premium` on auth, and treat that as the value here.
const KEY = "mss_premium.v1";

let value = read();
const listeners = new Set<(v: boolean) => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function getPremium(): boolean {
  return value;
}

export function setPremium(v: boolean): void {
  value = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l(v));
}

// Shared across components in the tab (header toggle ↔ feed gate stay in sync).
export function usePremium(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState<boolean>(value);
  useEffect(() => {
    const l = (nv: boolean) => setV(nv);
    listeners.add(l);
    setV(value);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return [v, setPremium];
}
