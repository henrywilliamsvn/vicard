import { useEffect, useMemo, useRef, useState } from "react";
import type { SpendCategory } from "../cards";
import { getDeals } from "../deals";
import { matchWishlist, countMatches, type WishlistItem } from "../wishlist";

const CATEGORIES: { key: SpendCategory; label: string; emoji: string }[] = [
  { key: "online", emoji: "💻", label: "Online" },
  { key: "dining", emoji: "🍜", label: "Dining" },
  { key: "supermarket", emoji: "🛒", label: "Supermarket" },
  { key: "travel", emoji: "🚗", label: "Travel" },
  { key: "entertainment", emoji: "🎬", label: "Entertainment" },
  { key: "foreign", emoji: "✈️", label: "Foreign" },
  { key: "everything", emoji: "💳", label: "Everything else" },
];

const KEY_WISHLIST = "vicard.wishlist.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function catMeta(key: SpendCategory) {
  return CATEGORIES.find((c) => c.key === key) ?? { emoji: "🛍️", label: key };
}

export default function Wishlist({ notifyOn }: { notifyOn: boolean }) {
  const [items, setItems] = useState<WishlistItem[]>(() => load(KEY_WISHLIST, []));
  useEffect(() => {
    localStorage.setItem(KEY_WISHLIST, JSON.stringify(items));
  }, [items]);

  const [name, setName] = useState("");
  const [category, setCategory] = useState<SpendCategory>("online");
  const [target, setTarget] = useState(20);

  const deals = useMemo(() => getDeals(), []);
  const matches = useMemo(() => matchWishlist(items, deals), [items, deals]);
  const totalMatches = countMatches(matches);

  // Notify once per app-open when there are matches (only fires while open).
  const notifiedRef = useRef(false);
  useEffect(() => {
    if (notifiedRef.current) return;
    if (
      totalMatches > 0 &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      notifiedRef.current = true;
      new Notification("Deals on your wishlist 🎯", {
        body:
          totalMatches +
          " item" +
          (totalMatches === 1 ? "" : "s") +
          " on your list hit your target discount.",
      });
    }
  }, [totalMatches]);

  function addItem() {
    const n = name.trim();
    if (!n) return;
    setItems((prev) => [
      {
        id: crypto.randomUUID(),
        name: n,
        category,
        targetDiscountPct: Math.min(90, Math.max(1, target || 1)),
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ]);
    setName("");
    setTarget(20);
  }
  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-lg font-semibold mb-1">My wishlist</h2>
        <p className="text-sm text-slate-500 mb-3">
          Add what you want to buy and your target discount. When you open the
          app, we check today's deals and flag anything that hits your target.
        </p>

        {totalMatches > 0 && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 mb-4 text-sm text-emerald-700 font-medium">
            🎯 {totalMatches} deal{totalMatches === 1 ? "" : "s"} on your list hit
            your target right now — see the highlights below.
          </div>
        )}

        <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">What do you want to buy?</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addItem()}
              placeholder="e.g. AirPods, hotel in Da Nang…"
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
            />
          </label>
          <div className="flex gap-3">
            <label className="block text-sm flex-1">
              <span className="text-slate-600">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as SpendCategory)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.emoji} {c.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm w-40">
              <span className="text-slate-600">Notify at ≥ {target}% off</span>
              <input
                type="range"
                min={5}
                max={70}
                step={5}
                value={target}
                onChange={(e) => setTarget(+e.target.value)}
                className="mt-3 w-full accent-brand"
              />
            </label>
          </div>
          <button
            onClick={addItem}
            disabled={!name.trim()}
            className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40"
          >
            Add to wishlist
          </button>
        </div>

        {!notifyOn && (
          <p className="text-xs text-slate-400 mt-2">
            Tip: tap “Enable reminders” in the header to get a pop-up when a deal
            matches. Notifications only appear while the app is open.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your items ({items.length})</h2>
        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
            Nothing on your wishlist yet. Add something above.
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map(({ item, deals: hits }) => {
              const cm = catMeta(item.category);
              const hit = hits.length > 0;
              return (
                <div
                  key={item.id}
                  className={
                    "rounded-xl border p-4 " +
                    (hit
                      ? "border-emerald-300 bg-emerald-50/50"
                      : "border-slate-100 bg-white shadow-sm")
                  }
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {cm.emoji} {cm.label} · notify at ≥ {item.targetDiscountPct}% off
                      </div>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-300 hover:text-red-500 text-sm"
                      aria-label="Remove item"
                    >
                      x
                    </button>
                  </div>

                  {hit ? (
                    <div className="mt-3 space-y-2">
                      {hits.map((d) => (
                        <a
                          key={d.id}
                          href={d.link}
                          target="_blank"
                          rel="noreferrer"
                          className="block rounded-lg bg-white border border-emerald-200 px-3 py-2 hover:border-emerald-400 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-slate-700">{d.title}</span>
                            <span className="text-xs font-semibold text-emerald-600 shrink-0">
                              {d.discountPct}% ↗
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 mt-2">
                      No deal hits {item.targetDiscountPct}% yet — we'll flag it
                      here when one does.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
