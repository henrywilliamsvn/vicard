import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, cloudEnabled } from "./supabase";

interface AuthValue {
  ready: boolean;
  enabled: boolean;
  session: Session | null;
  signUp: (email: string, password: string) => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!cloudEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signUp(email: string, password: string) {
    if (!supabase) return "Cloud accounts are not configured yet.";
    const { error } = await supabase.auth.signUp({ email, password });
    return error ? error.message : null;
  }
  async function signIn(email: string, password: string) {
    if (!supabase) return "Cloud accounts are not configured yet.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? error.message : null;
  }
  async function signOut() {
    if (supabase) await supabase.auth.signOut();
  }

  return (
    <Ctx.Provider value={{ ready, enabled: cloudEnabled, session, signUp, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
