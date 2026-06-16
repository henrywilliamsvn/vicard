import { useEffect, useMemo, useState } from "react";
import {
  CARDS,
  bestCardFor,
  type CardProduct,
  type OwnedCardState,
  type SpendCategory,
} from "./cards";

// ---------------------------------------------------------------------------
// Owned card = a card the user holds + their personal statement/due days +
// how much cashback they've already earned this statement period.
// ---------------------------------------------------------------------------
interface OwnedCard extends OwnedCardState {
  statementDay: number; // 1-28
  dueDay: number; // 1-28
}

const CATEGORIES: { key: SpendCategory; label: string; emoji: string }[] = [
  { key: "dining", label: "Dining", emoji: "🍜" },
  { key: "supermarket", label: "Supermarket", emoji: "🛒" },
  { key: "online", label: "Online", emoji: "💻" },
  { key: "foreign", label: "Foreign", emoji: "✈️" },
  { key: "travel", label: "Travel", emoji: "🚗" },
  { key: "education", label: "Education", emoji: "🎓" },
  { key: "entertainment", label: "Entertainment", emoji: "🎬" },
  { key: "insurance", label: "Insurance", emoji: "🛡️" },
  { key: "everything", label: "Everything else", emoji: "💳" },
];

const STORAGE_KEY = "vicard.owned.v1";

function loadOwned(): OwnedCard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OwnedCard[]) : [];
  } catch {
    return [];
  }
}

function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "₫";
}

// Days until the NEXT occurrence of `dueDay` from today.
function daysUntilDue(dueDay: number): number {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  let due = new Date(y, m, dueDay);
  if (due.getTime() < new Date(y, m, today.getDate()).getTime()) {
    due = new Date(y, m + 1, dueDay);
  }
  const ms = due.getTime() - new Date(y, m, today.getDate()).getTime();
  return Math.round(ms / 86_400_000);
}

function dueTone(days: number): { ring: string; text: string; label: string } {
  if (days <= 3) return { ring: "bg-red-500", text: "text-red-600", label: "Pay now" };
  if (days <= 7) return { ring: "bg-amber-500", text: "text-amber-600", label: "Due soon" };
  return { ring: "bg-emerald-500", text: "text-emerald-600", label: "On track" };
}

function catalogById(id: string): CardProduct | undefined {
  return CARDS.find((c) => c.id === id);
}

// Short "best for" tags = its non-"everything" categories with the top rates.
function bestForTags(card: CardProduct): string[] {
  return card.rewards
    .filter((r) => r.category !== "everything")
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((r) => {
      const c = CATEGORIES.find((x) => x.key === r.category);
      return `${c?.emoji ?? ""} ${c?.label ?? r.category} ${Math.round(r.rate * 100)}%`;
    });
}

export default function App() {
  const [owned, setOwned] = useState<OwnedCard[]>(loadOwned);
  const [category, setCategory] = useState<SpendCategory>("dining");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(owned));
  }, [owned]);

  const recommendation = useMemo(
    () => bestCardFor(category, owned),
    [category, owned]
  );

  // ----- add-card form state -----
  const [pickId, setPickId] = useState<string>(CARDS[0].id);
  const [statementDay, setStatementDay] = useState(1);
  const [dueDay, setDueDay] = useState(15);

  function addCard() {
    if (owned.some((o) => o.id === pickId)) return;
    setOwned((prev) => [
      ...prev,
      { id: pickId, statementDay, dueDay, usedThisPeriodVND: 0 },
    ]);
  }

  function removeCard(id: string) {
    setOwned((prev) => prev.filter((o) => o.id !== id));
  }

  function logSpend(id: string, cashbackVND: number) {
    setOwned((prev) =>
      prev.map((o) =>
        o.id === id
          ? { ...o, usedThisPeriodVND: o.usedThisPeriodVND + cashbackVND }
          : o
      )
    );
  }

  const availableToAdd = CARDS.filter((c) => !owned.some((o) => o.id === c.id));

  return (
    <div className="min-h-screen">
      <header className="bg-brand text-white">
        <div className="max-w-2xl mx-auto px-5 py-5">
          <h1 className="text-2xl font-bold">Ví Thẻ</h1>
          <p className="text-brand-light/90 text-sm">
            Your card command center — which card to swipe, and when to pay.
          </p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        {/* ---------- WHICH CARD PICKER ---------- */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Which card should I use?</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition ${
                  category === c.key
                    ? "bg-brand text-white border-brand"
                    : "bg-white text-slate-700 border-slate-200 hover:border-brand"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {owned.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">
              Add a card below to get a recommendation.
            </div>
          ) : recommendation ? (
            <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Best card for {CATEGORIES.find((c) => c.key === category)?.label}
              </div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold text-slate-800">
                    {recommendation.card.product}
                  </div>
                  <div className="text-sm text-slate-500">
                    {recommendation.card.bank}
                  </div>
                </div>
                <div className="text-3xl font-bold text-brand">
                  {Math.round(recommendation.rule.rate * 100)}%
                </div>
              </div>
              {recommendation.rule.note && (
                <p className="text-xs text-slate-500 mt-2">
                  {recommendation.rule.note}
                </p>
              )}
              <button
                onClick={() => logSpend(recommendation.card.id, 50_000)}
                className="mt-3 text-xs text-brand hover:underline"
              >
                + I used this card (log ~50,000₫ cashback toward its cap)
              </button>
            </div>
          ) : (
            <div className="text-slate-500">No recommendation.</div>
          )}
        </section>

        {/* ---------- WALLET DASHBOARD ---------- */}
        <section>
          <h2 className="text-lg font-semibold mb-3">
            My wallet ({owned.length})
          </h2>
          <div className="space-y-3">
            {owned.map((o) => {
              const card = catalogById(o.id);
              if (!card) return null;
              const days = daysUntilDue(o.dueDay);
              const tone = dueTone(days);
              const cap = card.totalCapVND ?? null;
              const usedPct = cap ? Math.min(100, (o.usedThisPeriodVND / cap) * 100) : 0;
              return (
                <div
                  key={o.id}
                  className="rounded-xl bg-white shadow-sm border border-slate-100 p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {card.product}
                      </div>
                      <div className="text-sm text-slate-500">{card.bank}</div>
                    </div>
                    <button
                      onClick={() => removeCard(o.id)}
                      className="text-slate-300 hover:text-red-500 text-sm"
                      aria-label="Remove card"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bestForTags(card).map((t) => (
                      <span
                        key={t}
                        className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${tone.ring}`} />
                    <span className={`text-sm font-medium ${tone.text}`}>
                      {tone.label}
                    </span>
                    <span className="text-sm text-slate-500">
                      · payment due in {days} day{days === 1 ? "" : "s"} (day{" "}
                      {o.dueDay})
                    </span>
                  </div>

                  {cap && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Cashback used this period</span>
                        <span>
                          {formatVND(o.usedThisPeriodVND)} / {formatVND(cap)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand"
                          style={{ width: `${usedPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {owned.length === 0 && (
              <p className="text-slate-500 text-sm">No cards yet.</p>
            )}
          </div>
        </section>

        {/* ---------- ADD CARD (manual, privacy-first) ---------- */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Add a card</h2>
          <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
            <label className="block text-sm">
              <span className="text-slate-600">Card</span>
              <select
                value={pickId}
                onChange={(e) => setPickId(e.target.value)}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
              >
                {availableToAdd.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.bank} — {c.product}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-3">
              <label className="block text-sm flex-1">
                <span className="text-slate-600">Statement day</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={statementDay}
                  onChange={(e) => setStatementDay(+e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </label>
              <label className="block text-sm flex-1">
                <span className="text-slate-600">Payment due day</span>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={dueDay}
                  onChange={(e) => setDueDay(+e.target.value)}
                  className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2"
                />
              </label>
            </div>
            <button
              onClick={addCard}
              disabled={availableToAdd.length === 0}
              className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40"
            >
              Add to wallet
            </button>
            <p className="text-xs text-slate-400">
              Privacy-first: no bank login, no account numbers. Everything stays
              on this device.
            </p>
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400 pt-4">
          Rates are a draft compiled June 2026 and change often — confirm with
          your bank. Not financial advice.
        </footer>
      </main>
    </div>
  );
}
