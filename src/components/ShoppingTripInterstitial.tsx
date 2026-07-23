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

// "Shopping Trip Active" redirect — intercepts external retailer/affiliate links,
// shows a one-time "how Meo works" explainer, and (on desktop) opens the store in
// a new tab so Meo stays open.

const INTRO_KEY = "mss_trip_intro_done";

interface PendingClick {
  merchant: string;
  network: Network;
  baseUrl: string;
  platform: Platform;
}

// Known brands, matched against the destination URL. Deal cards concatenate the
// brand with rate badges ("ShopBackTới 30%…"), so the URL is the reliable source.
const BRAND_BY_URL: [RegExp, string][] = [
  [/shopback/i, "ShopBack"],
  [/shopee/i, "Shopee"],
  [/lazada|lazwallet/i, "Lazada"],
  [/tiktok/i, "TikTok Shop"],
  [/tiki/i, "Tiki"],
  [/aliexpress/i, "AliExpress"],
  [/taobao/i, "Taobao"],
  [/alibaba/i, "Alibaba"],
  [/banggood/i, "Banggood"],
  [/klook/i, "Klook"],
  [/traveloka/i, "Traveloka"],
  [/kkday/i, "KKday"],
  [/momo/i, "MoMo"],
  [/zalopay/i, "ZaloPay"],
];

function brandFromUrl(href: string): string | null {
  for (const [re, name] of BRAND_BY_URL) if (re.test(href)) return name;
  return null;
}

function cleanMerchant(text: string | null): string | null {
  if (!text) return null;
  let s = text.replace(/[↗→›»➜]/g, "").replace(/\s+/g, " ").trim();
  s = s.split(/\s*(?:Tới|Up to|Hoàn tiền|Cashback|\d+\s*%)/i)[0].trim();
  if (!s) return null;
  if (/^(apply|mở thẻ|mua|mua ngay|buy|open|link)$/i.test(s)) return null;
  return s.length > 32 ? s.slice(0, 32) : s;
}

export default function ShoppingTripInterstitial({ lang }: { lang: Lang }) {
  const vi = lang === "vi";
  const [m, setM] = useState<RMachine>(createInitial);
  const send = useCallback((e: REvent) => setM((prev) => reduce(prev, e)), []);
  const trippedRef = useRef(false);
  const newTabRef = useRef<Window | null>(null);
  const [pending, setPending] = useState<PendingClick | null>(null);

  function openHoldingTab(platform: Platform, merchant: string): Window | null {
    if (platform !== "desktop") return null;
    let w: Window | null = null;
    try {
      w = window.open("about:blank", "_blank");
    } catch {
      return null;
    }
    if (w) {
      const name = merchant || (vi ? "cửa hàng" : "the store");
      const title = vi ? `Đang mở ${name}…` : `Opening ${name}…`;
      const note = vi
        ? "Meo đang gắn mã hoàn tiền cho bạn 🐱"
        : "Meo is attaching your cashback tracking 🐱";
      const backNote = vi
        ? "Mua xong nhớ quay lại Meo để chọn ưu đãi tiếp theo nhé! 🐱"
        : "Done shopping? Come back to Meo to pick your next deal! 🐱";
      try {
        w.document.write(
          `<!doctype html><html lang="${lang}"><head><meta charset="utf-8">` +
            `<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>` +
            `<body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;` +
            `font-family:system-ui,-apple-system,sans-serif;background:linear-gradient(160deg,#FF7A1A,#E2640A);color:#fff;text-align:center;padding:24px">` +
            `<img src="${location.origin}/mascot.png" alt="Meo" style="width:88px;height:88px;border-radius:50%;background:rgba(255,255,255,.2);object-fit:cover;margin-bottom:16px">` +
            `<h1 style="font-size:20px;margin:0 0 8px">🛒 ${title}</h1>` +
            `<p style="opacity:.95;margin:0 0 16px;max-width:320px;font-size:14px">${note}</p>` +
            `<p style="opacity:.9;margin:0;max-width:320px;font-size:13px;background:rgba(255,255,255,.15);padding:10px 14px;border-radius:12px">${backNote}</p></body></html>`
        );
        w.document.close();
      } catch {
        /* noop */
      }
    }
    return w;
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
        userId: null,
      });
    },
    [send]
  );

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
        merchant: brandFromUrl(href) ?? cleanMerchant(a.textContent) ?? host,
        network: detectNetwork(href),
        baseUrl: href,
        platform,
      };

      const seenIntro =
        typeof localStorage !== "undefined" && localStorage.getItem(INTRO_KEY) === "1";
      if (!seenIntro) {
        setPending(p);
        return;
      }

      newTabRef.current = openHoldingTab(platform, p.merchant);
      armFrom(p);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [armFrom]);

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
      if (newTabRef.current && !newTabRef.current.closed) {
        try {
          newTabRef.current.location.href = url;
        } catch {
          window.open(url, "_blank");
        }
        newTabRef.current = null;
        setM(createInitial());
      } else {
        window.location.assign(url);
      }
      return;
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, context.countdown]);

  if (pending) {
    const merchant = pending.merchant || (vi ? "cửa hàng" : "the store");
    const dismiss = () => {
      if (newTabRef.current && !newTabRef.current.closed) newTabRef.current.close();
      newTabRef.current = null;
      setPending(null);
    };
    const go = () => {
      if (typeof localStorage !== "undefined") localStorage.setItem(INTRO_KEY, "1");
      newTabRef.current = openHoldingTab(pending.platform, pending.merchant);
      const p = pending;
      setPending(null);
      armFrom(p);
    };
    const steps = vi
      ? [
          `Meo đưa bạn sang ${merchant} kèm mã hoàn tiền của bạn.`,
          `Bạn mua sắm như bình thường trên ${merchant}.`,
          "Quay lại Meo mỗi ngày để săn thêm deal — ví hoàn tiền của Meo sắp ra mắt! 🐱",
        ]
      : [
          `Meo sends you to ${merchant} with your cashback code attached.`,
          `You shop as normal on ${merchant}.`,
          "Come back to Meo daily for more deals — the Meo cashback wallet is coming soon! 🐱",
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
      ? "Mở trong cùng phiên · không dùng mã ngoài · hoàn tiền theo cổng"
      : "Same session · no outside codes · cashback via the portal";
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
