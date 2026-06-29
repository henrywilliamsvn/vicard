import { useEffect, useMemo, useState } from "react";
import { CARDS, bestCardFor, type CardProduct, type RewardRule, type OwnedCardState, type SpendCategory } from "./cards";
import { buildStackingPlan } from "./rewardSources";
import { cardApplyLink, rewardLink } from "./links";
import { getDeals } from "./deals";
import { matchWishlist, countMatches, type WishlistItem } from "./wishlist";
import { catLabel, type Lang } from "./i18n";
import MoneyInput from "./components/MoneyInput";
import StoreDiscovery from "./components/StoreDiscovery";

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
  const [cat, setCat] = useState<SpendCategory>("online");
  const [amount, setAmount] = useState<number>(0);
  const [query, setQuery] = useState<string>("");
  const [target, setTarget] = useState<number>(20);
  const [items, setItems] = useState<WishlistItem[]>(() => load(KEY_WISHLIST, []));
  useEffect(() => { localStorage.setItem(KEY_WISHLIST, JSON.stringify(items)); }, [items]);

  const detected = useMemo(() => detectMerchant(query, lang), [query, lang]);
  useEffect(() => { if (detected) setCat(detected.category); }, [detected]);

  const hasCards = ownedStates.length > 0;

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

  const deals = useMemo(() => getDeals(), []);
  const matches = useMemo(() => matchWishlist(items, deals), [items, deals]);
  const totalMatches = countMatches(matches);

  function addWatch() {
    const name = query.trim() || catLabel(lang, cat);
    setItems((prev) => [{ id: crypto.randomUUID(), name, category: cat, targetDiscountPct: Math.min(90, Math.max(1, target || 1)), createdAt: new Date().toISOString() }, ...prev]);
  }
  function removeWatch(id: string) { setItems((prev) => prev.filter((i) => i.id !== id)); }

  const planLabel = query.trim() ? query.trim() : catLabel(lang, cat);

  return (
    <div className="space-y-6">
      {!hasCards && (
        <div className="rounded-xl bg-brand-light border border-brand/20 p-4 flex items-start gap-3">
          <img src="/mascot.png" alt="Meo" className="w-12 h-12 rounded-full object-cover shrink-0" />
          <div className="min-w-0">
            <div className="font-semibold text-brand-dark">{L(lang, "Let Meo handle it 🐱", "Để Meo lo 🐱")}</div>
            <p className="text-sm text-slate-600 mt-0.5">{L(lang, "Pick a category or paste a product link — Meo shows the best cashback card and how to stack deals. Add your cards for your exact savings.", "Chọn danh mục hoặc dán link sản phẩm — Meo chỉ thẻ hoàn tiền cao nhất và cách ghép ưu đãi. Thêm thẻ của bạn để tính đúng số tiền tiết kiệm.")}</p>
            <button onClick={onAddCards} className="mt-2 text-sm bg-brand text-white rounded-lg px-3 py-1.5 font-medium hover:bg-brand-dark">{L(lang, "➕ Add your cards", "➕ Thêm thẻ của bạn")}</button>
          </div>
        </div>
      )}
      <StoreDiscovery lang={lang} />

      <div>
        <h2 className="text-xl font-bold mb-1">{L(lang, "What are you buying?", "Bạn định mua gì?")}</h2>
        <p className="text-sm text-slate-500">{L(lang, "Pick a category or paste a link — we'll show the best card and how to pay.", "Chọn danh mục hoặc dán liên kết — chúng tôi chỉ thẻ tốt nhất và cách trả.")}</p>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {CATS.map((c) => {
          const on = c.key === cat;
          return (
            <button key={c.key} onClick={() => setCat(c.key)}
              className={"flex flex-col items-center gap-1 py-3 rounded-xl border text-xs transition " + (on ? "border-brand bg-brand-light text-brand-dark" : "border-slate-200 bg-white text-slate-600 hover:border-brand")}>
              <span className="text-xl">{c.icon}</span>
              {catLabel(lang, c.key)}
            </button>
          );
        })}
      </div>

      <div>
        <input id="search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={L(lang, "Type an item or paste a product link…", "Nhập món hàng hoặc dán liên kết sản phẩm…")} className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm" />
        {detected && (
          <div className="mt-1.5 text-xs text-brand-dark bg-brand-light inline-block rounded-full px-3 py-1">🔗 {detected.merchant} → {catLabel(lang, detected.category)}</div>
        )}
      </div>

      <div className="text-sm">
        <span className="text-slate-600">{L(lang, "How much? (optional)", "Bao nhiêu? (tuỳ chọn)")}</span>
        <MoneyInput value={amount} onChange={setAmount} lang={lang} />
      </div>

      <div id="price-alert-trigger" className="flex items-end gap-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
        <label className="block text-sm flex-1">
          <span className="text-slate-600">{L(lang, "Notify me at ≥", "Báo khi giảm ≥")} {target}%</span>
          <input type="range" min={5} max={70} step={5} value={target} onChange={(e) => setTarget(+e.target.value)} className="mt-2 w-full accent-brand" />
        </label>
        <button onClick={addWatch} className="bg-white border border-brand text-brand rounded-lg px-3 py-2 text-sm font-medium hover:bg-brand-light whitespace-nowrap">🔔 {L(lang, "Watch for deals", "Theo dõi ưu đãi")}</button>
      </div>

      {marketBest && (
        <div id="cashback-comparison-section" className="rounded-xl border border-brand/30 bg-brand-light/60 p-4">
          <div className="text-[11px] uppercase tracking-wide text-brand-dark/70">{L(lang, "Best card for this purchase", "Thẻ tốt nhất cho giao dịch này")}</div>
          <div className="flex items-center justify-between mt-1 gap-3">
            <div className="min-w-0">
              <div className="font-semibold text-slate-800">{marketBest.card.product} <span className="text-brand">{pct(marketBest.rule.rate)}%</span></div>
              <div className="text-xs text-slate-500">{marketBest.card.bank}</div>
            </div>
            {ownsMarketBest ? (
              <span className="text-xs text-emerald-600 font-medium whitespace-nowrap">{L(lang, "In your wallet ✓", "Có trong ví ✓")}</span>
            ) : applyUrl ? (
              <a href={applyUrl} target="_blank" rel="noreferrer" className="text-xs bg-brand text-white rounded-full px-3 py-1.5 font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Apply", "Mở thẻ")} ↗</a>
            ) : null}
          </div>
          {!ownsMarketBest && best && marketBest.rule.rate > best.rule.rate && (
            <div className="text-xs text-amber-700 mt-2">{L(lang, "Beats your best owned card", "Cao hơn thẻ tốt nhất bạn có") + " (" + pct(best.rule.rate) + "%)."}</div>
          )}
        </div>
      )}

      <div id="bonus-channels-guide" className="rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-brand text-white px-5 py-4">
          <div className="text-sm opacity-90">{L(lang, "Your plan", "Kế hoạch")} · {planLabel}{amount > 0 ? " · " + vnd(amount) : ""}</div>
          {cardCashback ? (
            <>
              <div className="text-2xl font-bold mt-1">{L(lang, "You save about", "Bạn tiết kiệm khoảng")} {vnd(cardCashback.capped)}</div>
              {cardCashback.remaining != null && cardCashback.raw > cardCashback.remaining && (
                <div className="text-xs opacity-90 mt-0.5">{L(lang, "Capped at this card's remaining limit this cycle.", "Đã giới hạn theo hạn mức còn lại của thẻ kỳ này.")}</div>
              )}
              <div className="text-xs opacity-90 mt-0.5">{L(lang, "Card cashback only — stack the steps below for more.", "Chỉ tính hoàn tiền thẻ — làm thêm các bước dưới để cộng dồn.")}</div>
            </>
          ) : best ? (
            <div className="text-base font-medium mt-1">{pct(best.rule.rate) + "% " + L(lang, "with", "với") + " " + best.card.product}</div>
          ) : (
            <div className="text-sm font-medium mt-1 opacity-95">{L(lang, "Add a card to calculate your cashback.", "Thêm thẻ để tính hoàn tiền của bạn.")}</div>
          )}
        </div>

        {!hasCards && (
          <div className="px-5 py-3 bg-amber-50 text-amber-800 text-sm flex items-center justify-between gap-3">
            <span>{L(lang, "Tell us which cards you have to personalise this.", "Cho biết bạn có thẻ nào để cá nhân hoá.")}</span>
            <button onClick={onAddCards} className="bg-brand text-white rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-brand-dark">{L(lang, "Add cards", "Thêm thẻ")}</button>
          </div>
        )}

        <ol className="divide-y divide-slate-100">
          {steps.map((s) => {
            const isCard = s.layer === "card";
            const pickOne = PICK_ONE[s.layer];
            return (
              <li key={s.order} className="px-5 py-3 flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-brand-light text-brand-dark flex items-center justify-center text-xs font-semibold">{s.order}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {isCard && best ? L(lang, "Pay with", "Trả bằng") + " " + best.card.product + " — " + pct(best.rule.rate) + "%" : s.title}
                  </div>
                  {isCard && cardCashback && (<div className="text-xs text-brand mt-0.5">+{vnd(cardCashback.capped)} {L(lang, "cashback", "hoàn tiền")}</div>)}
                  {isCard && overflowCard && (
                    <div className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-1 mt-1">
                      {L(lang, "Cap runs out — put the rest on ", "Hết hạn mức — phần còn lại trả bằng ") + overflowCard.card.product + " (" + pct(overflowCard.rule.rate) + "%)"}
                    </div>
                  )}
                  {isCard && !best && (<div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>)}
                  {!isCard && s.sources.length > 0 && (
                    <div className="mt-1">
                      {pickOne && <div className="text-[11px] text-amber-700 mb-1">{L(lang, "Pick ONE:", "Chọn MỘT:")}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {s.sources.map((src) => (<a key={src.name} href={rewardLink(src.name, src.url)} target="_blank" rel="noreferrer" title={src.note} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100">{src.name} ↗</a>))}
                      </div>
                    </div>
                  )}
                  {!isCard && s.sources.length === 0 && (<div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>)}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {ranked.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">{L(lang, "Your cards for", "Thẻ của bạn cho") + " " + catLabel(lang, cat)}</h3>
          <div className="space-y-1.5">
            {ranked.slice(0, 4).map((r, i) => (
              <div key={r.card.id} className={"flex items-center justify-between rounded-lg border px-3 py-2 text-sm " + (i === 0 ? "border-brand bg-brand-light" : "border-slate-100 bg-white")}>
                <div className="min-w-0">
                  <span className={"font-medium " + (i === 0 ? "text-brand-dark" : "text-slate-700")}>{r.card.product}</span>
                  {r.remaining != null && (<span className="block text-xs text-slate-400">{L(lang, "cap left", "hạn mức còn") + ": " + vnd(r.remaining)}</span>)}
                </div>
                <span className={"font-bold " + (i === 0 ? "text-brand" : "text-slate-500")}>{pct(r.rule.rate)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

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

      <p className="text-xs text-slate-400">
        {L(lang, "Savings are an estimate. Wallet/portal promos change daily — pick the single best one. Card cashback is capped to your card's monthly limit.", "Số tiết kiệm là ước tính. Khuyến mãi ví/cổng đổi hằng ngày — chọn cái tốt nhất. Hoàn tiền thẻ bị giới hạn theo hạn mức tháng.")}
      </p>
    </div>
  );
}
