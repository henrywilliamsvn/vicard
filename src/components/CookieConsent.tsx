import { useEffect, useState } from "react";
import { t } from "../i18n";
import type { Lang } from "../i18n";

// GDPR/CCPA-style consent banner. Records the choice on-device. "Essential
// only" opts out of any non-essential tracking; "Accept all" allows it.
// (The app is privacy-first manual entry — this exists for transparency.)
const KEY = "mss_cookie_consent.v1"; // "all" | "essential"

export default function CookieConsent({ lang }: { lang: Lang }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignore */
    }
  }, []);

  if (!show) return null;

  const choose = (v: "all" | "essential") => {
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* ignore */
    }
    setShow(false);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto bg-white border border-slate-200 shadow-lg rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-slate-600 flex-1">
          {t(lang, "cookieText")}{" "}
          <a href="/privacy.html" className="text-brand underline hover:text-brand-dark">
            {t(lang, "cookieMore")}
          </a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => choose("essential")}
            className="text-sm border border-slate-200 text-slate-600 rounded-lg px-3 py-2 hover:border-brand hover:text-brand"
          >
            {t(lang, "cookieEssential")}
          </button>
          <button
            onClick={() => choose("all")}
            className="text-sm bg-brand text-white rounded-lg px-4 py-2 font-medium hover:bg-brand-dark"
          >
            {t(lang, "cookieAccept")}
          </button>
        </div>
      </div>
    </div>
  );
}
