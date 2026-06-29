import { t } from "../i18n";
import type { Lang } from "../i18n";

// NON-LIVE loyalty preview: dual progress rings (tier + wallet) + mission strip,
// from the TMRW Tribe → Mẹo săn sales blueprint. Clearly badged "Bản xem trước /
// Sắp ra mắt" with NO fake balances — tiers/Xu/wallet need the parked backend
// (see Outbox/MeoSanSales-Loyalty-UI-Blueprint + Payout plan).

const R = 26;
const C = 2 * Math.PI * R;

function Ring({ pct, center }: { pct: number; center: string }) {
  const offset = C * (1 - Math.min(1, Math.max(0, pct / 100)));
  return (
    <svg viewBox="0 0 64 64" className="w-16 h-16 shrink-0">
      <circle cx="32" cy="32" r={R} fill="none" stroke="#FFE0C2" strokeWidth="6" />
      <circle
        cx="32" cy="32" r={R} fill="none" stroke="#FF7A1A" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 32 32)"
      />
      <text x="32" y="37" textAnchor="middle" fontSize="18">{center}</text>
    </svg>
  );
}

export default function LoyaltyPreview({ lang }: { lang: Lang }) {
  return (
    <section className="rounded-xl bg-brand-light border border-brand/20 p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-brand-dark">{t(lang, "loyPreview")}</span>
        <span className="text-[10px] uppercase tracking-wide bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 font-semibold">
          {t(lang, "loySoon")}
        </span>
      </div>

      {/* Dual rings: tier + wallet */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Ring pct={80} center="🐱" />
          <div className="min-w-0">
            <div className="text-xs text-slate-400">{t(lang, "loyTier")}</div>
            <div className="text-sm font-bold text-slate-700">Mèo Bạc</div>
            <div className="text-[11px] text-brand-dark truncate">{t(lang, "loyTierProg")}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Ring pct={0} center="👛" />
          <div className="min-w-0">
            <div className="text-xs text-slate-400">{t(lang, "loyWallet")}</div>
            <div className="text-sm font-semibold text-slate-500">{t(lang, "loySoon")}</div>
          </div>
        </div>
      </div>

      {/* Mission strip */}
      <div className="mt-4">
        <div className="text-xs font-semibold text-slate-500 mb-2">{t(lang, "loyMissions")}</div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {[t(lang, "loyM1"), t(lang, "loyM2"), t(lang, "loyM3")].map((m) => (
            <span
              key={m}
              className="shrink-0 text-xs bg-white border border-slate-200 text-slate-500 rounded-full px-3 py-1.5 opacity-80"
            >
              {m}
            </span>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">{t(lang, "loyNote")}</p>
    </section>
  );
}
