import { useMemo } from "react";
import { REWARD_SOURCES } from "../rewardSources";
import { rewardLink } from "../links";
import { t, type Lang } from "../i18n";
import MerchantIcon from "./MerchantIcon";

// "Cửa hàng của bạn" — a personalised strip of the user's most-visited stores
// (from trip history). The store search bar and Flash-deals row that used to
// live here were merged into the single Mua-gì search bar and the unified
// "Deal cho bạn" grid, so this component is now just the personalised strip.

const TRIPS_KEY = "mss_trips.v1";
type Store = { name: string; url: string };
const STORE_INDEX: Store[] = REWARD_SOURCES.map((s) => ({ name: s.name, url: s.url }));

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function findStore(merchant: string): Store | undefined {
  const m = norm(merchant);
  return STORE_INDEX.find((s) => norm(s.name).includes(m) || m.includes(norm(s.name)));
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
  const frequent = useMemo(() => frequentStores(), []);
  if (frequent.length === 0) return null;

  return (
    <section className="rounded-xl bg-white shadow-sm border border-slate-100 p-4">
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
    </section>
  );
}
