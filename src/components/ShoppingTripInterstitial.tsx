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
} from "../redirect/adapters";

// "Shopping Trip Active" redirect, driven by the deterministic redirect machine
// (src/redirect/machine.ts). Intercepts external retailer/affiliate links and
// runs a same-tab interstitial: validate → inject SubID → show exclusions →
// 3s countdown → app deep-link (mobile, with web fallback) or web redirect.
// Trip logging still fires the `mss-trip` event for the in-app history.

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
      trippedRef.current = false;
      send({
        type: "ARM",
        merchant: cleanMerchant(a.textContent) ?? host,
        network: detectNetwork(href),
        baseUrl: href,
        platform: detectPlatform(),
        userId: null, // guest by default; wire real session here if required
      });
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [send]);

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
      window.location.assign(context.finalUrl ?? context.baseUrl);
      return;
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, context.countdown]);

  // ---- Render ----
  const hidden = state === "idle" || state === "redirected" || state === "webFallback" || state === "aborted";
  if (hidden) return null;

  const close = () => send({ type: "CANCEL" });
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
    sub = vi ? "Meo đang đưa bạn tới nơi mua sắm 🛒" : "Meo is taking you shopping 🛒";
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
