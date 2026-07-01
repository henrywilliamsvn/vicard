import { useCallback, useEffect, useRef, useState } from "react";
import type { Lang } from "../i18n";
import {
  createInitial,
  reduce,
  resolveTarget,
  DELAYS,
  type RMachine,
  type REvent,
} from "../redirect/machine";
import {
  detectPlatform,
  detectNetwork,
  buildSubId,
  composeFinalUrl,
  buildAppLink,
  type Network,
  type Platform,
} from "../redirect/adapters";

// "Shopping Trip Active" redirect, driven by the deterministic redirect machine
// (src/redirect/machine.ts). Intercepts external retailer/affiliate links.
//
// UX model (why the site "hands off"):
//   Cashback portals must be reached by a top-level navigation so they can attach
//   your tracking. So Meo can't keep the store inside itself — it sends you out.
//   To keep users from feeling lost we do two things:
//     1. First time only: a "how Meo works" explainer before the first redirect.
//     2. On desktop we open the store in a NEW TAB (Meo stays open in the old one).
//        Popup blockers only allow this from a real click, and the tracking URL
//        isn't ready until the machine computes it — so we open a blank tab on the
//        click, then point it at the final tracked URL once ready.

const INTRO_KEY = "mss_trip_intro_done";

interface PendingClick {
  merchant: string;
  network: Network;
  baseUrl: string;
  platform: Platform;
}

function cleanMerchant(text: string | null): string | null {
  if (!text) return null;
  const s = text.replace(/[↗→›»➜]/g, "").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (/^(apply|mở thẻ|mua|mua ngay|buy|open|link)$/i.test(s)) return null;
  return s.length > 32 ? s.slice(0, 32) : s;
}

export default function ShoppingTripInterstitial({ lang }: { lang: Lang }) {
  const vi = lang === "vi";
  const [m, setM] = useState<RMachine>(createInitial);
  const send = useCallback((e: REvent) => setM((prev) => reduce(prev, e)), []);
  const trippedRef = useRef(false);

  // A blank tab we pre-open on the user's click (desktop only) so we can later
  // point it at the tracked URL without the popup blocker eating it.
  const newTabRef = useRef<Window | null>(null);
  // First-time explainer: the click we're holding until the user reads it.
  const [pending, setPending] = useState<PendingClick | null>(null);

  function openHoldingTab(platform: Platform): Window | null {
    if (platform !== "desktop") return null; // mobile uses app deep-link / same tab
    try {
      return window.open("about:blank", "_blank");
    } catch {
      return null;
    }
  }

  const armFrom = useCallback(
    (p: PendingClick) => {
      trippedRef.current = false;
      send({
        type: "ARM",
        merchant: p.merchant,
        network: p.network,
        baseUrl: p.baseUrl,
        platform: p.platform,
        userId: null, // guest by default; wire real session here if required
      });
    },
    [send]
  );

  // ---- Global click interceptor: external target=_blank links arm the machine ----
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a || a.target !== "_blank") return;
      const href = a.href;
      if (!/^https?:\/\//i.test(href)) return;
      let host = "";
      try {
        host = new URL(href).host;
      } catch {
        return;
      }
      if (host === location.host) return;

      e.preventDefault();
      const platform = detectPlatform();
      const p: PendingClick = {
        merchant: cleanMerchant(a.textContent) ?? host,
        network: detectNetwork(href),
        baseUrl: href,
        platform,
      };

      // First-ever external click → show the one-time explainer instead of
      // redirecting right away. (We open the holding tab later, on the intro's
      // "take me there" button — that click is the user gesture popups need.)
      const seenIntro =
        typeof localStorage !== "undefined" && localStorage.getItem(INTRO_KEY) === "1";
      if (!seenIntro) {
        setPending(p);
        return;
      }

      // Returning user: open the holding tab now (this click is the gesture) and arm.
      newTabRef.current = openHoldingTab(platform);
      armFrom(p);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [armFrom]);

  // ---- Side-effects per state ----
  const { state, context } = m;
  useEffect(() => {
    if (state === "validatingSession") {
      const id = window.setTimeout(() => send({ type: "SESSION_OK" }), 150);
      return () => window.clearTimeout(id);
    }
    if (state === "injectingSubId") {
      const subId = buildSubId(context.userId, context.tripId);
      const finalUrl = composeFinalUrl(context.baseUrl, context.network, subId);
      send({ type: "SUBID_READY", finalUrl });
      return;
    }
    if (state === "renderingExclusions") {
      if (!trippedRef.current) {
        trippedRef.current = true;
        window.dispatchEvent(
          new CustomEvent("mss-trip", { detail: { merchant: context.merchant, host: hostOf(context.baseUrl) } })
        );
      }
      const id = window.setTimeout(() => send({ type: "DWELL_DONE" }), DELAYS.DWELL);
      return () => window.clearTimeout(id);
    }
    if (state === "countdown") {
      const id = window.setTimeout(() => send({ type: "TICK" }), DELAYS.COUNTDOWN_STEP);
      return () => window.clearTimeout(id);
    }
    if (state === "resolvingTarget") {
      setM((prev) => resolveTarget(prev));
      return;
    }
    if (state === "executingAppRedirect") {
      const app = buildAppLink(context.finalUrl ?? context.baseUrl, context.platform);
      const onHide = () => {
        if (document.visibilityState === "hidden") send({ type: "APP_FOREGROUND_LOST" });
      };
      document.addEventListener("visibilitychange", onHide);
      window.location.assign(app ?? context.finalUrl ?? context.baseUrl);
      const id = window.setTimeout(() => send({ type: "APP_TIMEOUT" }), DELAYS.APP_FALLBACK);
      return () => {
        window.clearTimeout(id);
        document.removeEventListener("visibilitychange", onHide);
      };
    }
    if (state === "executingWebRedirect") {
      const url = context.finalUrl ?? context.baseUrl;
      // If we have a pre-opened tab (desktop), send it to the store and keep Meo
      // open here. Otherwise fall back to a same-tab redirect (original behaviour).
      if (newTabRef.current && !newTabRef.current.closed) {
        try {
          newTabRef.current.location.href = url;
        } catch {
          window.open(url, "_blank");
        }
        newTabRef.current = null;
        setM(createInitial()); // hide the overlay; the user stays on Meo
      } else {
        window.location.assign(url);
      }
      return;
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, context.countdown]);

  // ---- First-time explainer overlay ----
  if (pending) {
    const merchant = pending.merchant || (vi ? "cửa hàng" : "the store");
    const dismiss = () => {
      if (newTabRef.current && !newTabRef.current.closed) newTabRef.current.close();
      newTabRef.current = null;
      setPending(null);
    };
    const go = () => {
      if (typeof localStorage !== "undefined") localStorage.setItem(INTRO_KEY, "1");
      newTabRef.current = openHoldingTab(pending.platform); // gesture → allowed
      const p = pending;
      setPending(null);
      armFrom(p);
    };
    const steps = vi
      ? [
          `Meo đưa bạn sang ${merchant} kèm mã hoàn tiền của bạn.`,
          `Bạn mua sắm như bình thường trên ${merchant}.`,
          "Quay lại Meo — tiền hoàn về ví của bạn sau ~48 giờ.",
        ]
      : [
          `Meo sends you to ${merchant} with your cashback code attached.`,
          `You shop as normal on ${merchant}.`,
          "Come back to Meo — cashback lands in your wallet in ~48h.",
        ];
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 text-center">
          <img src="/mascot.png" alt="Meo" className="w-16 h-16 rounded-full bg-brand-light object-cover mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800 mb-1">
            {vi ? "Meo hoạt động thế nào? 🐱" : "How Meo works 🐱"}
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            {vi ? "Chỉ 3 bước để không bao giờ mua hớ:" : "Just 3 steps to never overpay:"}
          </p>
          <ol className="text-left space-y-3 mb-4">
            {steps.map((s, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 shrink-0 rounded-full bg-brand text-white text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-sm text-slate-700">{s}</span>
              </li>
            ))}
          </ol>
          <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mb-4">
            {vi
              ? `${merchant} sẽ mở ở tab mới — Meo vẫn ở đây chờ bạn quay lại.`
              : `${merchant} opens in a new tab — Meo stays right here for when you're back.`}
          </p>
          <button
            onClick={go}
            className="w-full bg-brand text-white font-bold rounded-full py-3 mb-2"
          >
            {vi ? `Tôi hiểu, tới ${merchant} →` : `Got it, take me to ${merchant} →`}
          </button>
          <button onClick={dismiss} className="text-slate-400 text-sm py-1">
            {vi ? "Để sau" : "Maybe later"}
          </button>
        </div>
      </div>
    );
  }

  // ---- Machine-driven render ----
  const hidden = state === "idle" || state === "redirected" || state === "webFallback" || state === "aborted";
  if (hidden) return null;

  const close = () => {
    if (newTabRef.current && !newTabRef.current.closed) newTabRef.current.close();
    newTabRef.current = null;
    send({ type: "CANCEL" });
  };
  const merchant = context.merchant || (vi ? "cửa hàng" : "the store");

  let title = "";
  let sub: string | null = null;
  if (state === "validatingSession" || state === "injectingSubId") {
    title = vi ? `Đang kết nối tới ${merchant}…` : `Connecting to ${merchant}…`;
    sub = vi ? "Meo đang gắn mã hoàn tiền cho bạn 🐱" : "Meo is attaching your cashback tracking 🐱";
  } else if (state === "renderingExclusions") {
    title = vi ? `Mở ${merchant} để nhận hoàn tiền` : `Opening ${merchant} for cashback`;
    sub = vi
      ? "Mở trong cùng phiên · không dùng mã ngoài · hoàn về ví ~48h"
      : "Same session · no outside codes · cashback in ~48h";
  } else if (state === "countdown") {
    title = vi ? `Tự động chuyển sau ${context.countdown} giây` : `Redirecting in ${context.countdown}s`;
    sub = vi ? "Meo vẫn mở ở đây — quay lại sau khi mua xong nhé 🛒" : "Meo stays open here — come back after you shop 🛒";
  } else if (state === "executingAppRedirect") {
    title = vi ? `Đang mở ứng dụng ${merchant}…` : `Opening the ${merchant} app…`;
  } else if (state === "sessionBlocked") {
    title = vi ? "Đăng nhập để Meo giữ tiền hoàn cho bạn nhé!" : "Sign in so Meo can hold your cashback!";
  } else if (state === "error") {
    title = vi ? "Ơ, có chút trục trặc khi tạo liên kết." : "Oops — something went wrong building the link.";
  }

  const pct = state === "countdown" ? Math.round(((3 - context.countdown) / 3) * 100) : 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center text-white px-6 text-center"
      style={{ background: "linear-gradient(160deg,#FF7A1A,#E2640A)" }}
      role="status"
      aria-live="polite"
    >
      <img src="/mascot.png" alt="Meo" className="w-24 h-24 rounded-full bg-white/20 object-cover mb-5" />
      <h1 className="text-2xl font-extrabold mb-2 max-w-sm">🛒 {title}</h1>
      {sub && <p className="text-sm opacity-95 mb-5 max-w-sm">{sub}</p>}

      {state === "countdown" && (
        <div className="w-64 max-w-full h-1.5 bg-white/30 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-white rounded-full transition-all duration-1000 ease-linear" style={{ width: pct + "%" }} />
        </div>
      )}

      {state === "countdown" && (
        <div className="flex flex-col gap-2 w-64 max-w-full">
          <button onClick={() => send({ type: "SKIP" })} className="bg-white text-[#E2640A] font-bold rounded-full py-3">
            {vi ? "Tiếp tục ngay →" : "Continue now →"}
          </button>
          <button onClick={close} className="text-white/90 text-sm py-1">{vi ? "Huỷ" : "Cancel"}</button>
        </div>
      )}

      {state === "executingAppRedirect" && (
        <button onClick={() => send({ type: "SKIP" })} className="mt-3 bg-white/20 hover:bg-white/30 rounded-full px-4 py-2 text-sm">
          {vi ? "Chưa tự mở? Mở bằng trình duyệt →" : "Not opening? Use the browser →"}
        </button>
      )}

      {(state === "sessionBlocked" || state === "error") && (
        <div className="flex flex-col gap-2 w-64 max-w-full">
          <button onClick={() => send({ type: "RETRY" })} className="bg-white text-[#E2640A] font-bold rounded-full py-3">
            {state === "sessionBlocked" ? (vi ? "Thử lại" : "Retry") : vi ? "Thử lại" : "Retry"}
          </button>
          <button onClick={close} className="text-white/90 text-sm py-1">{vi ? "Huỷ" : "Cancel"}</button>
        </div>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}
