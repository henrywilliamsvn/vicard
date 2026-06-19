import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARDS,
  bestCardFor,
  type CardProduct,
  type OwnedCardState,
  type SpendCategory,
} from "./cards";
import AccountBar from "./components/AccountBar";
import RewardsHub from "./components/RewardsHub";
import Wishlist from "./components/Wishlist";
import { useCloudSync, type AppData } from "./lib/useCloudSync";
import { sourcesFor } from "./rewardSources";
import { cardApplyLink, hasAnyAffiliate } from "./links";

interface OwnedCard {
  id: string;
  statementDay: number;
  dueDay: number;
  customCapVND?: number;
}

interface Purchase {
  id: string;
  dateISO: string;
  category: SpendCategory;
  amountVND: number;
  cardId: string;
  cashbackVND: number;
}

const CATEGORIES: { key: SpendCategory; label: string; emoji: string }[] = [
  { key: "dining", emoji: "🍜", label: "Dining" },
  { key: "supermarket", emoji: "🛒", label: "Supermarket" },
  { key: "online", emoji: "💻", label: "Online" },
  { key: "foreign", emoji: "✈️", label: "Foreign" },
  { key: "travel", emoji: "🚗", label: "Travel" },
  { key: "education", emoji: "🎓", label: "Education" },
  { key: "entertainment", emoji: "🎬", label: "Entertainment" },
  { key: "insurance", emoji: "🛡️", label: "Insurance" },
  { key: "everything", emoji: "💳", label: "Everything else" },
];

const REMINDER_LEAD_DAYS = 3;
const KEY_OWNED = "vicard.owned.v1";
const KEY_LOG = "vicard.log.v1";
const KEY_PAID = "vicard.paid.v1";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function formatVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "d";
}
function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function nextDue(dueDay: number): Date {
  const t = new Date();
  let due = new Date(t.getFullYear(), t.getMonth(), dueDay);
  if (due.getTime() < midnight(t).getTime()) {
    due = new Date(t.getFullYear(), t.getMonth() + 1, dueDay);
  }
  return due;
}
function daysUntil(date: Date): number {
  return Math.round((midnight(date).getTime() - midnight(new Date()).getTime()) / 86400000);
}
function periodStart(statementDay: number): Date {
  const t = new Date();
  let start = new Date(t.getFullYear(), t.getMonth(), statementDay);
  if (start.getTime() > midnight(t).getTime()) {
    start = new Date(t.getFullYear(), t.getMonth() - 1, statementDay);
  }
  return start;
}
function dueTone(days: number): { dot: string; text: string; label: string } {
  if (days <= 3) return { dot: "bg-red-500", text: "text-red-600", label: "Pay now" };
  if (days <= 7) return { dot: "bg-amber-500", text: "text-amber-600", label: "Due soon" };
  return { dot: "bg-emerald-500", text: "text-emerald-600", label: "On track" };
}
function catalogById(id: string): CardProduct | undefined {
  return CARDS.find((c) => c.id === id);
}
function fmtVerified(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function bestForTags(card: CardProduct): string[] {
  return card.rewards
    .filter((r) => r.category !== "everything")
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((r) => {
      const c = CATEGORIES.find((x) => x.key === r.category);
      return (c?.label ?? r.category) + " " + Math.round(r.rate * 100) + "%";
    });
}

export default function App() {
  const [owned, setOwned] = useState<OwnedCard[]>(() => load(KEY_OWNED, []));
  const [log, setLog] = useState<Purchase[]>(() => load(KEY_LOG, []));
  const [paid, setPaid] = useState<Record<string, string>>(() => load(KEY_PAID, {}));
  const [notifyOn, setNotifyOn] = useState(false);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => localStorage.setItem(KEY_OWNED, JSON.stringify(owned)), [owned]);
  useEffect(() => localStorage.setItem(KEY_LOG, JSON.stringify(log)), [log]);
  useEffect(() => localStorage.setItem(KEY_PAID, JSON.stringify(paid)), [paid]);

  function usedForCard(cardId: string): number {
    const card = owned.find((o) => o.id === cardId);
    if (!card) return 0;
    const start = periodStart(card.statementDay).getTime();
    return log
      .filter((p) => p.cardId === cardId && new Date(p.dateISO).getTime() >= start)
      .reduce((sum, p) => sum + p.cashbackVND, 0);
  }

  function effectiveCap(o: OwnedCard): number | null {
    if (o.customCapVND != null) return o.customCapVND;
    return catalogById(o.id)?.totalCapVND ?? null;
  }

  const ownedStates: OwnedCardState[] = useMemo(
    () => owned.map((o) => ({ id: o.id, usedThisPeriodVND: usedForCard(o.id), capVND: effectiveCap(o) })),
    [owned, log]
  );

  const [tab, setTab] = useState<"wallet" | "rewards" | "wishlist">("wallet");
  const [category, setCategory] = useState<SpendCategory>("dining");
  const recommendation = useMemo(() => bestCardFor(category, ownedStates), [category, ownedStates]);

  function bestCardLabel(cat: SpendCategory): string | undefined {
    const rec = bestCardFor(cat, ownedStates);
    return rec ? rec.card.product : undefined;
  }

  const summary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const thisMonth = log.filter((p) => new Date(p.dateISO).getTime() >= monthStart);
    const totalCashback = thisMonth.reduce((s, p) => s + p.cashbackVND, 0);
    const byCard: Record<string, number> = {};
    for (const p of thisMonth) byCard[p.cardId] = (byCard[p.cardId] ?? 0) + p.cashbackVND;
    let bestCardId: string | null = null;
    for (const [id, amt] of Object.entries(byCard)) {
      if (bestCardId === null || amt > byCard[bestCardId]) bestCardId = id;
    }
    let capRemaining = 0;
    for (const o of owned) {
      const ec = effectiveCap(o);
      if (ec != null) {
        capRemaining += Math.max(0, ec - usedForCard(o.id));
      }
    }
    return { totalCashback, bestCardId, capRemaining };
  }, [log, owned]);

  const dueSoon = useMemo(() => {
    return owned
      .map((o) => {
        const due = nextDue(o.dueDay);
        return { o, due, days: daysUntil(due), isPaid: paid[o.id] === due.toISOString() };
      })
      .filter((x) => !x.isPaid && x.days <= REMINDER_LEAD_DAYS)
      .sort((a, b) => a.days - b.days);
  }, [owned, paid]);

  useEffect(() => {
    if (!notifyOn || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const x of dueSoon) {
      const card = catalogById(x.o.id);
      const tag = x.o.id + ":" + x.due.toISOString();
      if (card && !notifiedRef.current.has(tag)) {
        notifiedRef.current.add(tag);
        new Notification("Payment due soon", {
          body: card.product + " is due in " + x.days + " day(s).",
        });
      }
    }
  }, [notifyOn, dueSoon]);

  async function enableReminders() {
    if (typeof Notification === "undefined") {
      alert("This browser does not support notifications.");
      return;
    }
    const perm = await Notification.requestPermission();
    setNotifyOn(perm === "granted");
  }

  function markPaid(cardId: string) {
    const due = nextDue(owned.find((o) => o.id === cardId)!.dueDay);
    setPaid((prev) => ({ ...prev, [cardId]: due.toISOString() }));
  }
  function removeCard(id: string) {
    setOwned((prev) => prev.filter((o) => o.id !== id));
  }

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function addSelected() {
    setOwned((prev) => {
      const toAdd = selectedIds
        .filter((id) => !prev.some((o) => o.id === id))
        .map((id) => ({ id, statementDay: 1, dueDay: 15 }));
      return [...prev, ...toAdd];
    });
    setSelectedIds([]);
  }
  function updateCardDay(id: string, field: "statementDay" | "dueDay", value: number) {
    const v = Math.min(28, Math.max(1, value || 1));
    setOwned((prev) => prev.map((o) => (o.id === id ? { ...o, [field]: v } : o)));
  }
  function updateCardCap(id: string, value: number) {
    setOwned((prev) =>
      prev.map((o) => (o.id === id ? { ...o, customCapVND: value > 0 ? value : undefined } : o))
    );
  }
  function applyCloud(d: AppData) {
    if (Array.isArray(d.owned)) setOwned(d.owned as OwnedCard[]);
    if (Array.isArray(d.log)) setLog(d.log as Purchase[]);
    if (d.paid && typeof d.paid === "object") setPaid(d.paid as Record<string, string>);
  }
  useCloudSync({ owned, log, paid }, applyCloud);
  const availableToAdd = CARDS.filter((c) => !owned.some((o) => o.id === c.id));

  const [logCat, setLogCat] = useState<SpendCategory>("dining");
  const [logAmount, setLogAmount] = useState<number>(0);
  function logPurchase() {
    if (logAmount <= 0) return;
    const rec = bestCardFor(logCat, ownedStates);
    if (!rec) return;
    const card = rec.card;
    const used = usedForCard(card.id);
    const uncapped = logAmount * rec.rule.rate;
    const remaining = card.totalCapVND != null ? Math.max(0, card.totalCapVND - used) : Infinity;
    const cashback = Math.min(uncapped, remaining);
    setLog((prev) => [
      {
        id: crypto.randomUUID(),
        dateISO: new Date().toISOString(),
        category: logCat,
        amountVND: logAmount,
        cardId: card.id,
        cashbackVND: cashback,
      },
      ...prev,
    ]);
    setLogAmount(0);
  }
  function deletePurchase(id: string) {
    setLog((prev) => prev.filter((p) => p.id !== id));
  }
  const recentLog = log.slice(0, 6);

  return (
    <div className="min-h-screen">
      <header className="bg-brand text-white">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Ví Thẻ</h1>
            <p className="text-brand-light/90 text-sm">Which card to swipe, and when to pay.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={enableReminders} className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5">
              {notifyOn ? "Reminders on" : "Enable reminders"}
            </button>
            <AccountBar />
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-5 pt-4">
        <div className="flex gap-1 bg-slate-100 rounded-full p-1">
          <button
            onClick={() => setTab("wallet")}
            className={
              "flex-1 text-sm font-medium rounded-full py-2 transition " +
              (tab === "wallet" ? "bg-white text-brand shadow-sm" : "text-slate-500")
            }
          >
            Wallet
          </button>
          <button
            onClick={() => setTab("rewards")}
            className={
              "flex-1 text-sm font-medium rounded-full py-2 transition " +
              (tab === "rewards" ? "bg-white text-brand shadow-sm" : "text-slate-500")
            }
          >
            Max rewards
          </button>
          <button
            onClick={() => setTab("wishlist")}
            className={
              "flex-1 text-sm font-medium rounded-full py-2 transition " +
              (tab === "wishlist" ? "bg-white text-brand shadow-sm" : "text-slate-500")
            }
          >
            Wishlist
          </button>
        </div>
      </div>

      {tab === "rewards" ? (
        <main className="max-w-2xl mx-auto px-5 py-6">
          <RewardsHub bestCardLabel={bestCardLabel} />
        </main>
      ) : tab === "wishlist" ? (
        <main className="max-w-2xl mx-auto px-5 py-6">
          <Wishlist notifyOn={notifyOn} />
        </main>
      ) : (
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        {dueSoon.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="font-semibold text-red-700 text-sm mb-1">
              {dueSoon.length} payment(s) due soon
            </div>
            <ul className="text-sm text-red-700 space-y-0.5">
              {dueSoon.map((x) => {
                const card = catalogById(x.o.id);
                return (
                  <li key={x.o.id} className="flex justify-between">
                    <span>{card?.product}</span>
                    <span>due in {x.days} day(s)</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {owned.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">This month</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">Cashback earned</div>
                <div className="text-xl font-bold text-brand mt-1">{formatVND(summary.totalCashback)}</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">Top card</div>
                <div className="text-sm font-semibold text-slate-700 mt-1 leading-tight">
                  {summary.bestCardId ? catalogById(summary.bestCardId)?.product : "-"}
                </div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">Cap left</div>
                <div className="text-xl font-bold text-slate-700 mt-1">{formatVND(summary.capRemaining)}</div>
              </div>
            </div>
          </section>
        )}

        {owned.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Log a purchase</h2>
            <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
              <div className="flex gap-3">
                <label className="block text-sm flex-1">
                  <span className="text-slate-600">Category</span>
                  <select value={logCat} onChange={(e) => setLogCat(e.target.value as SpendCategory)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2">
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm flex-1">
                  <span className="text-slate-600">Amount</span>
                  <input type="number" min={0} step={10000} value={logAmount || ""} onChange={(e) => setLogAmount(+e.target.value)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2" />
                </label>
              </div>
              {logAmount > 0 && (() => {
                const rec = bestCardFor(logCat, ownedStates);
                if (!rec) return null;
                return (
                  <>
                    <div className="text-sm text-slate-600 bg-brand-light rounded-lg px-3 py-2">
                      Use <strong>{rec.card.product}</strong> → {Math.round(rec.rule.rate * 100)}% = <strong>{formatVND(logAmount * rec.rule.rate)}</strong> back
                    </div>
                    {sourcesFor(logCat).length > 0 && (
                      <div className="text-xs text-slate-500 mt-1.5">
                        Also stack:{" "}
                        {sourcesFor(logCat).map((src, i) => (
                          <span key={src.name}>
                            {i > 0 ? ", " : ""}
                            <a href={src.url} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline" title={src.note}>{src.name}</a>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              <button onClick={logPurchase} disabled={logAmount <= 0} className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40">Log purchase</button>
            </div>
            {recentLog.length > 0 && (
              <div className="mt-3 space-y-2">
                {recentLog.map((p) => {
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-lg px-3 py-2">
                      <span>{formatVND(p.amountVND)} · <span className="text-slate-500">{catalogById(p.cardId)?.product}</span></span>
                      <span className="flex items-center gap-3">
                        <span className="text-brand font-medium">+{formatVND(p.cashbackVND)}</span>
                        <button onClick={() => deletePurchase(p.id)} className="text-slate-300 hover:text-red-500" aria-label="Delete">x</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">Which card should I use?</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => setCategory(c.key)} className={"px-3 py-1.5 rounded-full text-sm border transition " + (category === c.key ? "bg-brand text-white border-brand" : "bg-white text-slate-700 border-slate-200 hover:border-brand")}>
                {c.label}
              </button>
            ))}
          </div>
          {owned.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-center text-slate-500">Add a card below to get a recommendation.</div>
          ) : recommendation ? (
            <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-5">
              <div className="text-xs uppercase tracking-wide text-slate-400 mb-1">Best card for {CATEGORIES.find((c) => c.key === category)?.label}</div>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="font-semibold text-slate-800">{recommendation.card.product}</div>
                  <div className="text-sm text-slate-500">{recommendation.card.bank}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Verified {fmtVerified(recommendation.card.lastVerified)} · confirm on bank site</div>
                </div>
                <div className="text-3xl font-bold text-brand">{Math.round(recommendation.rule.rate * 100)}%</div>
              </div>
              {sourcesFor(category).length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="text-xs font-medium text-slate-500 mb-1.5">Stack more cashback before you pay</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sourcesFor(category).map((src) => (
                      <a
                        key={src.name}
                        href={src.url}
                        target="_blank"
                        rel="noreferrer"
                        title={src.note}
                        className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full hover:bg-amber-100"
                      >
                        {src.name} ↗
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-slate-500">No recommendation.</div>
          )}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">My wallet ({owned.length})</h2>
          <div className="space-y-3">
            {owned.map((o) => {
              const card = catalogById(o.id);
              if (!card) return null;
              const due = nextDue(o.dueDay);
              const isPaid = paid[o.id] === due.toISOString();
              const days = daysUntil(due);
              const tone = dueTone(days);
              const cap = effectiveCap(o);
              const used = usedForCard(o.id);
              const usedPct = cap ? Math.min(100, (used / cap) * 100) : 0;
              return (
                <div key={o.id} className="rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800">{card.product}</div>
                      <div className="text-sm text-slate-500">{card.bank}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Verified {fmtVerified(card.lastVerified)}</div>
                    </div>
                    <button onClick={() => removeCard(o.id)} className="text-slate-300 hover:text-red-500 text-sm" aria-label="Remove card">x</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bestForTags(card).map((t) => (
                      <span key={t} className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600">Paid</span>
                          <span className="text-sm text-slate-400">next due day {o.dueDay}</span>
                        </>
                      ) : (
                        <>
                          <span className={"w-2.5 h-2.5 rounded-full " + tone.dot} />
                          <span className={"text-sm font-medium " + tone.text}>{tone.label}</span>
                          <span className="text-sm text-slate-500">· due in {days} day(s)</span>
                        </>
                      )}
                    </div>
                    {!isPaid && (
                      <button onClick={() => markPaid(o.id)} className="text-xs border border-brand text-brand rounded-full px-3 py-1 hover:bg-brand-light">Mark as paid</button>
                    )}
                  </div>
                  {cap && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>Cashback used this period</span>
                        <span>{formatVND(used)} / {formatVND(cap)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: usedPct + "%" }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <label className="flex items-center gap-1">
                      Statement day
                      <input type="number" min={1} max={28} value={o.statementDay} onChange={(e) => updateCardDay(o.id, "statementDay", +e.target.value)} className="w-14 border border-slate-200 rounded px-2 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      Due day
                      <input type="number" min={1} max={28} value={o.dueDay} onChange={(e) => updateCardDay(o.id, "dueDay", +e.target.value)} className="w-14 border border-slate-200 rounded px-2 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      Max cashback
                      <input type="number" min={0} step={50000} value={o.customCapVND ?? ""} placeholder={cap ? String(cap) : "none"} onChange={(e) => updateCardCap(o.id, +e.target.value)} className="w-24 border border-slate-200 rounded px-2 py-1" />
                    </label>
                  </div>
                </div>
              );
            })}
            {owned.length === 0 && <p className="text-slate-500 text-sm">No cards yet.</p>}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">Add a card</h2>
          <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
            <p className="text-sm text-slate-600">Tick every card you own — add them all at once.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableToAdd.map((c) => {
                const checked = selectedIds.includes(c.id);
                const applyUrl = cardApplyLink(c.bank);
                return (
                  <div
                    key={c.id}
                    className={"flex items-center gap-2 text-sm border rounded-lg px-3 py-2 transition " + (checked ? "border-brand bg-brand-light" : "border-slate-200 bg-white hover:border-brand")}
                  >
                    <button onClick={() => toggleSelect(c.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                      <span className={"w-4 h-4 rounded flex items-center justify-center text-[10px] text-white shrink-0 " + (checked ? "bg-brand" : "bg-slate-200")}>{checked ? "✓" : ""}</span>
                      <span className="min-w-0">
                        <span className="font-medium text-slate-700">{c.product}</span>
                        <span className="block text-xs text-slate-400">{c.bank}</span>
                      </span>
                    </button>
                    {applyUrl && (
                      <a href={applyUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-brand border border-brand rounded-full px-2 py-1 hover:bg-brand hover:text-white shrink-0">
                        Apply ↗
                      </a>
                    )}
                  </div>
                );
              })}
              {availableToAdd.length === 0 && <p className="text-slate-400 text-sm">All catalog cards added.</p>}
            </div>
            <button onClick={addSelected} disabled={selectedIds.length === 0} className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40">
              {selectedIds.length === 0 ? "Select cards to add" : "Add " + selectedIds.length + " card" + (selectedIds.length === 1 ? "" : "s") + " to wallet"}
            </button>
            <p className="text-xs text-slate-400">New cards start with statement day 1 and due day 15 — adjust each card's dates in your wallet above. Privacy-first: no bank login; everything stays on this device.</p>
            {hasAnyAffiliate() && (
              <p className="text-[11px] text-slate-400 leading-snug">
                "Apply" links are affiliate links — we may earn a commission at no extra cost to you. We rank cards by what's best for you, never by what pays us.
              </p>
            )}
          </div>
        </section>

        <footer className="text-center text-xs text-slate-400 pt-4">
          Reminders only fire while the app is open in your browser. Rates are a June 2026 draft and change often - confirm with your bank. Not financial advice.
        </footer>
      </main>
      )}
    </div>
  );
}
