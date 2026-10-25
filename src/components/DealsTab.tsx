import { useMemo, useState } from "react";
import { getDeals, getFlashDeals } from "../deals";
import { catLabel, t, type Lang } from "../i18n";
import { bestCardFor, type OwnedCardState, type SpendCategory } from "../cards";
import DealCard from "./DealCard";
import MerchantIcon from "./MerchantIcon";

// Standalone "Deals" tab — a filterable list of current deals. Each deal's link
// is already routed through the affiliate layer (see deals.ts / getDeals), so
// qualifying purchases earn commission automatically.
//
// v2 (Jul 3): ⚡ flash-boost strip (getFlashDeals was built but never rendered
// here), plus Buy-tab-style personalization — when a category is selected we
// show which of YOUR cards stacks best on top of the deal, or the card picker
// CTA for card-less users. Same trust principle as the "Bạn có thẻ nào?" work.

function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

interface Props {
  lang: Lang;
  ownedStates?: OwnedCardState[];
  onPickCards?: () => void;
}

export default function DealsTab({ lang, ownedStates = [], onPickCards }: Props) {
  const all = useMemo(() => getDeals(), []);
  const flash = useMemo(() => getFlashDeals(), []);
  const cats = useMemo(
    () => Array.from(new Set(all.map((d) => d.category))) as SpendCategory[],
    [all]
  );
  const [cat, setCat] = useState<SpendCategory | "all">("all");
  const deals = cat === "all" ? all : all.filter((d) => d.category === cat);

  const best = useMemo(
    () => (cat === "all" ? null : bestCardFor(cat, ownedStates)),
    [cat, ownedStates]
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t(lang, "dealsTitle")}</h2>
        <p className="text-sm text-slate-500">{t(lang, "dealsSub")}</p>
      </div>

      {flash.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-bold text-slate-800">⚡ {L(lang, "Flash boosts", "Deal chớp nhoáng")}</h3>
            <span className="text-[10px] font-medium text-amber-700 bg-amber-50 rounded-full px-2 py-0.5">{L(lang, "limited time", "số lượng có hạn")}</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {flash.map((d) => (
              <a
                key={d.id}
                href={d.link}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 w-44 rounded-xl border border-amber-200 bg-amber-50/60 p-3 hover:border-brand transition"
              >
                <div className="flex items-center gap-2">
                  <MerchantIcon name={d.merchant} url={d.url} size={24} />
                  <span className="text-sm font-bold text-slate-800 truncate">{d.merchant}</span>
                </div>
                <div className="mt-1.5">
                  {d.baseRate != null && (
                    <span className="text-xs text-slate-400 line-through mr-1">{d.baseRate}%</span>
                  )}
                  <span className="text-lg font-extrabold text-brand-dark">{d.flashRate ?? d.discountPct}%</span>
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5 truncate">⏳ {d.flashEnds ?? d.expires ?? ""}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCat("all")}
          className={
            "text-xs px-3 py-1.5 rounded-full " +
            (cat === "all" ? "bg-brand text-white" : "bg-slate-100 text-slate-600")
          }
        >
          {t(lang, "dealsAll")}
        </button>
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={
              "text-xs px-3 py-1.5 rounded-full " +
              (cat === c ? "bg-brand text-white" : "bg-slate-100 text-slate-600")
            }
          >
            {catLabel(lang, c)}
          </button>
        ))}
      </div>

      {cat !== "all" &&
        (best ? (
          <div className="rounded-lg bg-brand-light border border-brand/20 px-3 py-2 text-xs text-brand-dark">
            💳{" "}
            {L(
              lang,
              `Pay with ${best.card.product} — stack ${Math.round(best.rule.rate * 100)}% cashback ON TOP of these deals.`,
              `Quẹt ${best.card.product} — hoàn thêm ${Math.round(best.rule.rate * 100)}% CHỒNG lên các deal này.`
            )}
          </div>
        ) : onPickCards ? (
          <button
            onClick={onPickCards}
            className="w-full rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 text-left hover:border-brand transition"
          >
            💳{" "}
            {L(
              lang,
              "Pick the cards you have — Meo will show which one stacks best on top of each deal.",
              "Chọn thẻ bạn đang có — Meo sẽ chỉ thẻ nào hoàn thêm nhiều nhất chồng lên deal."
            )}
          </button>
        ) : null)}

      {deals.length === 0 ? (
        <p className="text-sm text-slate-500">{t(lang, "dealsEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
