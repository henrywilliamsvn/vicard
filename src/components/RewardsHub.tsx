import { useEffect, useMemo, useState } from "react";
import type { SpendCategory } from "../cards";
import {
  allLinkableSources,
  buildStackingPlan,
  type RewardLayer,
  type RewardSource,
} from "../rewardSources";

const CATEGORIES: { key: SpendCategory; label: string; emoji: string }[] = [
  { key: "online", emoji: "💻", label: "Online" },
  { key: "dining", emoji: "🍜", label: "Dining" },
  { key: "supermarket", emoji: "🛒", label: "Supermarket" },
  { key: "travel", emoji: "🚗", label: "Travel" },
  { key: "entertainment", emoji: "🎬", label: "Entertainment" },
  { key: "foreign", emoji: "✈️", label: "Foreign" },
  { key: "everything", emoji: "💳", label: "Everything else" },
];

const LAYER_LABEL: Record<RewardLayer, string> = {
  portal: "Cashback portals",
  voucher: "Vouchers & coins",
  wallet: "E-wallets",
  card: "Card",
};

const LAYER_BADGE: Record<RewardLayer, string> = {
  portal: "bg-violet-100 text-violet-700",
  voucher: "bg-amber-100 text-amber-700",
  wallet: "bg-sky-100 text-sky-700",
  card: "bg-brand-light text-brand-dark",
};

const KEY_LINKED = "vicard.linked.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function RewardsHub({
  bestCardLabel,
}: {
  bestCardLabel: (cat: SpendCategory) => string | undefined;
}) {
  const [linked, setLinked] = useState<Record<string, boolean>>(() =>
    load(KEY_LINKED, {})
  );
  useEffect(() => {
    localStorage.setItem(KEY_LINKED, JSON.stringify(linked));
  }, [linked]);

  function toggleLinked(name: string) {
    setLinked((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  const sources = allLinkableSources();
  const byLayer = useMemo(() => {
    const groups: Partial<Record<RewardLayer, RewardSource[]>> = {};
    for (const s of sources) {
      (groups[s.layer] ??= []).push(s);
    }
    return groups;
  }, [sources]);

  const linkedCount = sources.filter((s) => linked[s.name]).length;
  const pct = Math.round((linkedCount / sources.length) * 100);

  const [category, setCategory] = useState<SpendCategory>("online");
  const plan = useMemo(
    () => buildStackingPlan(category, bestCardLabel(category)),
    [category, bestCardLabel]
  );

  return (
    <div className="space-y-8">
      {/* ---- Step 1: Link everything once ---------------------------------- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">1 · Link up your rewards</h2>
        <p className="text-sm text-slate-500 mb-3">
          Set these up once. Tick each as you go — then every purchase can stack
          all of them.
        </p>

        <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 mb-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Linked</span>
            <span>
              {linkedCount} / {sources.length}
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: pct + "%" }}
            />
          </div>
          {linkedCount === sources.length && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              🎉 All linked — you're set to stack on every purchase.
            </p>
          )}
        </div>

        <div className="space-y-5">
          {(Object.keys(byLayer) as RewardLayer[]).map((layer) => (
            <div key={layer}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={
                    "text-xs font-medium px-2 py-0.5 rounded-full " +
                    LAYER_BADGE[layer]
                  }
                >
                  {LAYER_LABEL[layer]}
                </span>
              </div>
              <div className="space-y-2">
                {byLayer[layer]!.map((s) => {
                  const isLinked = !!linked[s.name];
                  return (
                    <div
                      key={s.name}
                      className={
                        "rounded-xl border p-3 transition " +
                        (isLinked
                          ? "border-emerald-200 bg-emerald-50/50"
                          : "border-slate-100 bg-white")
                      }
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => toggleLinked(s.name)}
                          aria-label={isLinked ? "Mark not linked" : "Mark linked"}
                          className={
                            "mt-0.5 w-5 h-5 rounded flex items-center justify-center text-[11px] text-white shrink-0 " +
                            (isLinked ? "bg-emerald-500" : "bg-slate-200")
                          }
                        >
                          {isLinked ? "✓" : ""}
                        </button>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-800 text-sm">
                              {s.name}
                            </span>
                            <a
                              href={s.setupUrl ?? s.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-brand hover:underline shrink-0 ml-2"
                            >
                              {isLinked ? "Open ↗" : "Set up ↗"}
                            </a>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{s.setup}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Step 2: Per-purchase stacking guide --------------------------- */}
      <section>
        <h2 className="text-lg font-semibold mb-1">2 · Stack a purchase</h2>
        <p className="text-sm text-slate-500 mb-3">
          Pick what you're buying — follow the steps in order to layer every
          discount.
        </p>

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={
                "px-3 py-1.5 rounded-full text-sm border transition " +
                (category === c.key
                  ? "bg-brand text-white border-brand"
                  : "bg-white text-slate-700 border-slate-200 hover:border-brand")
              }
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <ol className="space-y-3">
          {plan.map((step) => (
            <li
              key={step.order}
              className="rounded-xl bg-white shadow-sm border border-slate-100 p-4"
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand text-white text-sm font-semibold flex items-center justify-center shrink-0">
                  {step.order}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">
                      {step.title}
                    </span>
                    <span
                      className={
                        "text-[10px] font-medium px-1.5 py-0.5 rounded-full " +
                        LAYER_BADGE[step.layer]
                      }
                    >
                      {LAYER_LABEL[step.layer]}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{step.detail}</p>
                  {step.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {step.sources.map((s) => {
                        const isLinked = !!linked[s.name];
                        return (
                          <a
                            key={s.name}
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            title={s.note}
                            className={
                              "text-xs px-2 py-1 rounded-full hover:opacity-80 " +
                              (isLinked
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-600")
                            }
                          >
                            {isLinked ? "✓ " : ""}
                            {s.name} ↗
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <p className="text-xs text-slate-400 mt-4">
          Promo rates change constantly — always check each app's voucher tab
          before paying. Not financial advice.
        </p>
      </section>
    </div>
  );
}
