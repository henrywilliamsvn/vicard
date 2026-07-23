import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import type { Lang } from "../i18n";

// In-app trip confirmation. Listens for "mss-trip" events (fired by the
// interstitial when a retailer link is clicked), shows a reassurance toast,
// and keeps a "Shopping trips" history with a pending-cashback status.
// (The email version is a later add-on once the Resend domain is verified.)

type Trip = { id: string; merchant: string; host: string; ts: number };
const KEY = "mss_trips.v1";
const MAX = 50;

function loadTrips(): Trip[] {
  try {
    const r = localStorage.getItem(KEY);
    return r ? (JSON.parse(r) as Trip[]) : [];
  } catch {
    return [];
  }
}

function timeAgo(ts: number, vi: boolean): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return vi ? "vừa xong" : "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return vi ? `${m} phút trước` : `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return vi ? `${h} giờ trước` : `${h}h ago`;
  return vi ? `${Math.floor(h / 24)} ngày trước` : `${Math.floor(h / 24)}d ago`;
}

export default function ShoppingTrips({ lang }: { lang: Lang }) {
  const vi = lang === "vi";
  const [trips, setTrips] = useState<Trip[]>(() => loadTrips());
  const [toast, setToast] = useState<Trip | null>(null);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function onTrip(e: Event) {
      const d = (e as CustomEvent).detail || {};
      const trip: Trip = {
        id: crypto?.randomUUID?.() ?? String(Date.now()),
        merchant: String(d.merchant || (vi ? "cửa hàng" : "the store")),
        host: String(d.host || ""),
        ts: Date.now(),
      };
      setTrips((prev) => {
        const next = [trip, ...prev].slice(0, MAX);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
      setToast(trip);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setToast(null), 6000);
    }
    window.addEventListener("mss-trip", onTrip as EventListener);
    return () => window.removeEventListener("mss-trip", onTrip as EventListener);
  }, [vi]);

  function clearAll() {
    setTrips([]);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 w-[calc(100%-2rem)] max-w-md">
          <div className="bg-white border border-emerald-200 shadow-lg rounded-xl px-4 py-3 text-sm text-slate-700">
            {t(lang, "tripLogged", { m: toast.merchant })}
          </div>
        </div>
      )}

      {trips.length > 0 && (
        <button
          onClick={() => setOpen(true)}
          className="fixed left-4 bottom-4 z-40 bg-white border border-slate-200 shadow-md rounded-full px-3 py-2 text-xs font-medium text-slate-600 hover:border-brand hover:text-brand flex items-center gap-1.5"
        >
          🧾 {t(lang, "tripsBtn")}
          <span className="bg-brand text-white rounded-full px-1.5">{trips.length}</span>
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-3"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">🧾 {t(lang, "tripsTitle")}</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto">
              <p className="text-xs text-slate-500 mb-3">{t(lang, "tripsNote")}</p>
              {trips.length === 0 ? (
                <p className="text-sm text-slate-400">{t(lang, "tripsEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {trips.map((tr) => (
                    <li
                      key={tr.id}
                      className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{tr.merchant}</div>
                        <div className="text-[11px] text-slate-400">{timeAgo(tr.ts, vi)}</div>
                      </div>
                      <span className="text-[11px] text-amber-700 bg-amber-50 rounded-full px-2 py-0.5 whitespace-nowrap">
                        {t(lang, "tripsPending")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {trips.length > 0 && (
              <div className="px-4 py-3 border-t border-slate-100 text-right">
                <button onClick={clearAll} className="text-xs text-slate-400 hover:text-red-500">
                  {t(lang, "tripsClear")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
