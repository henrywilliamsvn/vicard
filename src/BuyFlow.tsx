import { useEffect, useMemo, useState } from "react";
import { CARDS, bestCardFor, type CardProduct, type RewardRule, type OwnedCardState, type SpendCategory } from "./cards";
import { buildStackingPlan, REWARD_SOURCES } from "./rewardSources";
import { cardApplyLink, rewardLink } from "./links";
import { getDeals } from "./deals";
import { matchWishlist, countMatches, type WishlistItem } from "./wishlist";
import { catLabel, type Lang } from "./i18n";
import MoneyInput from "./components/MoneyInput";
import MerchantIcon from "./components/MerchantIcon";
import StoreDiscovery from "./components/StoreDiscovery";
import LoyaltyPreview from "./components/LoyaltyPreview";
import PremiumUpsell from "./components/PremiumUpsell";
import DealCard from "./components/DealCard";
import { usePremium } from "./lib/premium";

interface Props {
  ownedStates: OwnedCardState[];
  lang: Lang;
  onAddCards: () => void;
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

const KEY_WISHLIST = "vicard.wishlist.v1";
function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
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

export default function BuyFlow({ ownedStates, lang, onAddCards }: Props) {
  const [isPremium] = usePremium();
  const [cat, setCat] = useState<SpendCategory>("online");
  const [amount, setAmount] = useState<number>(0);
  const [query, setQuery] = useState<string>("");
  const [target, setTarget] = useState<number>(20);
  const [items, setItems] = useState<WishlistItem[]>(() => load(KEY_WISHLIST, []));
  useEffect(() => { localStorage.setItem(KEY_WISHLIST, JSON.stringify(items)); }, [items]);

  const detected = useMemo(() => detectMerchant(query, lang), [query, lang]);
  useEffect(() => { if (detected) setCat(detected.category); }, [detected]);
  useEffect(() => { const p = extractPrice(query); if (p) setAmount(p); }, [query]);
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

  const deals = useMemo(() => getDeals().slice().sort((a, b) => {
    const va = a.flash && a.flashRate ? a.flashRate : a.discountPct;
    const vb = b.flash && b.flashRate ? b.flashRate : b.discountPct;
    return vb - va;
  }), []);
  const matches = useMemo(() => matchWishlist(items, deals), [items, deals]);
  const totalMatches = countMatches(matches);

  function addWatch() {
    const name = query.trim() || catLabel(lang, cat);
    setItems((prev) => [{ id: crypto.randomUUID(), name, category: cat, targetDiscountPct: Math.min(90, Math.max(1, target || 1)), createdAt: new Date().toISOString() }, ...prev]);
  }
  function removeWatch(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }

  const planLabel = query.trim() ? query.trim() : catLabel(lang, cat);

  const LAYER_SHORT: Record<string, string> = {
    portal: L(lang, "Portal", "Cổng"),
    voucher: L(lang, "Voucher", "Voucher"),
    card: L(lang, "Card", "Thẻ"),
    wallet: L(lang, "Wallet", "Ví"),
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold mb-2">{L(lang, "What are you buying?", "Bạn định mua gì?")}</h2>
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
            <input id="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L(lang, "Search a store, paste a link, or type an item…", "Tìm cửa hàng, dán link, hoặc nhập món hàng…")} className="w-full text-sm outline-none pl-6" />
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
        </div>
      </div>

      <div id="cashback-comparison-section" className="rounded-2xl border border-brand/30 overflow-hidden">
        <div className="bg-brand text-white px-5 py-4">
          <div className="text-[11px] uppercase tracking-wide opacity-80">{planLabel}{amount > 0 ? " · " + vnd(amount) : ""}</div>
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
            <div className="text-base font-semibold mt-0.5">{L(lang, "Add a card to see your exact savings.", "Thêm thẻ để xem số tiết kiệm chính xác.")}</div>
          )}
        </div>

        {marketBest && (
          <div className="px-4 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{marketBest.card.product} <span className="text-brand">{pct(marketBest.rule.rate)}%</span></div>
              <div className="text-xs text-slate-500">{marketBest.card.bank} · {L(lang, "best card for this", "thẻ tốt nhất cho mục này")}</div>
            </div>
            {ownsMarketBest ? (
              <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">{L(lang, "In wallet ✓", "Có trong ví ✓")}</span>
            ) : applyUrl ? (
              <a href={applyUrl} target="_blank" rel="noreferrer" className="text-xs bg-brand text-white rounded-full px-3 py-1.5 font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Apply", "Mở thẻ")} ↗</a>
            ) : null}
          </div>
        )}

        <div className="px-4 py-3 bg-white">
          <div className="text-[11px] uppercase tracking-wide text-slate-400 mb-1.5">{L(lang, "How to pay — stack the layers", "Cách trả — cộng dồn các lớp")}</div>
          <div className="grid grid-cols-2 gap-2">
            {steps.map((s) => {
              const isCard = s.layer === "card";
              const primary = s.sources[0];
              const extra = s.sources.length - 1;
              const inner = (
                <>
                  <div className="text-[10px] text-brand-dark/60 flex items-center gap-1">
                    <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-brand text-white text-[9px] font-bold">{s.order}</span>
                    {LAYER_SHORT[s.layer]}{PICK_ONE[s.layer] ? " · " + L(lang, "pick 1", "chọn 1") : ""}
                  </div>
                  <div className="text-xs font-medium text-slate-800 mt-0.5 truncate">
                    {isCard ? (best ? best.card.product : L(lang, "Add a card", "Thêm thẻ")) : (primary ? primary.name + (extra > 0 ? " +" + extra : "") : s.title)}
                  </div>
                </>
              );
              const cls = "rounded-lg px-2.5 py-2 border " + (isCard ? "border-brand bg-brand-light" : "border-slate-100 bg-slate-50 hover:border-brand");
              return primary && !isCard ? (
                <a key={s.order} href={rewardLink(primary.name, primary.url)} target="_blank" rel="noreferrer" title={primary.note} className={cls + " block"}>{inner}</a>
              ) : (
                <div key={s.order} className={cls}>{inner}</div>
              );
            })}
          </div>
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
            <button onClick={onAddCards} className="bg-brand text-white rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Add cards", "Thêm thẻ")}</button>
          </div>
        )}
      </div>

      <div id="price-alert-trigger" className="flex items-end gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
        <label className="block text-sm flex-1">
          <span className="text-slate-600">{L(lang, "Notify me at ≥", "Báo khi giảm ≥")} {target}%</span>
          <input type="range" min={5} max={70} step={5} value={target} onChange={(e) => setTarget(+e.target.value)} className="mt-2 w-full accent-brand" />
        </label>
        <button onClick={addWatch} className="bg-white border border-brand text-brand rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-light whitespace-nowrap">🔔 {L(lang, "Watch", "Theo dõi")}</button>
      </div>

      {items.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{L(lang, "Watching for deals", "Đang theo dõi ưu đãi")} ({items.length})</h3>
          {totalMatches > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 mb-2 text-xs text-emerald-700 font-medium">🎯 {L(lang, totalMatches + " item(s) hit your target right now.", totalMatches + " món đạt mục tiêu ngay bây giờ.")}</div>
          )}
          <div className="space-y-2">
            {matches.map(({ item, deals: hits }) => {
              const hit = hits.length > 0;
              return (
                <div key={item.id} className={"rounded-lg border p-3 " + (hit ? "border-emerald-300 bg-emerald-50/50" : "border-slate-100 bg-white")}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.name}</div>
                      <div className="text-xs text-slate-400">{catLabel(lang, item.category)} · ≥{item.targetDiscountPct}%</div>
                    </div>
                    <button onClick={() => removeWatch(item.id)} className="text-slate-300 hover:text-red-500 text-lg leading-none" aria-label="Remove">×</button>
                  </div>
                  {hit && (
                    <div className="mt-2 space-y-1.5">
                      {hits.map((d) => (
                        <a key={d.id} href={d.link} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-2 rounded bg-white border border-emerald-200 px-2.5 py-1.5 hover:border-emerald-400">
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

      {isPremium ? <LoyaltyPreview lang={lang} /> : <PremiumUpsell lang={lang} />}

      <section>
        <h2 className="text-base font-bold mb-2">{L(lang, "💸 Deals for you", "💸 Deal cho bạn")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {deals.slice(0, 6).map((d) => (
            <DealCard key={d.id} deal={d} lang={lang} />
          ))}
        </div>
      </section>

      <StoreDiscovery lang={lang} />

      <p className="text-xs text-slate-400">
        {L(lang, "Savings are an estimate. Wallet/portal promos change daily — pick the single best one. Card cashback is capped to your card's monthly limit.", "Số tiết kiệm là ước tính. Khuyến mãi ví/cổng đổi hằng ngày — chọn cái tốt nhất. Hoàn tiền thẻ bị giới hạn theo hạn mức tháng.")}
      </p>
    </div>
  );
}
