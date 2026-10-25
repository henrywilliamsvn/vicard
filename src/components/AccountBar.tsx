import { useState } from "react";
import { useAuth } from "../lib/auth";
import { useLang, t } from "../i18n";
import { usePremium } from "../lib/premium";

export default function AccountBar() {
  const { enabled, session, signIn, signUp, signOut } = useAuth();
  const [lang] = useLang();
  const [isPremium, setPremium] = usePremium();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return <span className="text-xs text-brand-light/80">Guest mode</span>;
  }

  // Only shown to subscribers (to exit the demo); free users upgrade via the
  // Premium card in the feed, keeping the header uncluttered.
  const premiumToggle = isPremium ? (
    <button
      onClick={() => setPremium(false)}
      className="bg-white/25 rounded-full px-3 py-1.5 whitespace-nowrap"
      title="Demo only — exit the subscriber view"
    >
      Premium ✓
    </button>
  ) : null;

  if (session) {
    return (
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-brand-light/90 hidden sm:inline max-w-[120px] truncate">{session.user.email}</span>
        {premiumToggle}
        <button
          onClick={() => signOut()}
          className="bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 whitespace-nowrap"
        >
          {lang === "vi" ? "Đăng xuất" : "Sign out"}
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
    <div className="relative flex items-center gap-1.5 text-xs">
      {premiumToggle}
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5 whitespace-nowrap"
      >
        {lang === "vi" ? "Đăng nhập" : "Sign in"}
      </button>
      {open && (
        // Centered fixed modal (not an anchored dropdown) so the mobile keyboard
        // can't push the fields off the top of the screen. Tap the dim backdrop
        // to close; taps inside the card don't close it.
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white text-slate-700 rounded-2xl shadow-xl border border-slate-100 p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex gap-4 text-sm">
                <button
                  onClick={() => setMode("in")}
                  className={mode === "in" ? "font-semibold text-brand" : "text-slate-400"}
                >
                  {lang === "vi" ? "Đăng nhập" : "Log in"}
                </button>
                <button
                  onClick={() => setMode("up")}
                  className={mode === "up" ? "font-semibold text-brand" : "text-slate-400"}
                >
                  {lang === "vi" ? "Đăng ký" : "Sign up"}
                </button>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label={lang === "vi" ? "Đóng" : "Close"}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              // text-base (16px) stops iOS from auto-zooming when the field is focused
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base"
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder={lang === "vi" ? "Mật khẩu (tối thiểu 6 ký tự)" : "Password (min 6 chars)"}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-base"
            />
            <button
              onClick={submit}
              disabled={busy || !email || password.length < 6}
              className="w-full bg-brand text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40"
            >
              {busy ? "..." : mode === "in" ? (lang === "vi" ? "Đăng nhập" : "Log in") : (lang === "vi" ? "Tạo tài khoản" : "Create account")}
            </button>
            {msg && <p className="text-xs text-slate-500">{msg}</p>}
            <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1.5 leading-snug">
              {t(lang, "noSell")}
            </p>
            <p className="text-[11px] text-slate-400">
              {lang === "vi"
                ? "Ví thẻ của bạn được đồng bộ vào tài khoản. Dữ liệu khách trên máy này được giữ lại và tải lên khi bạn đăng ký lần đầu."
                : "Your wallet syncs to your account. Guest data on this device is kept and uploaded on first sign-up."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
