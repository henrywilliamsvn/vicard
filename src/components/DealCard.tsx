import MerchantIcon from "./MerchantIcon";
import { catLabel, t, type Lang } from "../i18n";
import type { DealWithLink } from "../deals";

// Shared deal card (mockup style): merchant logo + hero rate + flash badge +
// category/urgency + "Mở & Hoàn tiền" CTA. The whole card is the affiliate
// link, so a click flows through the redirect interstitial + earns commission.
export default function DealCard({ deal: d, lang }: { deal: DealWithLink; lang: Lang }) {
  const rate = d.flash && d.flashRate ? d.flashRate : d.discountPct;
  return (
    <a
      href={d.link}
      target="_blank"
      rel="noreferrer"
      className="block bg-white border border-slate-200 rounded-2xl p-4 hover:border-brand transition shadow-sm"
    >
      <div className="flex items-center gap-3">
        <MerchantIcon name={d.merchant} url={d.url} size={42} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800 truncate">{d.merchant}</span>
            {d.flash && (
              <span className="shrink-0 text-[10px] font-bold text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">
                ⚡ {lang === "vi" ? "Chớp nhoáng" : "Flash"}
              </span>
            )}
          </div>
          <div className="text-xl font-extrabold text-brand-dark leading-tight">
            {t(lang, "discUpTo", { n: rate })}
          </div>
        </div>
      </div>
      <div className="text-sm text-slate-600 mt-2">{d.title}</div>
      <div className="text-xs text-slate-400 mt-1">
        {catLabel(lang, d.category)}
        {d.expires ? ` · ⏳ ${d.expires}` : ""}
      </div>
      <div className="mt-3 bg-brand text-white rounded-xl py-2.5 text-center font-bold text-sm">
        {t(lang, "dealOpen")}
      </div>
    </a>
  );
}
