import { useMemo, useState } from "react";
import { bestCardFor, type OwnedCardState, type SpendCategory } from "./cards";
import { buildStackingPlan } from "./rewardSources";
import { catLabel, type Lang } from "./i18n";

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

function vnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}
function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}
const PICK_ONE: Record<string, boolean> = { portal: true, wallet: true };

export default function BuyFlow({ ownedStates, lang, onAddCards }: Props) {
  const [cat, setCat] = useState<SpendCategory>("online");
  const [amount, setAmount] = useState<number>(0);

  const best = useMemo(() => bestCardFor(cat, ownedStates), [cat, ownedStates]);

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

  const steps = useMemo(() => buildStackingPlan(cat, best?.card.product), [cat, best]);

  if (ownedStates.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
        <p className="text-slate-600 mb-3">
          {L(lang, "Add the cards you own first — then we'll show exactly how to pay for the most cashback.", "Thêm các thẻ bạn có trước — rồi chúng tôi sẽ chỉ cách trả để hoàn tiền nhiều nhất.")}
        </p>
        <button onClick={onAddCards} className="bg-brand text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-dark">
          {L(lang, "Add my cards", "Thêm thẻ của tôi")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">{L(lang, "What are you buying?", "Bạn định mua gì?")}</h2>
        <p className="text-sm text-slate-500">{L(lang, "Tap a category — we'll build the cheapest way to pay.", "Chọn danh mục — chúng tôi tìm cách trả tiết kiệm nhất.")}</p>
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

      <label className="block text-sm">
        <span className="text-slate-600">{L(lang, "How much? (optional)", "Bao nhiêu? (tuỳ chọn)")}</span>
        <input type="number" min={0} step={10000} value={amount || ""} onChange={(e) => setAmount(+e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" placeholder="0đ" />
      </label>

      <div className="rounded-xl bg-white shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-brand text-white px-5 py-4">
          <div className="text-sm opacity-90">
            {L(lang, "Buying", "Đang mua")} {catLabel(lang, cat)}{amount > 0 ? " · " + vnd(amount) : ""}
          </div>
          {cardCashback ? (
            <>
              <div className="text-2xl font-bold mt-1">{L(lang, "You save about", "Bạn tiết kiệm khoảng")} {vnd(cardCashback.capped)}</div>
              {cardCashback.remaining != null && cardCashback.raw > cardCashback.remaining && (
                <div className="text-xs opacity-90 mt-0.5">{L(lang, "Capped at this card's remaining limit this cycle.", "Đã giới hạn theo hạn mức còn lại của thẻ kỳ này.")}</div>
              )}
              <div className="text-xs opacity-90 mt-0.5">{L(lang, "Card cashback only — stack the steps below for more.", "Chỉ tính hoàn tiền thẻ — làm thêm các bước dưới để cộng dồn.")}</div>
            </>
          ) : (
            <div className="text-base font-medium mt-1">
              {best ? Math.round(best.rule.rate * 100) + "% " + L(lang, "with", "với") + " " + best.card.product : L(lang, "No card for this category yet", "Chưa có thẻ cho danh mục này")}
            </div>
          )}
        </div>

        <ol className="divide-y divide-slate-100">
          {steps.map((s) => {
            const isCard = s.layer === "card";
            const pickOne = PICK_ONE[s.layer];
            return (
              <li key={s.order} className="px-5 py-3 flex gap-3">
                <div className="flex-none w-6 h-6 rounded-full bg-brand-light text-brand-dark flex items-center justify-center text-xs font-semibold">{s.order}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">
                    {isCard && best ? L(lang, "Pay with", "Trả bằng") + " " + best.card.product + " — " + Math.round(best.rule.rate * 100) + "%" : s.title}
                  </div>
                  {isCard && cardCashback && (
                    <div className="text-xs text-brand mt-0.5">+{vnd(cardCashback.capped)} {L(lang, "cashback", "hoàn tiền")}</div>
                  )}
                  {!isCard && s.sources.length > 0 && (
                    <div className="mt-1">
                      {pickOne && <div className="text-[11px] text-amber-700 mb-1">{L(lang, "Pick ONE:", "Chọn MỘT:")}</div>}
                      <div className="flex flex-wrap gap-1.5">
                        {s.sources.map((src) => (
                          <a key={src.name} href={src.url} target="_blank" rel="noreferrer" title={src.note} className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100">{src.name} ↗</a>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isCard && s.sources.length === 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="text-xs text-slate-400">
        {L(lang, "Savings are an estimate. Wallet/portal promos change daily — pick the single best one. Card cashback is capped to your card's monthly limit.", "Số tiết kiệm là ước tính. Khuyến mãi ví/cổng đổi hằng ngày — chọn cái tốt nhất. Hoàn tiền thẻ bị giới hạn theo hạn mức tháng.")}
      </p>
    </div>
  );
}
