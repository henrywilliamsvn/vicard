import { t } from "../i18n";
import type { Lang } from "../i18n";

// NON-LIVE loyalty preview, styled to the UI mockup's "Hạng & Phần thưởng"
// screen: a big Xu Meo tier ring + a vertical mission list. Clearly badged
// "Bản xem trước · Sắp ra mắt" with NO real balances — tiers/Xu need the
// parked backend ledger (see the Payout/Loyalty plans).
const R = 46;
const C = 2 * Math.PI * R;
const PROGRESS = 0.8; // 880 / 1100 Xu toward Mèo Vàng (illustrative)

export default function LoyaltyPreview({ lang }: { lang: Lang }) {
  const missions: [string, string, boolean][] = [
    ["🛒", t(lang, "loyM1"), true],
    ["👯", t(lang, "loyM2"), false],
    ["✍️", t(lang, "loyM3"), false],
  ];
  return (
    <section className="rounded-xl bg-brand-light border border-brand/20 p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-brand-dark">{t(lang, "loyPreview")}</span>
        <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
          {t(lang, "loySoon")}
        </span>
      </div>

      {/* Big tier ring */}
      <div className="text-center py-2">
        <div className="relative inline-grid place-items-center">
          <svg width="148" height="148" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#FFE0C2" strokeWidth="11" />
            <circle
              cx="60" cy="60" r={R} fill="none" stroke="#FF7A1A" strokeWidth="11" strokeLinecap="round"
              strokeDasharray={C} strokeDashoffset={C * (1 - PROGRESS)} transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="absolute text-center">
            <div className="text-3xl font-extrabold text-brand-dark leading-none">880</div>
            <div className="text-[11px] font-bold text-slate-400 mt-0.5">Xu Meo</div>
          </div>
        </div>
        <div className="font-extrabold text-slate-800 mt-1">Mèo Bạc</div>
        <div className="text-xs text-brand-dark">{t(lang, "loyTierProg")}</div>
      </div>

      {/* Mission list */}
      <div className="text-xs font-semibold text-slate-500 mt-1 mb-2">
        {t(lang, "loyMissions")} <span className="text-slate-400">· 1/3</span>
      </div>
      <div className="space-y-2">
        {missions.map(([icon, label, done]) => (
          <div key={label} className="flex items-center gap-3 bg-white border border-slate-100 rounded-xl px-3 py-2.5">
            <span className="text-lg leading-none">{icon}</span>
            <span className="text-sm font-medium text-slate-700 flex-1 min-w-0">{label}</span>
            {done && <span className="text-emerald-600 text-sm font-bold">✓</span>}
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-400 mt-3">{t(lang, "loyNote")}</p>
    </section>
  );
}
