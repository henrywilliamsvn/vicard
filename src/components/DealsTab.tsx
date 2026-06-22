import { useMemo, useState } from "react";
import { getDeals } from "../deals";
import { catLabel, t, type Lang } from "../i18n";
import type { SpendCategory } from "../cards";

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
            <a
              key={d.id}
              href={d.link}
              target="_blank"
              rel="noreferrer"
              className="block bg-white border border-slate-200 rounded-xl p-4 hover:border-brand transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-brand font-medium mb-0.5">
                    {d.merchant} · {catLabel(lang, d.category)}
                  </div>
                  <div className="text-sm font-medium text-slate-800">{d.title}</div>
                  {d.expires && (
                    <div className="text-xs text-slate-400 mt-1">{d.expires}</div>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-bold text-emerald-600">-{d.discountPct}%</div>
                  <div className="text-xs text-brand">↗</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
