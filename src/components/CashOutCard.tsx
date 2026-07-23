import { t } from "../i18n";
import type { Lang } from "../i18n";

// NON-LIVE preview of the future cash-out feature: a "Progress to Cash Out"
// bar + withdraw teaser. Clearly labelled "Coming soon" with an illustrative
// balance so it never implies users have withdrawable cash today.
// Withdrawals require the backend ledger + payout rails + legal sign-off
// described in Outbox/MeoSanSales-Payout-Architecture-and-Compliance-Plan.
const DEMO_AVAILABLE = 162000; // illustrative đồng
const DEMO_PENDING = 88000;
const THRESHOLD = 250000; // ≈ $10 — launch threshold TBD (50k–100k suggested)

function vnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export default function CashOutCard({ lang }: { lang: Lang }) {
  const pct = Math.min(100, Math.round((DEMO_AVAILABLE / THRESHOLD) * 100));
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t(lang, "cashOutTitle")}</h2>
        <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
          {t(lang, "cashOutSoon")}
        </span>
      </div>
      <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-slate-400">{t(lang, "cashOutAvail")}</div>
            <div className="text-2xl font-bold text-brand">{vnd(DEMO_AVAILABLE)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">{t(lang, "cashOutThreshold")}</div>
            <div className="text-sm font-semibold text-slate-600">{vnd(THRESHOLD)}</div>
          </div>
        </div>

        <div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-brand" style={{ width: pct + "%" }} />
          </div>
          <div className="text-xs text-slate-500 mt-1">{t(lang, "cashOutProgress", { pct })}</div>
        </div>

        <div className="text-xs text-slate-500">
          {t(lang, "cashOutPending")}: <strong className="text-slate-600">{vnd(DEMO_PENDING)}</strong>
        </div>

        <div className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">{t(lang, "cashOutFast")}</div>

        <button
          disabled
          className="w-full bg-slate-200 text-slate-400 rounded-lg py-2.5 font-medium cursor-not-allowed"
        >
          {t(lang, "cashOutSoon")}
        </button>

        <p className="text-[11px] text-slate-400">{t(lang, "cashOutMethods")}</p>
        <p className="text-[11px] text-slate-400">{t(lang, "cashOutNote")}</p>
      </div>
    </section>
  );
}
