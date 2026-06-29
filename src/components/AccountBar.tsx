import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useLang, t } from "../i18n";

export default function AccountBar() {
  const { enabled, session, signIn, signUp, signOut } = useAuth();
  const [lang] = useLang();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return <span className="text-xs text-brand-light/80">Guest mode</span>;
  }

  if (session) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-brand-light/90 hidden sm:inline">{session.user.email}</span>
        <button
          onClick={() => signOut()}
          className="bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5"
        >
          Sign out
        </button>
      </div>
    );
  }

  async function submit() {
    setBusy(true);
    setMsg(null);
    const err = mode === "in" ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (err) {
      setMsg(err);
    } else if (mode === "up") {
      setMsg("Account created. If email confirmation is on, confirm then log in.");
    } else {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5"
      >
        Sign in / Sign up
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white text-slate-700 rounded-xl shadow-lg border border-slate-100 p-3 z-10 space-y-2">
          <div className="flex gap-3 text-xs">
            <button
              onClick={() => setMode("in")}
              className={mode === "in" ? "font-semibold text-brand" : "text-slate-400"}
            >
              Log in
            </button>
            <button
              onClick={() => setMode("up")}
              className={mode === "up" ? "font-semibold text-brand" : "text-slate-400"}
            >
              Sign up
            </button>
          </div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password (min 6 chars)"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={submit}
            disabled={busy || !email || password.length < 6}
            className="w-full bg-brand text-white rounded-lg py-2 text-sm font-medium disabled:opacity-40"
          >
            {busy ? "..." : mode === "in" ? "Log in" : "Create account"}
          </button>
          {msg && <p className="text-xs text-slate-500">{msg}</p>}
          <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5 leading-snug">
            {t(lang, "noSell")}
          </p>
          <p className="text-[11px] text-slate-400">
            Your wallet syncs to your account. Guest data on this device is kept and uploaded on first sign-up.
          </p>
        </div>
      )}
    </div>
  );
}
