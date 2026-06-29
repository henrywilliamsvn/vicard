import { useEffect, useState } from "react";
import { type Lang } from "../i18n";

// Lightweight PWA install banner. Listens for the browser's
// `beforeinstallprompt` (Android/Chrome/Edge), then shows a Meo-branded
// nudge. Dismissals are remembered so we don't nag.
const KEY = "mss_install_dismissed";

export default function InstallPrompt({ lang }: { lang: Lang }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [evt, setEvt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem(KEY)) return;
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onBIP = (e: any) => {
      e.preventDefault();
      setEvt(e);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    return () => window.removeEventListener("beforeinstallprompt", onBIP);
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  };
  const install = async () => {
    if (evt) {
      evt.prompt();
      try {
        await evt.userChoice;
      } catch {
        /* ignore */
      }
    }
    dismiss();
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-3">
      <div className="rounded-xl bg-brand-light border border-brand/20 p-3 flex items-center gap-3">
        <img src="/mascot.png" alt="Meo" className="w-9 h-9 rounded-full object-cover shrink-0" />
        <div className="text-sm text-slate-700 flex-1 min-w-0">
          {lang === "vi"
            ? "Cài Mẹo săn sales vào màn hình chính 🐱"
            : "Add Mẹo săn sales to your home screen 🐱"}
        </div>
        <button
          onClick={install}
          className="text-xs bg-brand text-white rounded-full px-3 py-1.5 font-medium hover:bg-brand-dark whitespace-nowrap"
        >
          {lang === "vi" ? "Cài" : "Install"}
        </button>
        <button
          onClick={dismiss}
          className="text-slate-400 hover:text-slate-600 text-lg leading-none"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}
