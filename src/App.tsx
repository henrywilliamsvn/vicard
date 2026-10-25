import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CARDS,
  bestCardFor,
  type CardProduct,
  type OwnedCardState,
  type SpendCategory,
} from "./cards";
import AccountBar from "./components/AccountBar";
import RewardsHub from "./components/RewardsHub";
import { useCloudSync, type AppData } from "./lib/useCloudSync";
import { sourcesFor } from "./rewardSources";
import { cardApplyLink, hasCardAffiliate, rewardLink } from "./links";
import { useLang, t, catLabel } from "./i18n";
import BuyFlow from "./BuyFlow";
import MoneyInput from "./components/MoneyInput";
import PriceTab from "./PriceTab";
import { onReplayTourStep } from "./lib/tourBus";
import InstallPrompt from "./components/InstallPrompt";
import CookieConsent from "./components/CookieConsent";
import { trackView, trackEvent, trackAction, tabFromPath } from "./lib/track";
import ShoppingTripInterstitial from "./components/ShoppingTripInterstitial";
import ShoppingTrips from "./components/ShoppingTrips";
// CashOutCard (payout preview) intentionally NOT mounted yet — saved for the
// post-launch payout stage. See Outbox/MeoSanSales-Payout-Architecture-and-Compliance-Plan.
import DealsTab from "./components/DealsTab";
import CardOnboarding from "./components/CardOnboarding";
import ProductTour, { DEFAULT_TOUR_STEPS } from "./components/tour/ProductTour";

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

const CATEGORIES: { key: SpendCategory; emoji: string }[] = [
  { key: "dining", emoji: "🍜" },
  { key: "supermarket", emoji: "🛒" },
  { key: "online", emoji: "💻" },
  { key: "foreign", emoji: "✈️" },
  { key: "travel", emoji: "🚗" },
  { key: "education", emoji: "🎓" },
  { key: "entertainment", emoji: "🎬" },
  { key: "insurance", emoji: "🛡️" },
  { key: "everything", emoji: "💳" },
];

const REMINDER_LEAD_DAYS = 3;
const KEY_CARD_PROMPT = "vicard.cardprompt.v1";
// How many times this browser has opened the app. Visit 1 belongs to the card
// picker; the product tour auto-offers from visit 2 (see the ordering rule below).
const KEY_VISITS = "vicard.visits.v1";
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
  return new Intl.NumberFormat("vi-VN").format(Math.round(n)) + "đ";
}
function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function nextDue(dueDay: number): Date {
  const t2 = new Date();
  let due = new Date(t2.getFullYear(), t2.getMonth(), dueDay);
  if (due.getTime() < midnight(t2).getTime()) {
    due = new Date(t2.getFullYear(), t2.getMonth() + 1, dueDay);
  }
  return due;
}
function daysUntil(date: Date): number {
  return Math.round((midnight(date).getTime() - midnight(new Date()).getTime()) / 86400000);
}
function periodStart(statementDay: number): Date {
  const t2 = new Date();
  let start = new Date(t2.getFullYear(), t2.getMonth(), statementDay);
  if (start.getTime() > midnight(t2).getTime()) {
    start = new Date(t2.getFullYear(), t2.getMonth() - 1, statementDay);
  }
  return start;
}
function catalogById(id: string): CardProduct | undefined {
  return CARDS.find((c) => c.id === id);
}
function fmtVerified(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function bestForTags(card: CardProduct, lang: "vi" | "en"): string[] {
  return card.rewards
    .filter((r) => r.category !== "everything")
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map((r) => catLabel(lang, r.category) + " " + Math.round(r.rate * 100) + "%");
}

export default function App() {
  const [lang, setLang] = useLang();
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

  const [tab, setTabState] = useState<"price" | "buy" | "wallet" | "rewards" | "deals">(tabFromPath);
  // Tab changes become SPA page views (/, /mua-gi, /wallet, /rewards, /deals)
  // so Cloudflare Web Analytics can finally see more than "/".
  //
  // 15 Aug 2026: "/" is Xem giá, the new front door. Mua gì is /mua-gi.
  const setTab = useCallback((next: "price" | "buy" | "wallet" | "rewards" | "deals") => {
    setTabState(next);
    trackView(next === "price" ? "/" : next === "buy" ? "/mua-gi" : "/" + next, next);
  }, []);

  // First-time product tour (Meo instructor + voice). Runs once.
  //
  // ⚠️ The tour DRIVES the tab itself (each step's `beforeStep`), so the
  // "user walked away" guard below must compare against the tab the TOUR last
  // asked for — not a hardcoded one. It used to hardcode "buy", which was fine
  // while "buy" was also the landing tab. On 15 Aug 2026 the landing tab became
  // "price", and that instantly made the guard fire on first paint: the tour
  // switched itself off before step 1 and wrote mss_tour_done=1, so no new user
  // would ever have seen it again. Caught before shipping; keep the ref.
  const [runTour, setRunTour] = useState(false);
  const [tourStart, setTourStart] = useState(0);
  // Starts at the tab the user actually landed on, i.e. "the tour has not moved
  // anything yet". Seeding it with a literal (it was "buy") reintroduces the
  // self-destruct: at first paint tab is "price", so tab !== ref and the guard
  // fires before the tour has taken a single step.
  const tourTabRef = useRef<"price" | "buy" | "wallet" | "rewards" | "deals">(tabFromPath());
  const tourSteps = useMemo(
    () =>
      DEFAULT_TOUR_STEPS.map((s) => {
        // Honour the step's own tab. This used to force "buy" for every step,
        // which was fine when every target lived on that one tab. After the
        // 15 Aug restructure the paste box is on Xem giá and the price alert is
        // on Tối đa ưu đãi, so forcing "buy" would spotlight elements that are
        // not mounted — an empty highlight over the wrong screen.
        const want = s.tab ?? "buy";
        return {
          ...s,
          beforeStep: async () => {
            tourTabRef.current = want;
            setTab(want);
            // Let React mount the tab we just switched to, then make sure the
            // target is actually VISIBLE.
            //
            // ⚠️ ProductTour's waitForElement only checks that the node EXISTS,
            // and existence is not visibility. Measured in Chrome 141: a node
            // inside a CLOSED <details> still reports a full-size rect (same
            // x/y/w/h as when open) because it is laid out — it simply is not
            // painted. So the tour would happily spotlight it and draw the
            // tooltip over a blank strip of page, with no warning logged.
            // Tối đa ưu đãi is all collapsible sections now and step 5 lives
            // inside one, so this is not hypothetical.
            await new Promise((r) => setTimeout(r, 80));
            let node = document.querySelector(s.target)?.parentElement ?? null;
            while (node) {
              if (node instanceof HTMLDetailsElement) node.open = true;
              node = node.parentElement;
            }
          },
        };
      }),
    []
  );
  // ⚠️ The tour's auto-start effect used to live here, firing 800ms into the
  // FIRST visit. It now sits below the card picker, because it must be able to
  // see `showCardPicker` — and because visit 1 no longer belongs to it. See the
  // ordering rule there.

  // A section's Meo help button asks for its own step to be replayed. Matching
  // on the target SELECTOR rather than an index means inserting a step never
  // silently re-points these buttons at the wrong explanation.
  useEffect(
    () =>
      onReplayTourStep((target) => {
        const i = tourSteps.findIndex((s) => s.target === target);
        if (i < 0) return;
        setTourStart(i);
        // Force a restart even if a tour is already open on another step.
        setRunTour(false);
        window.setTimeout(() => setRunTour(true), 0);
      }),
    [tourSteps]
  );
  // If the user navigates away from the tab the tour is pointing at, they've
  // taken the wheel — dismiss the tour instead of leaving a stale spotlight
  // glued to the old position over the new view.
  useEffect(() => {
    if (runTour && tab !== tourTabRef.current) {
      setRunTour(false);
      if (typeof localStorage !== "undefined") localStorage.setItem("mss_tour_done", "1");
    }
  }, [tab, runTour]);

  // ── Visit counting (added 7 Sept 2026) ──────────────────────────────────
  // Counted once per mount; the ref guard keeps React StrictMode's double
  // invoke from inflating it. `app_opened` carries the number so a first visit
  // and a return visit can finally be told apart in PostHog — until now every
  // anonymous session looked identical.
  const visitCountedRef = useRef(false);
  const [visitNo, setVisitNo] = useState(0);
  useEffect(() => {
    if (visitCountedRef.current) return;
    visitCountedRef.current = true;
    if (typeof localStorage === "undefined") return;
    const n = (parseInt(localStorage.getItem(KEY_VISITS) ?? "0", 10) || 0) + 1;
    try {
      localStorage.setItem(KEY_VISITS, String(n));
    } catch {
      /* private mode — count the visit anyway, just don't persist it */
    }
    setVisitNo(n);
    trackAction("app_opened", { visit: n, returning: n > 1 });
  }, []);

  // "Bạn có thẻ nào?" onboarding (UX review P1 #4 — the biggest trust lever).
  // Auto-opens once for card-less visitors, but only AFTER the product tour is
  // done so the two never stack. Any answer (save / none / dismiss) is
  // remembered and it never auto-opens again; BuyFlow can reopen it on demand.
  const [showCardPicker, setShowCardPickerState] = useState(false);
  const setShowCardPicker = useCallback((open: boolean) => {
    if (open) trackEvent("pick-cards");
    setShowCardPickerState(open);
  }, []);
  // ⚠️ THE ORDERING RULE (7 Sept 2026) — do not re-gate this on the tour.
  // This effect used to read `if (runTour || !localStorage.getItem("mss_tour_done")) return;`
  // while the tour auto-started 800ms into the first visit. So the app asked
  // "which cards do you have?" only AFTER a visitor sat through, skipped or
  // abandoned a voice-guided tour. Anyone who bounced first was never asked —
  // which is why August produced 19 basket advices, ALL with verdict
  // `no-cards`, and exactly one `cards_saved` in the month. The card question
  // is the one that makes every later answer real, so it goes first.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (owned.length > 0) return;
    if (runTour) return;
    if (visitNo < 1) return; // wait until the visit has actually been counted
    if (localStorage.getItem(KEY_CARD_PROMPT)) return;
    const id = window.setTimeout(() => setShowCardPicker(true), 600);
    return () => window.clearTimeout(id);
  }, [owned.length, runTour, visitNo]);

  // The product tour, auto-offered from the SECOND visit — once someone has
  // shown they came back. It is always reachable before that from the
  // per-section Meo help buttons, so nothing is lost by not shouting it on
  // arrival. It never stacks on an unanswered card question.
  useEffect(() => {
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem("mss_tour_done")) return;
    if (visitNo < 2) return;
    if (showCardPicker) return;
    if (owned.length === 0 && !localStorage.getItem(KEY_CARD_PROMPT)) return;
    const id = window.setTimeout(() => setRunTour(true), 800);
    return () => window.clearTimeout(id);
  }, [visitNo, showCardPicker, owned.length]);
  function cardPickerSave(ids: string[]) {
    setOwned((prev) => [
      ...prev,
      ...ids.filter((id) => !prev.some((o) => o.id === id)).map((id) => ({ id, statementDay: 1, dueDay: 15 })),
    ]);
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY_CARD_PROMPT, "picked");
    trackAction("card_prompt_answered", { choice: "picked", count: ids.length, visit: visitNo });
    trackEvent("cards-saved");
    setShowCardPicker(false);
  }
  function cardPickerNone() {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY_CARD_PROMPT, "none");
    trackAction("card_prompt_answered", { choice: "none", visit: visitNo });
    setShowCardPicker(false);
  }
  function cardPickerClose() {
    if (typeof localStorage !== "undefined") localStorage.setItem(KEY_CARD_PROMPT, "dismissed");
    trackAction("card_prompt_answered", { choice: "dismissed", visit: visitNo });
    setShowCardPicker(false);
  }

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
    const name = catalogById(id)?.product ?? "this card";
    if (!confirm(t(lang, "confirmRemove", { card: name }))) return;
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

  const welcomeHero = (
    <section className="rounded-xl bg-brand-light border border-brand/20 p-5">
      <h2 className="text-lg font-semibold text-brand-dark mb-1">{t(lang, "welcomeTitle")}</h2>
      <p className="text-sm text-slate-600">{t(lang, "welcomeBody")}</p>
    </section>
  );

  // Group the addable cards by bank so the list reads as collapsible sections
  // instead of one long flat list.
  const banksToAdd = (() => {
    const groups = new Map<string, CardProduct[]>();
    for (const c of availableToAdd) {
      const arr = groups.get(c.bank) ?? [];
      arr.push(c);
      groups.set(c.bank, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  })();

  const addCardSection = (
    <section>
      <h2 className="text-lg font-semibold mb-3">{t(lang, "addACard")}</h2>
      <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
        <p className="text-sm text-slate-600">{t(lang, "tickEvery")}</p>
        {availableToAdd.length === 0 ? (
          <p className="text-slate-400 text-sm">{t(lang, "allAdded")}</p>
        ) : (
          <div className="space-y-2">
            {banksToAdd.map(([bank, cards], idx) => {
              const selInBank = cards.filter((c) => selectedIds.includes(c.id)).length;
              return (
                <details key={bank} open={idx === 0} className="group border border-slate-200 rounded-lg overflow-hidden">
                  <summary className="cursor-pointer list-none px-3 py-2.5 flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100">
                    <span className="font-medium text-slate-700 text-sm min-w-0 truncate">{bank}</span>
                    <span className="shrink-0 flex items-center gap-2 text-xs text-slate-400">
                      {selInBank > 0 && <span className="text-brand font-medium">{selInBank} ✓</span>}
                      <span>{cards.length}</span>
                      <span className="transition-transform group-open:rotate-180">▾</span>
                    </span>
                  </summary>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-2">
                    {cards.map((c) => {
                      const checked = selectedIds.includes(c.id);
                      const applyUrl = cardApplyLink(c.bank);
                      return (
                        <div key={c.id} className={"flex items-center gap-2 text-sm border rounded-lg px-3 py-2 transition " + (checked ? "border-brand bg-brand-light" : "border-slate-200 bg-white hover:border-brand")}>
                          <button onClick={() => toggleSelect(c.id)} className="flex items-center gap-2 text-left flex-1 min-w-0">
                            <span className={"w-4 h-4 rounded flex items-center justify-center text-[10px] text-white shrink-0 " + (checked ? "bg-brand" : "bg-slate-200")}>{checked ? "✓" : ""}</span>
                            <span className="min-w-0">
                              <span className="font-medium text-slate-700">{c.product}</span>
                              <span className="block text-xs text-slate-400">{c.bank}</span>
                            </span>
                          </button>
                          {applyUrl && (
                            <a href={applyUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-brand border border-brand rounded-full px-2 py-1 hover:bg-brand hover:text-white shrink-0">
                              {t(lang, "apply")} ↗
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
        <button onClick={addSelected} disabled={selectedIds.length === 0} className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40">
          {selectedIds.length === 0 ? t(lang, "selectToAdd") : t(lang, "addNCards", { n: selectedIds.length })}
        </button>
        <p className="text-xs text-slate-400">{t(lang, "newCardsNote")}</p>
        {hasCardAffiliate() && (
          <p className="text-[11px] text-slate-400 leading-snug">{t(lang, "applyAffiliate")}</p>
        )}
      </div>
    </section>
  );

  const langBtn = (
    <button
      onClick={() => setLang(lang === "vi" ? "en" : "vi")}
      className="text-xs bg-white/15 hover:bg-white/25 rounded-full px-3 py-1.5"
      aria-label="Toggle language"
    >
      {lang === "vi" ? "EN" : "VN"}
    </button>
  );

  return (
    <div className="min-h-screen pb-20">
      <ProductTour
        run={runTour}
        steps={tourSteps}
        startIndex={tourStart}
        onFinish={() => {
          setRunTour(false);
          setTourStart(0);
          if (typeof localStorage !== "undefined") localStorage.setItem("mss_tour_done", "1");
        }}
      />
      <header className="bg-brand text-white">
        <div className="max-w-2xl mx-auto px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img src="/mascot.png" alt="Meo" className="w-10 h-10 rounded-full bg-white/20 object-cover shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold leading-none truncate">Mẹo săn sales</h1>
              <p className="text-brand-light/90 text-xs sm:text-sm mt-1 truncate">{t(lang, "tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {langBtn}
            <button
              onClick={enableReminders}
              aria-label={notifyOn ? t(lang, "remindersOn") : t(lang, "enableReminders")}
              title={notifyOn ? t(lang, "remindersOn") : t(lang, "enableReminders")}
              className="bg-white/15 hover:bg-white/25 rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              {notifyOn ? "🔔" : "🔕"}
            </button>
            <AccountBar />
          </div>
        </div>
      </header>

      <InstallPrompt lang={lang} />
      <CookieConsent lang={lang} />
      <ShoppingTripInterstitial lang={lang} />
      <ShoppingTrips lang={lang} />
      <CardOnboarding lang={lang} open={showCardPicker} onSave={cardPickerSave} onNone={cardPickerNone} onClose={cardPickerClose} />

      {tab === "price" ? (
        <main className="max-w-2xl mx-auto px-5 py-6">
          <PriceTab
            ownedStates={ownedStates}
            lang={lang}
            onPickCards={() => setShowCardPicker(true)}
            // The user decides when to move on — see the note in PriceTab.
            onContinue={() => setTab("buy")}
          />
        </main>
      ) : tab === "buy" ? (
        <main className="max-w-2xl mx-auto px-5 py-6"><BuyFlow ownedStates={ownedStates} lang={lang} onAddCards={() => setTab("wallet")} onPickCards={() => setShowCardPicker(true)} /></main>
      ) : tab === "rewards" ? (
        <main className="max-w-2xl mx-auto px-5 py-6">
          <RewardsHub bestCardLabel={bestCardLabel} lang={lang} onPickCards={() => setShowCardPicker(true)} />
        </main>
      ) : tab === "deals" ? (
        <main className="max-w-2xl mx-auto px-5 py-6">
          <DealsTab lang={lang} ownedStates={ownedStates} onPickCards={() => setShowCardPicker(true)} />
        </main>
      ) : (
      <main className="max-w-2xl mx-auto px-5 py-6 space-y-8">
        {dueSoon.length > 0 && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-4">
            <div className="font-semibold text-red-700 text-sm mb-1">
              {t(lang, "paymentsDue", { n: dueSoon.length })}
            </div>
            <ul className="text-sm text-red-700 space-y-0.5">
              {dueSoon.map((x) => {
                const card = catalogById(x.o.id);
                return (
                  <li key={x.o.id} className="flex justify-between">
                    <span>{card?.product}</span>
                    <span>{t(lang, "dueInDays", { n: x.days })}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {owned.length === 0 && welcomeHero}
        {owned.length === 0 && addCardSection}

        {owned.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">{t(lang, "thisMonth")}</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">{t(lang, "cashbackEarned")}</div>
                <div className="text-xl font-bold text-brand mt-1">{formatVND(summary.totalCashback)}</div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">{t(lang, "topCard")}</div>
                <div className="text-sm font-semibold text-slate-700 mt-1 leading-tight">
                  {summary.bestCardId ? catalogById(summary.bestCardId)?.product : "-"}
                </div>
              </div>
              <div className="rounded-xl bg-white border border-slate-100 shadow-sm p-4">
                <div className="text-xs text-slate-400">{t(lang, "capLeft")}</div>
                <div className="text-xl font-bold text-slate-700 mt-1">{formatVND(summary.capRemaining)}</div>
              </div>
            </div>
          </section>
        )}

        {owned.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">{t(lang, "logPurchase")}</h2>
            <div className="rounded-xl bg-white shadow-sm border border-slate-100 p-4 space-y-3">
              <div className="flex gap-3">
                <label className="block text-sm flex-1">
                  <span className="text-slate-600">{t(lang, "category")}</span>
                  <select value={logCat} onChange={(e) => setLogCat(e.target.value as SpendCategory)} className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2">
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.emoji} {catLabel(lang, c.key)}</option>
                    ))}
                  </select>
                </label>
                <div className="block text-sm flex-1">
                  <span className="text-slate-600">{t(lang, "amount")}</span>
                  <MoneyInput value={logAmount} onChange={setLogAmount} lang={lang} />
                </div>
              </div>
              {logAmount > 0 && (() => {
                const rec = bestCardFor(logCat, ownedStates);
                if (!rec) return null;
                return (
                  <>
                    <div className="text-sm text-slate-600 bg-brand-light rounded-lg px-3 py-2">
                      {t(lang, "use")} <strong>{rec.card.product}</strong> → {Math.round(rec.rule.rate * 100)}% = <strong>{formatVND(logAmount * rec.rule.rate)}</strong> {t(lang, "back")}
                    </div>
                    {sourcesFor(logCat).length > 0 && (
                      <div className="text-xs text-slate-500 mt-1.5">
                        {t(lang, "alsoStack")}{" "}
                        {sourcesFor(logCat).map((src, i) => (
                          <span key={src.name}>
                            {i > 0 ? ", " : ""}
                            <a href={rewardLink(src.name, src.url)} target="_blank" rel="noreferrer" className="text-amber-700 hover:underline" title={src.note}>{src.name}</a>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
              <button onClick={logPurchase} disabled={logAmount <= 0} className="w-full bg-brand text-white rounded-lg py-2.5 font-medium hover:bg-brand-dark disabled:opacity-40">{t(lang, "logPurchaseBtn")}</button>
            </div>
            {recentLog.length > 0 && (
              <div className="mt-3 space-y-2">
                {recentLog.map((p) => {
                  return (
                    <div key={p.id} className="flex items-center justify-between text-sm bg-white border border-slate-100 rounded-lg px-3 py-2">
                      <span>{formatVND(p.amountVND)} · <span className="text-slate-500">{catalogById(p.cardId)?.product}</span></span>
                      <span className="flex items-center gap-3">
                        <span className="text-brand font-medium">+{formatVND(p.cashbackVND)}</span>
                        <button onClick={() => deletePurchase(p.id)} className="text-slate-300 hover:text-red-500 text-base leading-none" aria-label="Delete">×</button>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-3">{t(lang, "myWallet")} ({owned.length})</h2>
          <div className="space-y-3">
            {owned.map((o) => {
              const card = catalogById(o.id);
              if (!card) return null;
              const due = nextDue(o.dueDay);
              const isPaid = paid[o.id] === due.toISOString();
              const days = daysUntil(due);
              const toneLabel = days <= 3 ? t(lang, "payNow") : days <= 7 ? t(lang, "dueSoon") : t(lang, "onTrack");
              const toneDot = days <= 3 ? "bg-red-500" : days <= 7 ? "bg-amber-500" : "bg-emerald-500";
              const toneText = days <= 3 ? "text-red-600" : days <= 7 ? "text-amber-600" : "text-emerald-600";
              const cap = effectiveCap(o);
              const used = usedForCard(o.id);
              const usedPct = cap ? Math.min(100, (used / cap) * 100) : 0;
              return (
                <div key={o.id} className="rounded-xl bg-white shadow-sm border border-slate-100 p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-slate-800">{card.product}</div>
                      <div className="text-sm text-slate-500">{card.bank}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{t(lang, "verified", { d: fmtVerified(card.lastVerified) })}</div>
                    </div>
                    <button onClick={() => removeCard(o.id)} className="text-slate-300 hover:text-red-500 text-lg leading-none" aria-label="Remove card">×</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {bestForTags(card, lang).map((tag) => (
                      <span key={tag} className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {isPaid ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <span className="text-sm font-medium text-emerald-600">{t(lang, "paid")}</span>
                          <span className="text-sm text-slate-400">{t(lang, "nextDueDay", { n: o.dueDay })}</span>
                        </>
                      ) : (
                        <>
                          <span className={"w-2.5 h-2.5 rounded-full " + toneDot} />
                          <span className={"text-sm font-medium " + toneText}>{toneLabel}</span>
                          <span className="text-sm text-slate-500">{t(lang, "dueInDot", { n: days })}</span>
                        </>
                      )}
                    </div>
                    {!isPaid && (
                      <button onClick={() => markPaid(o.id)} className="text-xs border border-brand text-brand rounded-full px-3 py-1 hover:bg-brand-light">{t(lang, "markAsPaid")}</button>
                    )}
                  </div>
                  {cap && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-slate-400 mb-1">
                        <span>{t(lang, "cashbackUsedPeriod")}</span>
                        <span>{formatVND(used)} / {formatVND(cap)}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand" style={{ width: usedPct + "%" }} />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <label className="flex items-center gap-1">
                      {t(lang, "statementDay")}
                      <input type="number" min={1} max={28} value={o.statementDay} onChange={(e) => updateCardDay(o.id, "statementDay", +e.target.value)} className="w-14 border border-slate-200 rounded px-2 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      {t(lang, "dueDayLbl")}
                      <input type="number" min={1} max={28} value={o.dueDay} onChange={(e) => updateCardDay(o.id, "dueDay", +e.target.value)} className="w-14 border border-slate-200 rounded px-2 py-1" />
                    </label>
                    <label className="flex items-center gap-1">
                      {t(lang, "maxCashback")}
                      <input type="number" min={0} step={50000} value={o.customCapVND ?? ""} placeholder={cap ? String(cap) : "none"} onChange={(e) => updateCardCap(o.id, +e.target.value)} className="w-24 border border-slate-200 rounded px-2 py-1" />
                    </label>
                  </div>
                </div>
              );
            })}
            {owned.length === 0 && <p className="text-slate-500 text-sm">{t(lang, "noCardsYet")}</p>}
          </div>
        </section>

        {owned.length > 0 && addCardSection}

        <footer className="text-center text-xs text-slate-400 pt-4">
          {t(lang, "footer")}
          <div className="pt-2">
            <a href="/privacy.html" className="underline hover:text-slate-600">{t(lang, "privacyLink")}</a>
            <span className="mx-2">·</span>
            <a href="/affiliate-disclosure.html" className="underline hover:text-slate-600">{t(lang, "disclosureLink")}</a>
          </div>
          <div className="pt-3 text-slate-500">
            {t(lang, "supportTitle")}{" "}
            <a href="mailto:support@meosansales.com" className="text-brand underline hover:text-brand-dark">support@meosansales.com</a>
          </div>
        </footer>
      </main>
      )}

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-100">
        <div className="max-w-2xl mx-auto flex">
          {([
            ["price", "🔗", lang === "vi" ? "Xem giá" : "Price"],
            ["buy", "🛒", lang === "vi" ? "Giỏ hàng" : "Basket"],
            ["wallet", "👛", t(lang, "tabWallet")],
            ["rewards", "🎯", t(lang, "tabRewards")],
            ["deals", "🏷️", t(lang, "tabDeals")],
          ] as const).map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={"flex-1 flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold transition " + (tab === key ? "text-brand" : "text-slate-400")}
            >
              <span className="text-lg leading-none">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
