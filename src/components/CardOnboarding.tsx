// =============================================================================
// CardOnboarding — the 10-second "Bạn có thẻ nào?" picker (UX review P1 #4).
// Shown once to card-less visitors after the product tour. Personalising the
// answer to cards the user actually owns is the app's biggest trust lever:
// without it the default answer reads like a bank ad ("10% với VIB... Mở thẻ")
// to someone who never told us anything about themselves.
// =============================================================================
import { useMemo, useState } from "react";
import { CARDS, type CardProduct } from "../cards";
import type { Lang } from "../i18n";

type Props = {
  lang: Lang;
  open: boolean;
  /** Save the selected catalog ids as owned cards. */
  onSave: (ids: string[]) => void;
  /** User explicitly has no cards — remember it and stop asking. */
  onNone: () => void;
  /** Dismissed without answering (X / backdrop). */
  onClose: () => void;
};

function L(lang: Lang, en: string, vi: string): string {
  return lang === "vi" ? vi : en;
}

function norm(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function topRateLabel(card: CardProduct): string {
  let best = 0;
  for (const r of card.rewards) if (r.rate > best) best = r.rate;
  return Math.round(best * 100) + "%";
}

export default function CardOnboarding({ lang, open, onSave, onNone, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const banks = useMemo(() => {
    const q = norm(query.trim());
    const map = new Map<string, CardProduct[]>();
    for (const c of CARDS) {
      if (q && !norm(c.bank + " " + c.product).includes(q)) continue;
      const list = map.get(c.bank) ?? [];
      list.push(c);
      map.set(c.bank, list);
    }
    return Array.from(map.entries());
  }, [query]);

  if (!open) return null;

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="px-5 pt-5 pb-3 flex items-start gap-3">
          <img src="/mascot.png" alt="Meo" className="w-10 h-10 rounded-full bg-brand-light object-cover shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800 leading-tight">
              {L(lang, "Which cards do you have?", "Bạn có thẻ nào? 🐱")}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {L(
                lang,
                "Pick your cards (10 seconds) — Meo will calculate exact savings for what's in YOUR wallet.",
                "Chọn thẻ bạn đang có (10 giây) — Meo sẽ tính chính xác theo ví của BẠN, không quảng cáo thẻ lạ."
              )}
            </p>
          </div>
          <button onClick={onClose} aria-label={L(lang, "Close", "Đóng")} className="text-slate-300 hover:text-slate-500 text-xl leading-none shrink-0">×</button>
        </div>

        <div className="px-5 pb-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={L(lang, "Search bank or card…", "Tìm ngân hàng hoặc thẻ…")}
            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-brand"
          />
        </div>

        <div className="px-5 overflow-y-auto flex-1 min-h-0 pb-2">
          {banks.length === 0 && (
            <p className="text-sm text-slate-400 py-4 text-center">{L(lang, "No match — try another name.", "Không thấy — thử tên khác nhé.")}</p>
          )}
          {banks.map(([bank, cards]) => (
            <div key={bank} className="mb-2">
              <div className="text-[11px] uppercase tracking-wide text-slate-400 py-1 sticky top-0 bg-white">{bank}</div>
              <div className="space-y-1">
                {cards.map((c) => {
                  const on = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={
                        "w-full flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition " +
                        (on ? "border-brand bg-brand-light" : "border-slate-100 bg-white hover:border-brand/50")
                      }
                    >
                      <span className={"text-sm truncate " + (on ? "font-semibold text-brand-dark" : "text-slate-700")}>{c.product}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{L(lang, "up to", "tới")} {topRateLabel(c)}</span>
                        <span className={"w-5 h-5 rounded-full border flex items-center justify-center text-xs " + (on ? "bg-brand border-brand text-white" : "border-slate-200 text-transparent")}>✓</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={onNone}
            className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2.5 rounded-lg border border-slate-200 whitespace-nowrap"
          >
            {L(lang, "I don't have a card yet", "Mình chưa có thẻ")}
          </button>
          <button
            onClick={() => selected.length > 0 && onSave(selected)}
            disabled={selected.length === 0}
            className={
              "flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition " +
              (selected.length > 0 ? "bg-brand text-white hover:bg-brand-dark" : "bg-slate-100 text-slate-400 cursor-not-allowed")
            }
          >
            {selected.length > 0
              ? L(lang, `Save ${selected.length} card${selected.length > 1 ? "s" : ""}`, `Lưu ${selected.length} thẻ`)
              : L(lang, "Select your cards", "Chọn thẻ của bạn")}
          </button>
        </div>
      </div>
    </div>
  );
}
