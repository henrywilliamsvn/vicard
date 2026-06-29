import { useMemo, useState } from "react";
import { getDeals } from "../deals";
import { catLabel, t, type Lang } from "../i18n";
import type { SpendCategory } from "../cards";
import DealCard from "./DealCard";

// Standalone "Deals" tab — a filterable list of current deals. Each deal's link
// is already routed through the affiliate layer (see deals.ts / getDeals), so
// qualifying purchases earn commission automatically.
export default function DealsTab({ lang }: { lang: Lang }) {
  const all = useMemo(() => getDeals(), []);
  const cats = useMemo(
    () => Array.from(new Set(all.map((d) => d.category))) as SpendCategory[],
    [all]
  );
  const [cat, setCat] = useState<SpendCategory | "all">("all");
  const deals = cat === "all" ? all : all.filter((d) => d.category === cat);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-1">{t(lang, "dealsTitle")}</h2>
        <p className="text-sm text-slate-500">{t(lang, "dealsSub")}</p>
      </div>

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

      {deals.length === 0 ? (
        <p className="text-sm text-slate-500">{t(lang, "dealsEmpty")}</p>
      ) : (
        <div className="space-y-3">
          {deals.map((d) => (
            <DealCard key={d.id} deal={d} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
