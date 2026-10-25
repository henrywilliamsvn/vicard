// =============================================================================
// PasteHero.tsx — the "dán link → thấy tiết kiệm ngay" front door.
// Self-contained: paste a product link → detect merchant (merchants.ts) → read
// the price (/api/price worker) → compute the layered saving (benefit.ts) →
// show voucher + portal + best card, a tracked buy-link, and the card-CPA hook.
//
// Reuses the app's existing pieces (cards, links, MoneyInput, redirect helpers,
// analytics). Renders at the top of BuyFlow; the category explorer stays below
// as the manual fallback.
// =============================================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { bestCardFor, type OwnedCardState, type SpendCategory } from "./cards";
import { detectMerchant, genericOnline, type Merchant } from "./merchants";
import { computeBenefit, bestCardToOpen, cardChoiceFrom, type CardChoice } from "./benefit";
import { cardApplyLink } from "./links";
import { composeFinalUrl, buildSubId } from "./redirect/adapters";
import { catLabel, type Lang } from "./i18n";
import MoneyInput from "./components/MoneyInput";
import MeoHelpButton from "./components/MeoHelpButton";
import { addToBasket } from "./components/BasketPanel";
import { trackEvent } from "./lib/track";

interface Props {
  ownedStates: OwnedCardState[];
  lang: Lang;
  /** Open the "which cards do you have?" picker. */
  onPickCards: () => void;
  /**
   * Called once a pasted link has produced a real answer, so the app can carry
   * the user to Mua gì with the item already in their list.
   *
   * ⚠️ Only fires on SUCCESS. A link we can't read leaves the user here with the
   * manual-amount fallback — sending someone to an empty basket because their
   * link wasn't recognised is how a first-time visitor decides the app is
   * broken.
   */
  onFound?: (name: string, category: SpendCategory, amount: number) => void;
}

function L(lang: Lang, en: string, vi: string): string { return lang === "vi" ? vi : en; }
function vnd(n: number): string { return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ"; }

/** Accept "shopee.vn/..." without a scheme; return a valid URL or null. */
function normalizeUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  const candidate = /^https?:\/\//i.test(s)
    ? s
    : /^[\w-]+(\.[\w-]+)+/.test(s) ? "https://" + s : null;
  if (!candidate) return null;
  try { new URL(candidate); return candidate; } catch { return null; }
}

/** A price the user pasted as text (URLs stripped so IDs aren't read as prices). */
function firstNumber(s: string): number | null {
  const m = s.replace(/https?:\/\/\S+/g, " ").match(/\d[\d.,]{4,}/);
  if (!m) return null;
  const n = parseInt(m[0].replace(/[.,\s]/g, ""), 10);
  return n >= 1000 && n <= 1_000_000_000 ? n : null;
}

function safeId(): string {
  try { return crypto.randomUUID(); } catch { return String(Date.now()) + Math.random().toString(16).slice(2); }
}

type PriceStatus = "idle" | "loading" | "done" | "none";

/**
 * Below this a number is a half-typed one, not a price. Nothing costs 7đ, so
 * treating anything under 1.000đ as "still typing" is safe, and it stops the
 * result panel from flashing an answer for the first digit someone enters.
 */
const MIN_PRICE = 1000;

export default function PasteHero({ ownedStates, lang, onPickCards, onFound }: Props) {
  const [raw, setRaw] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [price, setPrice] = useState(0);
  const [manual, setManual] = useState(0);
  const [priceStatus, setPriceStatus] = useState<PriceStatus>("idle");
  const [tripId] = useState(safeId);

  // ===========================================================================
  // ⚠️ THE "CAN'T TYPE MORE THAN ONE DIGIT" BUG — found 17 Aug 2026.
  // ===========================================================================
  // The amount box used to be rendered under the condition `effPrice <= 0`. So:
  // you type "1", effPrice becomes 1, the condition flips to false, and React
  // UNMOUNTS the field you are typing into — mid-keystroke. The box disappears,
  // the result panel takes its place, and it reads as "it auto-calculated on the
  // first digit". MoneyInput was never at fault (it was cleared back on 4 Aug);
  // the input was being destroyed by its own output.
  //
  // This latch is the fix. Once we have asked for a price, the field stays
  // mounted until the NEXT link is submitted, whatever is typed into it.
  //
  // ⚠️ NEVER gate this box on the value it collects. That is the bug.
  // ===========================================================================
  const [needManual, setNeedManual] = useState(false);
  useEffect(() => {
    if (priceStatus === "none") setNeedManual(true);
  }, [priceStatus]);

  function go() {
    const url = normalizeUrl(raw);
    if (!url) return;
    setMerchant(detectMerchant(url) ?? genericOnline());
    setManual(0);
    setNeedManual(false);
    setSubmitted(url);
    const inText = firstNumber(raw);
    if (inText) { setPrice(inText); setPriceStatus("done"); }
    else { setPrice(0); setPriceStatus("loading"); }
  }

  // Ask the worker to read the page price when the text didn't carry one.
  useEffect(() => {
    if (!submitted || priceStatus !== "loading") return;
    let cancelled = false;
    fetch("/api/price?url=" + encodeURIComponent(submitted))
      .then((r) => r.json())
      .then((d: { price?: number | null }) => {
        if (cancelled) return;
        if (d && typeof d.price === "number" && d.price > 0) { setPrice(d.price); setPriceStatus("done"); }
        else setPriceStatus("none");
      })
      .catch(() => { if (!cancelled) setPriceStatus("none"); });
    return () => { cancelled = true; };
  }, [submitted, priceStatus]);

  const effPrice = manual > 0 ? manual : price;

  // Hand the result to the basket — but only once the number has stopped
  // moving. Typing "1.500.000" fires this effect seven times, once per digit;
  // without the delay the basket collects 1đ, 15đ, 150đ… as the user types.
  // addToBasket updates the row for a merchant it already holds rather than
  // inserting a second one, so a corrected price replaces the old figure
  // instead of stacking up.
  const handedRef = useRef<string>("");
  useEffect(() => {
    if (!merchant || effPrice < MIN_PRICE) return;
    const key = merchant.name + "|" + effPrice;
    if (handedRef.current === key) return;
    const t = setTimeout(() => {
      handedRef.current = key;
      addToBasket(merchant.name, merchant.category, effPrice);
      onFound?.(merchant.name, merchant.category, effPrice);
    }, 700);
    return () => clearTimeout(t);
  }, [merchant, effPrice, onFound]);
  const category: SpendCategory = merchant?.category ?? "online";

  const ownedBest = useMemo(
    () => (merchant ? bestCardFor(category, ownedStates) : null),
    [merchant, category, ownedStates],
  );
  const openBest = useMemo(() => (merchant ? bestCardToOpen(category) : null), [merchant, category]);
  const usingCard: CardChoice | null = ownedBest
    ? cardChoiceFrom(ownedBest.card, ownedBest.rule)
    : openBest?.choice ?? null;
  const ownsCard = !!ownedBest;

  const benefit = useMemo(
    () => (merchant ? computeBenefit({ price: effPrice, merchant, card: usingCard }) : null),
    [merchant, effPrice, usingCard],
  );

  useEffect(() => { if (benefit && benefit.total > 0) trackEvent("answer"); }, [benefit]);

  const buyHref = useMemo(() => {
    if (!submitted || !merchant) return "#";
    if (!merchant.affiliateReady) return submitted; // honest: no tracked link yet
    return composeFinalUrl(submitted, merchant.network, buildSubId(null, tripId));
  }, [submitted, merchant, tripId]);

  const applyUrl = openBest ? cardApplyLink(openBest.card.bank) : undefined;

  // How much MORE the best-to-open card would earn vs. the card they're using —
  // powers the "upgrade your card" upsell for someone who already owns a weaker
  // card for this category (their biggest card-CPA lever). Only nudge on a real
  // gap (≥2 percentage points) so we never push a marginal switch.
  const openCardCashback = useMemo(
    () =>
      merchant && openBest && effPrice > 0
        ? computeBenefit({ price: effPrice, merchant, card: openBest.choice }).card
        : 0,
    [merchant, openBest, effPrice],
  );
  const upgradeGain =
    ownsCard && ownedBest && openBest &&
    openBest.card.id !== ownedBest.card.id &&
    openBest.rule.rate - ownedBest.rule.rate >= 0.02
      ? Math.max(0, openCardCashback - (benefit?.card ?? 0))
      : 0;

  const showResult = !!merchant && !!submitted;

  return (
    <div className="rounded-2xl overflow-hidden border border-brand/30">
      {/* Hero header + paste box */}
      <div className="bg-gradient-to-br from-brand to-brand-dark text-white px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="text-sm font-extrabold flex items-center gap-1.5">🐱 {L(lang, "Meo's got you", "Để Meo lo!")}</div>
          <MeoHelpButton target="#paste-input" lang={lang} className="bg-white/90 border-white/60" />
        </div>
        <h2 className="text-lg font-extrabold leading-snug mt-2">
          {L(lang, "Paste a product link — see what you save, instantly.", "Dán link sản phẩm — xem bạn tiết kiệm bao nhiêu ngay.")}
        </h2>
        <div className="flex gap-2 mt-3">
          <input
            id="paste-input"
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go(); }}
            placeholder={L(lang, "Paste a Shopee / Lazada / TikTok link…", "Dán link Shopee / Lazada / TikTok…")}
            className="flex-1 min-w-0 rounded-lg px-3 py-2.5 text-sm text-slate-800 outline-none"
          />
          <button onClick={go} className="bg-white text-brand-dark rounded-lg px-4 font-bold text-sm whitespace-nowrap hover:bg-brand-light">
            {L(lang, "Check", "Tính ngay")}
          </button>
        </div>
      </div>

      {showResult && (
        <div className="bg-white px-4 py-4 space-y-3">
          {/* Detected */}
          <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500">
            {L(lang, "Meo sees:", "Meo nhận ra:")}
            <span className="bg-brand-light text-brand-dark font-bold rounded-full px-2.5 py-0.5">{merchant!.name}</span>
            <span>{catLabel(lang, category)}</span>
            {priceStatus === "loading" && <span className="text-slate-400">· ⏳ {L(lang, "reading price…", "đang đọc giá…")}</span>}
            {effPrice >= MIN_PRICE && <span>· {vnd(effPrice)}</span>}
          </div>

          {/* No price yet → ask for the amount (graceful fallback).
              ⚠️ Gated on `needManual`, NEVER on effPrice — see the note by the
              latch. Gating it on the value unmounts the field on digit one. */}
          {needManual && (
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
              <div className="text-xs text-slate-500 mb-1">
                {L(lang, "Couldn't auto-read the price — enter it to see your saving.", "Chưa đọc được giá tự động — nhập số tiền để xem tiết kiệm.")}
              </div>
              <MoneyInput value={manual} onChange={setManual} lang={lang} />
            </div>
          )}

          {/* The saving */}
          {benefit && effPrice >= MIN_PRICE && (
            <>
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white p-4 text-center">
                <div className="text-xs opacity-90">{L(lang, "With Mẹo săn sales, you save about", "Với Mẹo săn sales, bạn tiết kiệm khoảng")}</div>
                <div className="text-3xl font-black leading-tight mt-0.5">{vnd(benefit.total)}</div>
                <span className="inline-block bg-white/20 rounded-full px-3 py-0.5 text-xs font-bold mt-1.5">
                  ~{Math.round(benefit.pct * 100)}% {L(lang, "of the order", "giá trị đơn")}
                </span>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-slate-200 px-3.5 divide-y divide-dashed divide-slate-100">
                <Row k={L(lang, "List price", "Giá gốc")} v={vnd(benefit.price)} />
                {benefit.voucher > 0 && (
                  <Row n={1} k={L(lang, "Exclusive voucher via Meo", "Voucher độc quyền qua Meo")} sub={L(lang, "affiliate code not in the normal app", "mã affiliate không có trong app thường")} minus={vnd(benefit.voucher)} />
                )}
                {benefit.portal > 0 && merchant!.portal && (
                  <Row n={2} k={L(lang, "Cashback via ", "Hoàn tiền qua ") + merchant!.portal.name} sub={L(lang, "open through the portal for one more layer (est.)", "mở đơn qua cổng để cộng 1 lớp (ước tính)")} minus={vnd(benefit.portal)} />
                )}
                {benefit.card > 0 && usingCard && (
                  <Row n={3} k={L(lang, "Best card cashback", "Hoàn tiền thẻ tốt nhất")} sub={usingCard.name + (benefit.cardCapped ? L(lang, " · at monthly cap", " · đã chạm hạn mức tháng") : "")} minus={vnd(benefit.card)} />
                )}
                <div className="flex justify-between items-center py-2.5 font-extrabold text-sm">
                  <span>{L(lang, "You pay ≈", "Bạn thực trả ≈")}</span>
                  <span className="text-brand-dark">{vnd(benefit.finalPrice)}</span>
                </div>
              </div>

              {/* Tracked buy link */}
              <a href={buyHref} target="_blank" rel="noreferrer"
                 className="block text-center bg-orange-500 text-white rounded-xl py-3.5 font-extrabold hover:opacity-95">
                🛒 {L(lang, "Buy via Meo", "Mua qua Meo")}
                <span className="block font-normal text-[11px] opacity-90 mt-0.5">
                  {merchant!.affiliateReady
                    ? L(lang, "Deal & cashback already attached — shop as usual", "Link đã gắn sẵn ưu đãi & hoàn tiền — mua như bình thường")
                    : L(lang, "Opens the store (tracked link coming soon)", "Mở cửa hàng (link tracking sắp có)")}
                </span>
              </a>

              {/* Card-CPA hook — only when the user doesn't already own the best card */}
              {!ownsCard && openBest && benefit.card > 0 && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-center gap-3">
                  <span className="text-xl">💳</span>
                  <div className="flex-1 text-xs leading-snug">
                    {L(lang, "Don't have the ", "Chưa có thẻ ")}<b>{openBest.card.product}</b>
                    {L(lang, "? This card alone adds ", "? Riêng thẻ này cho thêm ")}<b className="text-orange-600">{vnd(benefit.card)}</b>
                    {L(lang, " back on this order.", " hoàn tiền cho đơn này.")}
                  </div>
                  {applyUrl && (
                    <a href={applyUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-white bg-orange-500 rounded-full px-3 py-1.5 whitespace-nowrap">
                      {L(lang, "Open card", "Mở thẻ")}
                    </a>
                  )}
                </div>
              )}

              {/* Upgrade hook — owns a weaker card, a materially better one exists */}
              {ownsCard && upgradeGain > 0 && applyUrl && openBest && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 flex items-center gap-3">
                  <span className="text-xl">⬆️</span>
                  <div className="flex-1 text-xs leading-snug">
                    {L(lang, "You could get ", "Bạn có thể được thêm ")}<b className="text-orange-600">{vnd(upgradeGain)}</b>
                    {L(lang, " more on this order with the ", " cho đơn này với thẻ ")}<b>{openBest.card.product}</b>.
                  </div>
                  <a href={applyUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-white bg-orange-500 rounded-full px-3 py-1.5 whitespace-nowrap">
                    {L(lang, "See card", "Xem thẻ")}
                  </a>
                </div>
              )}

              {/* Personalise CTA when we don't know their cards */}
              {!ownsCard && (
                <button onClick={onPickCards} className="w-full text-xs text-brand-dark bg-brand-light rounded-lg py-2 font-semibold">
                  💡 {L(lang, "Tell Meo your cards for YOUR exact number", "Cho Meo biết thẻ của bạn để xem số chính xác")}
                </button>
              )}

              {benefit.assumptions.length > 0 && (
                <p className="text-[10.5px] text-slate-400 leading-relaxed">{benefit.assumptions.join(" ")}</p>
              )}
              <div className="text-[11px] text-slate-400 text-center">🔒 {L(lang, "Meo ranks by YOUR benefit, never by commission.", "Meo xếp hạng theo lợi ích của BẠN, không theo hoa hồng.")}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ n, k, sub, v, minus }: { n?: number; k: string; sub?: string; v?: string; minus?: string }) {
  return (
    <div className="flex justify-between items-center py-2.5 text-[13px]">
      <span className="flex items-start gap-2 min-w-0">
        {n != null && <span className="mt-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-brand text-white text-[9px] font-bold shrink-0">{n}</span>}
        <span className="min-w-0">
          <span className="block">{k}</span>
          {sub && <span className="block text-[10.5px] text-slate-400">{sub}</span>}
        </span>
      </span>
      {v && <span className="shrink-0">{v}</span>}
      {minus && <span className="shrink-0 text-emerald-600 font-bold">−{minus}</span>}
    </div>
  );
}
