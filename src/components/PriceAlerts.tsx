import { useEffect, useMemo, useState } from "react";
import type { SpendCategory } from "../cards";
import { getDeals } from "../deals";
import { matchWishlist, countMatches, type WishlistItem } from "../wishlist";
import { catLabel, type Lang } from "../i18n";
import MeoHelpButton from "./MeoHelpButton";

// =============================================================================
// PriceAlerts — "Báo giá khi giảm"
// =============================================================================
//
// MOVED HERE 15 Aug 2026, from the bottom of the Mua gì tab (BuyFlow).
//
// User research on 14 Aug: "the site is too complicated for new users". Mua gì
// was carrying seven jobs at once — paste, search, amount, savings, payment
// layers, price alerts and a deals grid. Price watching is a *later* activity:
// you use it when you are NOT buying today, which is the opposite of what Mua
// gì is for. It belongs in Tối đa ưu đãi with the other squeeze-more-out tools.
//
// The move also let Mua gì fit on one screen without scrolling, which was the
// explicit ask.
//
// WHY THIS OWNS ITS OWN STATE. In BuyFlow the watch list borrowed that tab's
// `query` and `cat`, so "Watch" silently inherited whatever you had typed in
// the search box. Out here there is nothing to borrow, and that turns out to be
// better: the user names the thing they're waiting for, which is what actually
// ends up on the list. Storage key is unchanged, so existing lists survive.
// =============================================================================

const KEY_WISHLIST = "vicard.wishlist.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// Mirrors BuyFlow's CATS so the two tabs never disagree about what a category
// is called. ("grocery" is not a SpendCategory — the union calls it
// "supermarket"; the typecheck caught that before it shipped.)
const CATS: { key: SpendCategory; emoji: string }[] = [
  { key: "online", emoji: "💻" },
  { key: "dining", emoji: "🍜" },
  { key: "supermarket", emoji: "🛒" },
  { key: "travel", emoji: "🚗" },
  { key: "foreign", emoji: "✈️" },
];

function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

function safeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "w" + Math.random().toString(36).slice(2);
  }
}

export default function PriceAlerts({ lang }: { lang: Lang }) {
  const [items, setItems] = useState<WishlistItem[]>(() => load(KEY_WISHLIST, []));
  const [name, setName] = useState("");
  const [cat, setCat] = useState<SpendCategory>("online");
  const [target, setTarget] = useState(20);

  useEffect(() => {
    localStorage.setItem(KEY_WISHLIST, JSON.stringify(items));
  }, [items]);

  const deals = useMemo(() => getDeals(), []);
  const matches = useMemo(() => matchWishlist(items, deals), [items, deals]);
  const totalMatches = countMatches(matches);

  function addWatch() {
    const label = name.trim() || catLabel(lang, cat);
    setItems((prev) => [
      {
        id: safeId(),
        name: label,
        category: cat,
        targetDiscountPct: Math.min(90, Math.max(1, target || 1)),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setName("");
  }

  function removeWatch(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div>
      {/* id kept from the old Mua gì markup: the product tour spotlights
          "#price-alert-trigger". Deleting it silently broke tour step 4 — the
          step pointed at an element that no longer existed anywhere. */}
      <div id="price-alert-trigger" className="rounded-xl bg-slate-50 border border-slate-100 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500">
            {L(lang, "Watch a price", "Canh giá một món")}
          </span>
          <MeoHelpButton target="#price-alert-trigger" lang={lang} />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={L(lang, "What are you waiting for? e.g. AirPods", "Bạn đang chờ món gì? vd: AirPods")}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
        />

        <div className="flex flex-wrap gap-1.5">
          {CATS.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setCat(c.key)}
              className={
                "px-2.5 py-1 rounded-full text-xs border transition " +
                (cat === c.key
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand")
              }
            >
              {c.emoji} {catLabel(lang, c.key)}
            </button>
          ))}
        </div>

        <div className="flex items-end gap-3">
          <label className="block text-sm flex-1">
            <span className="text-slate-600">
              {L(lang, "Notify me at ≥", "Báo khi giảm ≥")} {target}%
            </span>
            <input
              type="range"
              min={5}
              max={70}
              step={5}
              value={target}
              onChange={(e) => setTarget(+e.target.value)}
              className="mt-2 w-full accent-brand"
            />
          </label>
          <button
            onClick={addWatch}
            className="bg-white border border-brand text-brand rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-light whitespace-nowrap"
          >
            🔔 {L(lang, "Watch", "Theo dõi")}
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">
            {L(lang, "Watching for deals", "Đang theo dõi ưu đãi")} ({items.length})
          </h3>
          {totalMatches > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 mb-2 text-xs text-emerald-700 font-medium">
              🎯{" "}
              {L(
                lang,
                totalMatches + " item(s) hit your target right now.",
                totalMatches + " món đạt mục tiêu ngay bây giờ."
              )}
            </div>
          )}
          <div className="space-y-2">
            {matches.map(({ item, deals: hits }) => {
              const hit = hits.length > 0;
              return (
                <div
                  key={item.id}
                  className={
                    "rounded-lg border p-3 " +
                    (hit ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-white")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400">
                        {catLabel(lang, item.category)} · ≥{item.targetDiscountPct}%
                      </div>
                    </div>
                    <button
                      onClick={() => removeWatch(item.id)}
                      className="text-slate-300 hover:text-red-500 text-lg leading-none"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                  {hit && (
                    <div className="mt-2 space-y-1.5">
                      {hits.map((d) => (
                        <a
                          key={d.id}
                          href={d.link}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-2 rounded bg-white border border-emerald-200 px-2.5 py-1.5 hover:border-emerald-400"
                        >
                          <span className="text-xs text-slate-700 truncate">{d.title}</span>
                          <span className="text-xs font-semibold text-emerald-600 shrink-0">{d.discountPct}% ↗</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
