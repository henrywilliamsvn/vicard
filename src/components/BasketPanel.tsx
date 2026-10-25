import { useCallback, useEffect, useMemo, useState } from "react";
import type { OwnedCardState, SpendCategory } from "../cards";
import { planBasket, type BasketItem } from "../basket";
import { catLabel, type Lang } from "../i18n";
import MoneyInput from "./MoneyInput";
import { trackAction } from "../lib/track";

// =============================================================================
// BasketPanel — your list (BasketList), and how to pay for it (BasketAdvice).
// =============================================================================
//
// Added 15 Aug 2026 (item 2 of the 14 Aug user research).
//
// The app used to answer for ONE thing at a time, which is not how people shop:
// they arrive with a list. This keeps the item that came from Xem giá, lets more
// be added, and then answers the question the single-item view could not — do
// these go on one card or should the order be split?
//
// -----------------------------------------------------------------------------
// SPLIT IN TWO, 17 Aug 2026
// -----------------------------------------------------------------------------
// Henry's ordering for the Giỏ hàng tab is: (1) what you have chosen, (2) what
// you want to buy next, (3) our suggestion, (4) premium. The old single panel
// straddled 1 and 3 — the list and the verdict were welded together with the
// add-box wedged between them — so it could not be placed in that order.
//
// It is now two components over ONE shared store:
//   • <BasketList>   → block 1. Read-only by default: name, category, price,
//                      and which card it lands on. No add box, no price field.
//   • <BasketAdvice> → block 3. Combine-vs-split verdict, per-card grouping,
//                      total, and the honesty rail.
// Adding items now belongs to block 2 in BuyFlow, which is where "what do you
// want to buy next" actually lives.
//
// The two components do NOT share React state — they share localStorage plus
// the `meo:basket-changed` event, the same channel Xem giá already uses to push
// an item in. Every mutation goes through `mutate()`, which writes and then
// dispatches, so every mounted instance re-reads. This is why there is no
// context provider and no prop drilling.
//
// ⚠️ EDITING IS BEHIND "Sửa", NOT GONE. Henry asked for the price control out of
// the row. If it were deleted outright, an item added without a price could
// never get one, and the engine would be permanently stuck on "nhập giá từng
// món" — a dead end. So the row is clean until you tap Sửa.
//
// All the money logic lives in basket.ts (pure, unit-tested). This file only
// collects input and renders the result, so the advice can never quietly drift
// from what was tested.
//
// ⚠️ HONESTY RAIL. The engine only knows card rates and caps. It does NOT know
// free-shipping thresholds or voucher minimums, which are the usual reasons to
// COMBINE an order. The footnote saying so is not decoration — without it this
// panel reads as "Meo says split", when what it can actually support is "by your
// cards' limits, splitting earns more". Do not remove it to save space.
// =============================================================================

const KEY_BASKET = "vicard.basket.v1";
const CHANGED = "meo:basket-changed";

function load(): BasketItem[] {
  try {
    const raw = localStorage.getItem(KEY_BASKET);
    const v = raw ? (JSON.parse(raw) as BasketItem[]) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function save(list: BasketItem[]): void {
  try {
    localStorage.setItem(KEY_BASKET, JSON.stringify(list));
  } catch {
    /* storage blocked — the list simply does not persist */
  }
  // Synchronous: every mounted BasketList / BasketAdvice re-reads before this
  // line returns, so the two blocks can never show different lists.
  window.dispatchEvent(new CustomEvent(CHANGED));
}

function safeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return "b" + Math.random().toString(36).slice(2);
  }
}

function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

function vnd(n: number): string {
  return Math.round(n).toLocaleString("vi-VN") + "đ";
}

/**
 * Add an item from anywhere in the app (Xem giá's paste, or Mua gì tiếp theo).
 *
 * ⚠️ UPDATES AN EXISTING ROW rather than inserting a duplicate. Xem giá calls
 * this as the price settles, so an inserting version turned one product into a
 * pile of rows — "Shopee 150.000đ", "Shopee 1.500.000đ" — as the user typed.
 * One name is one row; a new price corrects it.
 */
export function addToBasket(name: string, category: SpendCategory, amount: number): void {
  const list = load();
  const i = list.findIndex((x) => x.name === name);
  if (i >= 0) {
    if (list[i].amount === amount && list[i].category === category) return;
    const next = list.slice();
    next[i] = { ...next[i], category, amount };
    save(next);
    return;
  }
  save([{ id: safeId(), name, category, amount }, ...list].slice(0, 20));
}

/** One store, many views. See the header note on why this is not React state. */
function useBasket() {
  const [items, setItems] = useState<BasketItem[]>(load);

  useEffect(() => {
    const sync = () => setItems(load());
    window.addEventListener(CHANGED, sync);
    return () => window.removeEventListener(CHANGED, sync);
  }, []);

  // Reads storage rather than the `items` closure, so two components mutating
  // in the same tick cannot clobber each other.
  const mutate = useCallback((fn: (prev: BasketItem[]) => BasketItem[]) => {
    save(fn(load()));
  }, []);

  return { items, mutate };
}

// =============================================================================
// Block 1 — their purchase list.
// =============================================================================

export function BasketList({
  ownedStates,
  lang,
}: {
  ownedStates: OwnedCardState[];
  lang: Lang;
}) {
  const { items, mutate } = useBasket();
  const [editing, setEditing] = useState<string | null>(null);

  const plan = useMemo(() => planBasket(items, ownedStates), [items, ownedStates]);

  const CATS: SpendCategory[] = ["online", "dining", "supermarket", "travel", "foreign"];

  function remove(id: string) {
    mutate((prev) => prev.filter((i) => i.id !== id));
    if (editing === id) setEditing(null);
  }
  function setCategory(id: string, category: SpendCategory) {
    mutate((prev) => prev.map((i) => (i.id === id ? { ...i, category } : i)));
  }
  function setAmount(id: string, amount: number) {
    mutate((prev) => prev.map((i) => (i.id === id ? { ...i, amount } : i)));
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3">
      <h2 className="text-sm font-bold text-slate-800 mb-2">
        🧺 {L(lang, "What you're buying", "Bạn đang mua")}
        {items.length > 0 && <span className="text-slate-400 font-normal"> ({items.length})</span>}
      </h2>

      {items.length === 0 ? (
        <p className="text-xs text-slate-400">
          {L(
            lang,
            "Nothing here yet. Paste a link on Xem giá, or add an item below.",
            "Chưa có món nào. Dán link ở tab Xem giá, hoặc thêm món ở phần dưới."
          )}
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => {
            const p = plan.placements.find((x) => x.itemId === it.id);
            const open = editing === it.id;
            return (
              <li key={it.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 truncate">{it.name}</div>
                    {/* Everything about this choice, as text. The controls that
                        used to sit here moved behind Sửa. */}
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {catLabel(lang, it.category)}
                      {" · "}
                      {it.amount > 0 ? (
                        vnd(it.amount)
                      ) : (
                        <span className="text-amber-600">{L(lang, "no price yet", "chưa có giá")}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setEditing(open ? null : it.id)}
                      className="text-[11px] text-slate-400 underline hover:text-brand"
                    >
                      {open ? L(lang, "Close", "Đóng") : L(lang, "Edit", "Sửa")}
                    </button>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-slate-300 hover:text-red-500 leading-none text-lg"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {p && p.cardId && (
                  <div className="mt-1.5 text-[11px] text-brand-dark bg-brand-light rounded px-2 py-1">
                    💳 {p.cardName} · {Math.round(p.rate * 100)}%
                    {p.cashback > 0 && <> · +{vnd(p.cashback)}</>}
                  </div>
                )}

                {open && (
                  <div className="mt-2 pt-2 border-t border-slate-200/70">
                    <div className="flex flex-wrap gap-1">
                      {CATS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setCategory(it.id, c)}
                          className={
                            "px-2 py-0.5 rounded-full text-[10px] border transition " +
                            (it.category === c
                              ? "bg-brand text-white border-brand"
                              : "bg-white text-slate-500 border-slate-200 hover:border-brand")
                          }
                        >
                          {catLabel(lang, c)}
                        </button>
                      ))}
                    </div>
                    <div className="mt-1.5">
                      <MoneyInput value={it.amount} onChange={(n) => setAmount(it.id, n)} lang={lang} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// =============================================================================
// Block 3 — what Meo suggests you do with that list.
// =============================================================================

/**
 * ⚠️ NO BUTTON IN HERE. This block sits directly above the savings card, which
 * already carries its own "Chọn thẻ bạn đang có" CTA — so when the user had no
 * cards saved, the same orange button appeared twice, one under the other
 * (Henry, 18 Aug). This block INFORMS; the card below it ACTS. The text is
 * sized up instead, because the only thing it needs to do is be read.
 */
export function BasketAdvice({
  ownedStates,
  lang,
}: {
  ownedStates: OwnedCardState[];
  lang: Lang;
}) {
  const { items } = useBasket();
  const plan = useMemo(() => planBasket(items, ownedStates), [items, ownedStates]);
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  // The engine's verdict is the product claim of this whole feature. Record what
  // it actually told people — how often splitting really wins, and by how much —
  // so it can be judged on its own output rather than on a demo.
  const verdict = plan.advice[0]?.kind ?? "none";
  useEffect(() => {
    if (items.length === 0) return;
    trackAction("basket_advice_shown", {
      verdict,
      items: items.length,
      cards: plan.groups.length,
      gainVND: plan.gain,
      exact: plan.exact,
    });
  }, [verdict, items.length, plan.groups.length, plan.gain, plan.exact]);

  if (items.length === 0) return null;

  return (
    <div className="rounded-xl border border-brand/30 bg-brand-light/40 p-3.5">
      {plan.advice.map((a, i) => (
        <p
          key={i}
          className={
            i === 0
              ? "text-[15px] leading-relaxed font-semibold text-slate-800"
              : "text-sm leading-relaxed text-slate-600 mt-1.5"
          }
        >
          {a.kind === "cap" ? "⚠️ " : i === 0 ? "🐱 " : ""}
          {lang === "vi" ? a.vi : a.en}
        </p>
      ))}

      {plan.groups.length > 1 && (
        <div className="mt-2.5 space-y-1">
          {plan.groups.map((g) => (
            <div key={g.cardId} className="text-sm text-slate-600">
              <span className="font-semibold">{g.cardName}</span> ·{" "}
              {g.itemIds
                .map((id) => byId.get(id)?.name)
                .filter(Boolean)
                .join(", ")}{" "}
              → +{vnd(g.cashback)}
            </div>
          ))}
        </div>
      )}

      {plan.total > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-brand/20 text-base font-bold text-slate-800">
          {L(lang, "Total back", "Tổng hoàn lại")}: {vnd(plan.total)}
        </div>
      )}

      {/* ⚠️ No "pick your cards" button here — the savings card directly below
          owns that CTA. See the note above the component. */}

      {!plan.exact && (
        <p className="text-xs text-slate-400 mt-2">
          {L(
            lang,
            "Long list — this is a good split, not a guaranteed best one.",
            "Danh sách dài — đây là cách chia tốt, chưa chắc tối ưu tuyệt đối."
          )}
        </p>
      )}

      {/* The honesty rail. See the header note — do not remove. */}
      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
        {L(
          lang,
          "Based only on your cards' rates and monthly caps. It doesn't know free-shipping thresholds or voucher minimums — those can be a reason to combine.",
          "Chỉ tính theo tỷ lệ hoàn và hạn mức tháng của thẻ bạn. Chưa tính ngưỡng freeship hay mức tối thiểu của voucher — mấy cái đó có thể là lý do nên gộp đơn."
        )}
      </p>
    </div>
  );
}
