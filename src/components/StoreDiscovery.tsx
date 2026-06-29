import { useMemo, useState } from "react";
import { CARDS, type SpendCategory } from "../cards";
import { REWARD_SOURCES } from "../rewardSources";
import { getFlashDeals } from "../deals";
import { rewardLink } from "../links";
import { t, catLabel, type Lang } from "../i18n";
import MerchantIcon from "./MerchantIcon";

// Store discovery: instant fuzzy search over the merchant list (logos + best
// rate, no slow directory page) + a personalised feed that bubbles up the
// user's most-visited stores (from trip history) alongside Flash deals.
// All "open store" actions are real <a target="_blank"> so they flow through
// the shopping-trip interstitial + logging.

type Store = { name: string; url: string; category: SpendCategory; rate: number };
const TRIPS_KEY = "mss_trips.v1";

function bestRateForCategory(cat: SpendCategory): number {
  let best = 0;
  for (const c of CARDS) for (const r of c.rewards) if (r.category === cat && r.rate > best) best = r.rate;
  if (best === 0) for (const c of CARDS) for (const r of c.rewards) if (r.category === "everything" && r.rate > best) best = r.rate;
  return Math.round(best * 100);
}

const STORES: Store[] = REWARD_SOURCES.map((s) => {
  const cat = s.categories.find((c) => c !== "everything") ?? s.categories[0] ?? "online";
  return { name: s.name, url: s.url, category: cat, rate: bestRateForCategory(cat) };
});

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function fuzzy(name: string, q: string): boolean {
  const n = norm(name);
  const x = norm(q.trim());
  if (!x) return false;
  if (n.includes(x)) return true;
  let i = 0;
  for (const ch of n) {
    if (ch === x[i]) i++;
    if (i === x.length) return true;
  }
  return false;
}

function findStore(merchant: string): Store | undefined {
  const m = norm(merchant);
  return STORES.find((s) => norm(s.name).includes(m) || m.includes(norm(s.name)));
}

type FreqStore = { name: string; url: string; count: number };
function frequentStores(): FreqStore[] {
  try {
    const raw = localStorage.getItem(TRIPS_KEY);
    if (!raw) return [];
    const trips = JSON.parse(raw) as { merchant: string; host: string }[];
    const counts = new Map<string, FreqStore>();
    for (const tr of trips) {
      const key = tr.merchant || tr.host;
      if (!key) continue;
      const store = findStore(key);
      const name = store?.name ?? tr.merchant ?? tr.host;
      const url = store?.url ?? (tr.host ? `https://${tr.host}` : "");
      const cur = counts.get(name) ?? { name, url, count: 0 };
      cur.count += 1;
      counts.set(name, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  } catch {
    return [];
  }
}

export default function StoreDiscovery({ lang }: { lang: Lang }) {
  const [q, setQ] = useState("");
  const flash = useMemo(() => getFlashDeals(), []);
  const frequent = useMemo(() => frequentStores(), []);
  const results = useMemo(
    () => (q.trim() ? STORES.filter((s) => fuzzy(s.name, q)).slice(0, 6) : []),
    [q]
  );

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-4">
      {/* Predictive search */}
      <div className="relative">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t(lang, "discPlaceholder")}
          className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2.5 text-sm"
        />
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔎</span>
        {q.trim() && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            {results.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-400">{t(lang, "discNoResults")}</div>
            ) : (
              results.map((s) => (
                <a
                  key={s.name}
                  href={rewardLink(s.name, s.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-3 py-2 hover:bg-brand-light"
                >
                  <MerchantIcon name={s.name} url={s.url} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-700 truncate">{s.name}</span>
                    <span className="block text-[11px] text-slate-400">{catLabel(lang, s.category)}</span>
                  </span>
                  <span className="text-xs font-semibold text-brand whitespace-nowrap">
                    {t(lang, "discUpTo", { n: s.rate })}
                  </span>
                </a>
              ))
            )}
          </div>
        )}
      </div>

      {/* Flash deals */}
      {flash.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">{t(lang, "discFlash")}</div>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {flash.map((d) => (
              <a
                key={d.id}
                href={d.link}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 w-44 rounded-xl border border-amber-200 bg-amber-50 p-3 hover:border-amber-400"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <MerchantIcon name={d.merchant} url={d.url} size={24} />
                  <span className="text-sm font-semibold text-slate-700 truncate">{d.merchant}</span>
                </div>
                <div className="text-sm">
                  <span className="text-slate-400 line-through">{d.baseRate}%</span>{" "}
                  <span className="text-amber-700 font-bold">→ {d.flashRate}%</span>
                </div>
                {d.flashEnds && <div className="text-[11px] text-amber-600 mt-0.5">⏳ {d.flashEnds}</div>}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Your stores (personalised from trip history) */}
      {frequent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-slate-500 mb-2">{t(lang, "discYourStores")}</div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {frequent.map((s) => (
              <a
                key={s.name}
                href={s.url ? rewardLink(s.name, s.url) : "#"}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 flex flex-col items-center gap-1 w-16"
                title={s.name}
              >
                <MerchantIcon name={s.name} url={s.url} size={40} />
                <span className="text-[11px] text-slate-500 text-center truncate w-full">{s.name}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
