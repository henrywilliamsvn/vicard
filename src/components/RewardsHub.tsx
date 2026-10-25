import { useEffect, useMemo, useState } from "react";
import type { SpendCategory } from "../cards";
import {
  allLinkableSources,
  buildStackingPlan,
  type RewardLayer,
  type RewardSource,
} from "../rewardSources";
import { rewardLink, hasAnyAffiliate } from "../links";
import PriceAlerts from "./PriceAlerts";
import { type Lang, t, catLabel } from "../i18n";

const CATEGORY_KEYS: { key: SpendCategory; emoji: string }[] = [
  { key: "online", emoji: "💻" },
  { key: "dining", emoji: "🍜" },
  { key: "supermarket", emoji: "🛒" },
  { key: "travel", emoji: "🚗" },
  { key: "entertainment", emoji: "🎬" },
  { key: "foreign", emoji: "✈️" },
  { key: "everything", emoji: "💳" },
];

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

function layerLabel(lang: Lang, layer: RewardLayer): string {
  return t(
    lang,
    layer === "portal" ? "layerPortal" : layer === "voucher" ? "layerVoucher" : layer === "wallet" ? "layerWallet" : "layerCard"
  );
}

function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

export default function RewardsHub({
  bestCardLabel,
  lang,
  onPickCards,
}: {
  bestCardLabel: (cat: SpendCategory) => string | undefined;
  lang: Lang;
  /** Open the "Bạn có thẻ nào?" picker — shown in the card step for card-less users. */
  onPickCards?: () => void;
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

  function stepTitle(layer: RewardLayer): string {
    return t(lang, layer === "portal" ? "stepPortalTitle" : layer === "voucher" ? "stepVoucherTitle" : layer === "wallet" ? "stepWalletTitle" : "stepCardTitle");
  }
  function stepDetail(layer: RewardLayer): string {
    if (layer === "card") {
      const label = bestCardLabel(category);
      return label ? t(lang, "stepCardDetail", { card: label }) : t(lang, "stepCardDetailGeneric");
    }
    return t(lang, layer === "portal" ? "stepPortalDetail" : layer === "voucher" ? "stepVoucherDetail" : "stepWalletDetail");
  }

  return (
    <div className="space-y-8">
      {/* ---- Step 1: How-to-optimize guide --------------------------------
          Made collapsible on 15 Aug 2026, matching the "Kết nối các ưu đãi"
          pattern directly below it. Before this the tab opened with a category
          picker and a full step list already expanded, so the two sections
          didn't behave the same way and the tab always opened long. Now it
          opens compact and the user chooses what to open.
          `open` by default: this is still step 1, so a first visit should show
          it — the value is being able to fold it away once you know it. ---- */}
      <details open className="group rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-800">{t(lang, "rhStackTitle")}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{t(lang, "rhStackSub")}</span>
          </span>
          <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
        </summary>

        <div className="px-4 pb-4 border-t border-slate-100 pt-4">

        <div className="flex flex-wrap gap-2 mb-4">
          {CATEGORY_KEYS.map((c) => (
            <button key={c.key} onClick={() => setCategory(c.key)} className={"px-3 py-1.5 rounded-full text-sm border transition " + (category === c.key ? "bg-brand text-white border-brand" : "bg-white text-slate-700 border-slate-200 hover:border-brand")}>
              {c.emoji} {catLabel(lang, c.key)}
            </button>
          ))}
        </div>

        <ol className="space-y-3">
          {plan.map((step) => (
            <li key={step.order} className="rounded-xl bg-white shadow-sm border border-slate-100 p-4">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-brand text-white text-sm font-semibold flex items-center justify-center shrink-0">{step.order}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{stepTitle(step.layer)}</span>
                    <span className={"text-[10px] font-medium px-1.5 py-0.5 rounded-full " + LAYER_BADGE[step.layer]}>{layerLabel(lang, step.layer)}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{stepDetail(step.layer)}</p>
                  {step.layer === "card" && !bestCardLabel(category) && onPickCards && (
                    <button
                      onClick={onPickCards}
                      className="mt-2 text-xs bg-brand text-white rounded-full px-3 py-1.5 font-medium hover:bg-brand-dark transition"
                    >
                      💳 {L(lang, "Pick the cards you have", "Chọn thẻ bạn đang có")}
                    </button>
                  )}
                  {step.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {step.sources.map((s) => {
                        const isLinked = !!linked[s.name];
                        return (
                          <a key={s.name} href={rewardLink(s.name, s.url)} target="_blank" rel="noreferrer" title={s.note} className={"text-xs px-2 py-1 rounded-full hover:opacity-80 " + (isLinked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                            {(isLinked ? "✓ " : "") + s.name + " ↗"}
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

        <p className="text-xs text-slate-400 mt-4">{t(lang, "rhPromoNote")}</p>
        </div>
      </details>

      {/* ---- Step 2: Link your reward sources (collapsible, below guide) --- */}
      <details className="group rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-800">{t(lang, "rhLinkTitle")}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{t(lang, "rhLinkToggleHint")}</span>
          </span>
          <span className="shrink-0 flex items-center gap-2">
            <span className={"text-xs font-medium " + (linkedCount === sources.length ? "text-emerald-600" : "text-slate-500")}>{linkedCount} / {sources.length}</span>
            <span className="text-slate-400 transition-transform group-open:rotate-180">▾</span>
          </span>
        </summary>

        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500 mb-3">{t(lang, "rhLinkSub")}</p>

          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-4">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>{t(lang, "rhLinked")}</span>
              <span>{linkedCount} / {sources.length}</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-brand transition-all" style={{ width: pct + "%" }} />
            </div>
            {linkedCount === sources.length && (
              <p className="text-xs text-emerald-600 mt-2 font-medium">{t(lang, "rhAllLinked")}</p>
            )}
          </div>

          <div className="space-y-5">
            {(Object.keys(byLayer) as RewardLayer[]).map((layer) => (
              <div key={layer}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={"text-xs font-medium px-2 py-0.5 rounded-full " + LAYER_BADGE[layer]}>
                    {layerLabel(lang, layer)}
                  </span>
                </div>
                <div className="space-y-2">
                  {byLayer[layer]!.map((s) => {
                    const isLinked = !!linked[s.name];
                    return (
                      <div key={s.name} className={"rounded-xl border p-3 transition " + (isLinked ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-white")}>
                        <div className="flex items-start gap-3">
                          <button onClick={() => toggleLinked(s.name)} aria-label="toggle linked" className={"mt-0.5 w-5 h-5 rounded flex items-center justify-center text-[11px] text-white shrink-0 " + (isLinked ? "bg-emerald-500" : "bg-slate-200")}>
                            {isLinked ? "✓" : ""}
                          </button>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800 text-sm">{s.name}</span>
                              <a href={rewardLink(s.name, s.setupUrl ?? s.url)} target="_blank" rel="noreferrer" className="text-xs text-brand hover:underline shrink-0 ml-2">
                                {(isLinked ? t(lang, "open") : t(lang, "setUp")) + " ↗"}
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
        </div>
      </details>

      {/* ---- Price alerts — moved here from Mua gì on 15 Aug 2026 ---------
          Watching a price is what you do when you are NOT buying today, so it
          belongs with the other squeeze-more-out tools rather than in the
          buy-now flow. Collapsed by default: it is the newest thing on this
          tab and the least urgent. -------------------------------------- */}
      <details className="group rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-base font-semibold text-slate-800">{t(lang, "rhAlertTitle")}</span>
            <span className="block text-xs text-slate-500 mt-0.5">{t(lang, "rhAlertSub")}</span>
          </span>
          <span className="shrink-0 text-slate-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          <PriceAlerts lang={lang} />
        </div>
      </details>


      {/* ---- Pointer to the Deals tab (replaces the old duplicate list) ---- */}
      <div className="text-center">
        <p className="text-xs text-slate-400">{t(lang, "rhDealsMoved")}</p>
        {hasAnyAffiliate() && (
          <p className="text-[11px] text-slate-400 mt-2 leading-snug">{t(lang, "rhDisclosure")}</p>
        )}
      </div>
    </div>
  );
}
