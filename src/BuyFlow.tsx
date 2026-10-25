import { useEffect, useMemo, useState } from "react";
import { CARDS, bestCardFor, type CardProduct, type RewardRule, type OwnedCardState, type SpendCategory } from "./cards";
import { buildStackingPlan, REWARD_SOURCES } from "./rewardSources";
import { cardApplyLink, rewardLink } from "./links";
import { catLabel, type Lang } from "./i18n";
import MoneyInput from "./components/MoneyInput";
import MerchantIcon from "./components/MerchantIcon";
import MeoHelpButton from "./components/MeoHelpButton";
import { BasketList, BasketAdvice, addToBasket } from "./components/BasketPanel";
import StoreDiscovery from "./components/StoreDiscovery";
import LoyaltyPreview from "./components/LoyaltyPreview";
import PremiumUpsell from "./components/PremiumUpsell";
import { usePremium } from "./lib/premium";
import { trackEvent } from "./lib/track";
import { trackAction } from "./lib/track";

// =============================================================================
// BuyFlow — the "Giỏ hàng" tab.
// =============================================================================
//
// ⚠️ THE ORDER OF THE FOUR BLOCKS BELOW IS THE FEATURE. Henry set it on 17 Aug
// 2026 after using the restructured app, and it is a reading order, not a
// layout preference:
//
//   1. What you're buying      — the list you already chose. Read-only.
//   2. What you want next      — the only place that adds to the list.
//   3. What Meo suggests       — the verdict, and how to pay for it.
//   4. Premium                 — the ask, last, after the value is delivered.
//
// The rule that keeps it honest: a block never does another block's job. Block 1
// shows and never collects (no add box, no price field — those moved to 2).
// Block 2 collects and never advises. Block 3 advises and never collects. If a
// control starts drifting between them, this tab goes back to being the "too
// complicated" screen the 14 Aug research complained about.
// =============================================================================

interface Props {
  ownedStates: OwnedCardState[];
  lang: Lang;
  onAddCards: () => void;
  /** Open the quick "Bạn có thẻ nào?" picker (falls back to onAddCards). */
  onPickCards?: () => void;
}

const CATS: { key: SpendCategory; icon: string }[] = [
  { key: "dining", icon: "🍜" },
  { key: "supermarket", icon: "🛒" },
  { key: "online", icon: "💻" },
  { key: "foreign", icon: "✈️" },
  { key: "fuel", icon: "⛽" },
  { key: "travel", icon: "🚗" },
  { key: "education", icon: "🎓" },
  { key: "entertainment", icon: "🎬" },
  { key: "insurance", icon: "🛡️" },
  { key: "everything", icon: "💳" },
];

function vnd(n: number): string { return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"; }
function L(lang: Lang, en: string, vi: string): string { return lang === "vi" ? vi : en; }
function pct(rate: number): number { return Math.round(rate * 100); }
const PICK_ONE: Record<string, boolean> = { portal: true, wallet: true };

type StoreLite = { name: string; url: string; category: SpendCategory; rate: number };
function bestRateForCat(cat: SpendCategory): number {
  let b = 0;
  for (const c of CARDS) for (const r of c.rewards) if (r.category === cat && r.rate > b) b = r.rate;
  if (b === 0) for (const c of CARDS) for (const r of c.rewards) if (r.category === "everything" && r.rate > b) b = r.rate;
  return Math.round(b * 100);
}
const STORES: StoreLite[] = REWARD_SOURCES.map((s) => {
  const cat = s.categories.find((c) => c !== "everything") ?? s.categories[0] ?? "online";
  return { name: s.name, url: s.url, category: cat, rate: bestRateForCat(cat) };
});
function norm(s: string): string { return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }
function fuzzyStore(name: string, q: string): boolean {
  const n = norm(name); const x = norm(q.trim());
  if (!x) return false;
  if (n.includes(x)) return true;
  let i = 0;
  for (const ch of n) { if (ch === x[i]) i++; if (i === x.length) return true; }
  return false;
}
// Pull a price straight out of pasted text (URLs stripped so product IDs are
// never mistaken for a price). A bare URL yields nothing here — that path goes
// to the /api/price worker instead.
function extractPrice(text: string): number | null {
  const noUrls = text.replace(/https?:\/\/\S+/g, " ");
  const tokens = noUrls.match(/\d[\d.,]{3,}/g);
  if (!tokens) return null;
  let best = 0;
  for (const tkn of tokens) {
    const n = parseInt(tkn.replace(/[.,\s]/g, ""), 10);
    if (!isNaN(n) && n >= 1000 && n <= 1_000_000_000 && n > best) best = n;
  }
  return best > 0 ? best : null;
}
function firstUrl(text: string): string | null {
  const m = text.match(/https?:\/\/\S+/);
  return m ? m[0] : null;
}

interface Ranked { card: CardProduct; rule: RewardRule; remaining: number | null; }

function detectMerchant(q: string, lang: Lang): { merchant: string; category: SpendCategory } | null {
  const s = q.toLowerCase();
  const looksLink = /https?:\/\//.test(s) || s.includes(".vn") || s.includes(".com");
  if (!looksLink) return null;
  const map: { host: string; merchant: string; category: SpendCategory }[] = [
    { host: "shopeefood", merchant: "ShopeeFood", category: "dining" },
    { host: "shopee", merchant: "Shopee", category: "online" },
    { host: "lazada", merchant: "Lazada", category: "online" },
    { host: "tiki", merchant: "Tiki", category: "online" },
    { host: "tiktok", merchant: "TikTok Shop", category: "online" },
    { host: "sendo", merchant: "Sendo", category: "online" },
    { host: "agoda", merchant: "Agoda", category: "travel" },
    { host: "booking", merchant: "Booking.com", category: "travel" },
    { host: "klook", merchant: "Klook", category: "travel" },
    { host: "traveloka", merchant: "Traveloka", category: "travel" },
    { host: "grab", merchant: "Grab", category: "travel" },
    { host: "baemin", merchant: "Baemin", category: "dining" },
  ];
  for (const m of map) if (s.includes(m.host)) return { merchant: m.merchant, category: m.category };
  return { merchant: L(lang, "this link", "liên kết này"), category: "online" };
}

type PriceStatus = "idle" | "loading" | "done" | "none" | "error";

export default function BuyFlow({ ownedStates, lang, onAddCards, onPickCards }: Props) {
  const pickCards = onPickCards ?? onAddCards;
  const [isPremium] = usePremium();
  const [cat, setCat] = useState<SpendCategory>("online");
  const [amount, setAmount] = useState<number>(0);
  const [query, setQuery] = useState<string>("");
  const [priceStatus, setPriceStatus] = useState<PriceStatus>("idle");
  // Which stacking step the user is on. Added 15 Aug 2026 (item 6 of the user
  // research): the four layers were shown as a flat grid, so people could not
  // tell whether they had finished one and should move to the next. Now exactly
  // one step is "current", everything before it is ticked, and there is an
  // explicit button to advance — nobody has to infer that they are done.
  const [doneSteps, setDoneSteps] = useState(0);
  // A new basket is a new run through the layers.
  useEffect(() => { setDoneSteps(0); }, [query, cat]);

  const detected = useMemo(() => detectMerchant(query, lang), [query, lang]);
  useEffect(() => { if (detected) setCat(detected.category); }, [detected]);
  // 1) price present in the pasted text → use it directly
  useEffect(() => { const p = extractPrice(query); if (p) setAmount(p); }, [query]);
  // 2) bare product URL (no price in text) → ask the worker to read the page price
  useEffect(() => {
    const link = firstUrl(query);
    if (!link || extractPrice(query)) { setPriceStatus("idle"); return; }
    let cancelled = false;
    setPriceStatus("loading");
    const timer = setTimeout(() => {
      fetch("/api/price?url=" + encodeURIComponent(link))
        .then((r) => r.json())
        .then((d: { price?: number | null }) => {
          if (cancelled) return;
          if (d && typeof d.price === "number" && d.price > 0) { setAmount(d.price); setPriceStatus("done"); }
          else setPriceStatus("none");
        })
        .catch(() => { if (!cancelled) setPriceStatus("error"); });
    }, 500);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);

  const storeResults = useMemo(() => {
    const q = query.trim();
    if (!q || detected) return [];
    return STORES.filter((s) => fuzzyStore(s.name, q)).slice(0, 5);
  }, [query, detected]);

  const marketBest = useMemo(() => {
    let top: { card: CardProduct; rule: RewardRule } | null = null;
    for (const card of CARDS) {
      const rule = card.rewards.find((r) => r.category === cat) ?? card.rewards.find((r) => r.category === "everything");
      if (!rule) continue;
      if (!top || rule.rate > top.rule.rate) top = { card, rule };
    }
    return top;
  }, [cat]);

  const ranked = useMemo<Ranked[]>(() => {
    const list: Ranked[] = [];
    for (const os of ownedStates) {
      const card = CARDS.find((c) => c.id === os.id);
      if (!card) continue;
      const rule = card.rewards.find((r) => r.category === cat) ?? card.rewards.find((r) => r.category === "everything");
      if (!rule) continue;
      const cap = os.capVND != null ? os.capVND : card.totalCapVND ?? null;
      const remaining = cap != null ? Math.max(0, cap - os.usedThisPeriodVND) : null;
      list.push({ card, rule, remaining });
    }
    return list.sort((a, b) => b.rule.rate - a.rule.rate);
  }, [cat, ownedStates]);

  const best = useMemo(() => bestCardFor(cat, ownedStates), [cat, ownedStates]);
  const ownsMarketBest = !!marketBest && ownedStates.some((o) => o.id === marketBest.card.id);

  const cardCashback = useMemo(() => {
    if (!best || amount <= 0) return null;
    const os = ownedStates.find((s) => s.id === best.card.id);
    const cap = os?.capVND != null ? os.capVND : best.card.totalCapVND ?? null;
    const used = os?.usedThisPeriodVND ?? 0;
    const remaining = cap != null ? Math.max(0, cap - used) : null;
    const raw = amount * best.rule.rate;
    const capped = remaining != null ? Math.min(raw, remaining) : raw;
    return { raw, capped, remaining };
  }, [best, amount, ownedStates]);

  const overflowCard = useMemo(() => {
    if (!best || !cardCashback || cardCashback.remaining == null) return null;
    if (cardCashback.raw <= cardCashback.remaining) return null;
    return ranked.find((r) => r.card.id !== best.card.id && (r.remaining == null || r.remaining > 0)) ?? null;
  }, [best, cardCashback, ranked]);

  const steps = useMemo(() => buildStackingPlan(cat, best?.card.product), [cat, best]);
  const applyUrl = marketBest ? cardApplyLink(marketBest.card.bank) : undefined;

  // Answer header: show the merchant name when we recognized one (a pasted
  // Shopee/Tiki/… link used to print the raw URL here), else the typed query,
  // else the category.
  const planLabel = detected ? detected.merchant : query.trim() ? query.trim() : catLabel(lang, cat);

  // Funnel: the user got a real answer (merchant recognized or amount entered).
  useEffect(() => {
    if (detected || amount > 0) trackEvent("answer");
  }, [detected, amount]);

  // Block 2's one job. A typed item or a pasted link becomes a row in block 1;
  // this is now the ONLY add path inside the tab (Xem giá is the other one).
  const canAdd = query.trim().length > 0;
  function addCurrent() {
    const name = detected ? detected.merchant : query.trim();
    if (!name) return;
    trackAction("basket_item_added", { source: detected ? "link" : "typed", hasAmount: amount > 0 });
    addToBasket(name, cat, amount);
    setQuery("");
    setAmount(0);
    setPriceStatus("idle");
  }

  const LAYER_SHORT: Record<string, string> = {
    portal: L(lang, "Portal", "Cổng"),
    voucher: L(lang, "Voucher", "Voucher"),
    card: L(lang, "Card", "Thẻ"),
    wallet: L(lang, "Wallet", "Ví"),
  };

  return (
    <div className="space-y-5">
      {/* ============================================================
          1 · Their purchase list. Display only — see the header note.
          ============================================================ */}
      <BasketList ownedStates={ownedStates} lang={lang} />

      {/* ============================================================
          2 · What they want to buy next. The only add box on this tab.
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-xl font-bold">{L(lang, "What do you want to buy next?", "Bạn muốn mua gì tiếp?")}</h2>
          <MeoHelpButton target="#search-input" lang={lang} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {CATS.map((c) => {
            const on = c.key === cat;
            return (
              <button key={c.key} onClick={() => setCat(c.key)}
                className={"flex items-center gap-1.5 px-3.5 py-2 rounded-full border text-sm whitespace-nowrap transition shrink-0 " + (on ? "border-brand bg-brand text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand")}>
                <span className="text-base">{c.icon}</span>
                {catLabel(lang, c.key)}
              </button>
            );
          })}
        </div>
        <div className="mt-2 rounded-xl border border-slate-200 bg-white px-3 pt-2 pb-2.5">
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔎</span>
            <input id="search-input" value={query} onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && canAdd) addCurrent(); }}
              placeholder={L(lang, "Search a store, paste a link, or type an item…", "Tìm cửa hàng, dán link, hoặc nhập món hàng…")} className="w-full text-sm outline-none pl-6" />
            {storeResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
                {storeResults.map((s) => (
                  <a key={s.name} href={rewardLink(s.name, s.url)} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-3 py-2 hover:bg-brand-light">
                    <MerchantIcon name={s.name} url={s.url} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-slate-700 truncate">{s.name}</span>
                      <span className="block text-[11px] text-slate-400">{catLabel(lang, s.category)}</span>
                    </span>
                    <span className="text-xs font-semibold text-brand whitespace-nowrap">{L(lang, "up to", "tới")} {s.rate}%</span>
                  </a>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
            <span className="text-xs text-slate-500 shrink-0">{L(lang, "Amount (optional)", "Số tiền (tuỳ chọn)")}</span>
            <div className="min-w-0"><MoneyInput value={amount} onChange={setAmount} lang={lang} /></div>
          </div>
          {detected && (
            <div className="mt-1.5 text-xs text-brand-dark bg-brand-light inline-block rounded-full px-3 py-1">🔗 {detected.merchant} → {catLabel(lang, detected.category)}{amount > 0 ? " · " + vnd(amount) : ""}</div>
          )}
          {detected && priceStatus === "loading" && (
            <div className="mt-1 text-xs text-slate-400">⏳ {L(lang, "Reading the price…", "Đang đọc giá…")}</div>
          )}
          {detected && (priceStatus === "none" || priceStatus === "error") && amount === 0 && (
            <div className="mt-1 text-xs text-slate-400">{L(lang, "Couldn't auto-read the price — enter the amount to see savings.", "Chưa đọc được giá tự động — nhập số tiền để xem tiết kiệm.")}</div>
          )}
          <button
            onClick={addCurrent}
            disabled={!canAdd}
            className={"mt-2 w-full rounded-lg py-2 text-sm font-semibold transition " + (canAdd ? "bg-brand text-white hover:bg-brand-dark" : "bg-slate-100 text-slate-400 cursor-not-allowed")}
          >
            + {L(lang, "Add to my list", "Thêm vào danh sách")}
          </button>
        </div>

        <div className="mt-3">
          <StoreDiscovery lang={lang} />
        </div>
      </div>

      {/* ============================================================
          3 · Suggestion from us — the verdict, then how to pay for it.
          ============================================================ */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold">🐱 {L(lang, "What Meo suggests", "Meo gợi ý")}</h2>

        {/* Information only. The CTA lives in the savings card below it — two
            identical orange buttons stacked was the 18 Aug duplication. */}
        <BasketAdvice ownedStates={ownedStates} lang={lang} />

        <div id="cashback-comparison-section" className="rounded-2xl border border-brand/30 overflow-hidden">
          <div className="bg-brand text-white px-5 py-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[11px] uppercase tracking-wide opacity-80">{planLabel}{amount > 0 ? " · " + vnd(amount) : ""}</div>
              <MeoHelpButton target="#cashback-comparison-section" lang={lang} className="bg-white/90 border-white/60" />
            </div>
            {cardCashback ? (
              <>
                <div className="text-2xl font-bold mt-0.5">{L(lang, "You save about", "Bạn tiết kiệm khoảng")} {vnd(cardCashback.capped)}</div>
                <div className="text-xs opacity-90 mt-0.5">{cardCashback.remaining != null && cardCashback.raw > cardCashback.remaining
                  ? L(lang, "Capped at this card's remaining limit — stack the steps for more.", "Đã chạm hạn mức thẻ — cộng thêm các lớp dưới.")
                  : L(lang, "Card cashback only — stack the 4 layers for more.", "Mới tính hoàn tiền thẻ — cộng đủ 4 lớp để lời hơn.")}</div>
              </>
            ) : best ? (
              <div className="text-xl font-bold mt-0.5">{pct(best.rule.rate) + "% " + L(lang, "back with", "với") + " " + best.card.product}</div>
            ) : (
              <>
                <div className="text-base font-semibold mt-0.5">{L(lang, "Tell Meo which cards you have — get YOUR exact savings.", "Cho Meo biết thẻ của bạn — xem số tiết kiệm chính xác của BẠN.")}</div>
                <button onClick={pickCards} className="mt-2 bg-white text-brand rounded-full px-4 py-1.5 text-sm font-semibold hover:bg-brand-light transition">
                  💳 {L(lang, "Pick the cards you have", "Chọn thẻ bạn đang có")}
                </button>
              </>
            )}
          </div>

          {marketBest && (
            <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-semibold text-slate-800 truncate">{marketBest.card.product} <span className="text-brand">{pct(marketBest.rule.rate)}%</span></div>
                <div className="text-xs text-slate-500">{marketBest.card.bank} · {ownedStates.length === 0
                  ? L(lang, "if you open a NEW card — best for this", "nếu mở thẻ MỚI — tốt nhất cho mục này")
                  : L(lang, "best card for this", "thẻ tốt nhất cho mục này")}</div>
              </div>
              {ownsMarketBest ? (
                <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">{L(lang, "In wallet ✓", "Có trong ví ✓")}</span>
              ) : applyUrl ? (
                <a href={applyUrl} target="_blank" rel="noreferrer" className="text-xs bg-brand text-white rounded-full px-3 py-1.5 font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Apply", "Mở thẻ")} ↗</a>
              ) : null}
            </div>
          )}

          <div id="bonus-channels-guide" className="px-4 py-3 bg-white">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">{L(lang, "How to pay — stack the layers", "Cách trả — cộng dồn các lớp")}</div>
              <MeoHelpButton target="#bonus-channels-guide" lang={lang} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {steps.map((s, i) => {
                const isCard = s.layer === "card";
                const primary = s.sources[0];
                const extra = s.sources.length - 1;
                const done = i < doneSteps;
                const current = i === doneSteps;
                const inner = (
                  <>
                    <div className="text-[10px] text-brand-dark/60 flex items-center gap-1">
                      <span className={"inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] font-bold " + (done ? "bg-emerald-500 text-white" : "bg-brand text-white")}>
                        {done ? "✓" : s.order}
                      </span>
                      {LAYER_SHORT[s.layer]}{PICK_ONE[s.layer] ? " · " + L(lang, "pick 1", "chọn 1") : ""}
                    </div>
                    <div className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                      {isCard ? (best ? best.card.product : L(lang, "Add a card", "Thêm thẻ")) : (primary ? primary.name + (extra > 0 ? " +" + extra : "") : s.title)}
                    </div>
                  </>
                );
                const cls =
                  "rounded-lg px-2.5 py-2 border transition " +
                  (done
                    ? "border-emerald-200 bg-emerald-50/60 opacity-70"
                    : current
                      ? "border-brand bg-brand-light ring-2 ring-brand/30"
                      : isCard
                        ? "border-brand bg-brand-light"
                        : "border-slate-100 bg-slate-50 hover:border-brand");
                return primary && !isCard ? (
                  <a key={s.order} href={rewardLink(primary.name, primary.url)} target="_blank" rel="noreferrer" title={primary.note} className={cls + " block"}>{inner}</a>
                ) : (
                  <div key={s.order} className={cls}>{inner}</div>
                );
              })}
            </div>

            {/* Explicit "I've done this one" control. */}
            {steps.length > 0 && (
              <div className="mt-2.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-400 tabular-nums">
                  {L(lang, "Step ", "Bước ")}
                  {Math.min(doneSteps + 1, steps.length)}/{steps.length}
                </span>
                {doneSteps < steps.length ? (
                  <button
                    onClick={() => {
                      trackAction("pay_step_advanced", { from: doneSteps + 1, of: steps.length });
                      setDoneSteps((n) => Math.min(steps.length, n + 1));
                    }}
                    className="bg-brand text-white rounded-full px-3.5 py-1.5 text-xs font-semibold hover:bg-brand-dark"
                  >
                    {L(lang, "Done — next step →", "Xong — bước tiếp theo →")}
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-emerald-600">
                      {L(lang, "All layers stacked 🎉", "Đã cộng đủ các lớp 🎉")}
                    </span>
                    <button
                      onClick={() => setDoneSteps(0)}
                      className="text-[11px] text-slate-400 underline hover:text-slate-600"
                    >
                      {L(lang, "Start over", "Làm lại")}
                    </button>
                  </div>
                )}
              </div>
            )}
            {overflowCard && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-2">
                {L(lang, "Cap runs out — put the rest on ", "Hết hạn mức — phần còn lại trả bằng ") + overflowCard.card.product + " (" + pct(overflowCard.rule.rate) + "%)"}
              </div>
            )}
          </div>

          {ranked.length > 0 ? (
            <div className="px-4 py-3 bg-white border-t border-slate-100">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">{L(lang, "Your cards for", "Thẻ của bạn cho") + " " + catLabel(lang, cat)}</div>
              <div className="space-y-1">
                {ranked.slice(0, 3).map((r, i) => (
                  <div key={r.card.id} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
                    <span className={"truncate " + (i === 0 ? "font-medium text-brand-dark" : "text-slate-600")}>{r.card.product}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {r.remaining != null && (<span className="text-[11px] text-slate-400">{L(lang, "left", "còn") + " " + vnd(r.remaining)}</span>)}
                      <span className={"font-bold " + (i === 0 ? "text-brand" : "text-slate-500")}>{pct(r.rule.rate)}%</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3 border-t border-amber-100">
              <span>{L(lang, "Add your cards to personalise this.", "Thêm thẻ để cá nhân hoá.")}</span>
              <button onClick={pickCards} className="bg-brand text-white rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Add cards", "Thêm thẻ")}</button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          4 · Premium — last, after the value has already been given.
          ============================================================ */}
      {isPremium ? <LoyaltyPreview lang={lang} /> : <PremiumUpsell lang={lang} />}

      {/* "Báo giá khi giảm" lived here until 15 Aug 2026. It moved to the
          Tối đa ưu đãi tab (components/PriceAlerts.tsx): watching a price is
          something you do when you are NOT buying today, so it was pulling this
          tab away from its one job and forcing a scroll.

          "Deal cho bạn" removed 15 Aug 2026 — it duplicated the Ưu đãi tab
          exactly, and it was the biggest single reason this tab needed
          scrolling. Deals live in one place now. */}

      <p className="text-xs text-slate-400">
        {L(lang, "Savings are an estimate. Wallet/portal promos change daily — pick the single best one. Card cashback is capped to your card's monthly limit.", "Số tiết kiệm là ước tính. Khuyến mãi ví/cổng đổi hằng ngày — chọn cái tốt nhất. Hoàn tiền thẻ bị giới hạn theo hạn mức tháng.")}
      </p>
    </div>
  );
}
