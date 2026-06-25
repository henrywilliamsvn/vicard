import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import "./product-tour.css";
import { TourTooltip } from "./TourTooltip";
import type { MascotMood } from "./TourMascot";

/* -------------------------------------------------------------------------- */
/*  Types & step configuration                                                */
/* -------------------------------------------------------------------------- */

export type TourStep = {
  /** CSS selector for the element to spotlight, e.g. "#search-input". */
  target: string;
  title: string;
  /** Vietnamese tooltip text — this is also what the mascot speaks aloud. */
  body: string;
  mood: MascotMood;
  /**
   * Optional hook run *before* the step shows — use it to switch tabs so the
   * target element exists (e.g. open the "Ví Thẻ" tab for step 2).
   */
  beforeStep?: () => void | Promise<void>;
};

export const DEFAULT_TOUR_STEPS: TourStep[] = [
  {
    target: "#search-input",
    title: "🔎 Start Your Smart Hunting",
    body: "Nhập tên sản phẩm hoặc dán link từ Shopee, Lazada, Tiki vào đây để bắt đầu quét ưu đãi nhé!",
    mood: "wave",
  },
  {
    target: "#cashback-comparison-section",
    title: "💳 Optimize Your Credit Cards",
    body: "Hệ thống sẽ gợi ý thẻ có phần trăm hoàn tiền cao nhất. Hãy vào tab 'Ví Thẻ' để chọn những thẻ bạn đang sở hữu nhé!",
    mood: "point",
  },
  {
    target: "#bonus-channels-guide",
    title: "🚀 Double or Triple Your Rewards",
    body: "Đừng quên chọn thêm các kênh tích điểm đối tác (như ShopBack, ví điện tử) để chồng thêm nhiều tầng giảm giá cùng lúc.",
    mood: "cheer",
  },
  {
    target: "#price-alert-trigger",
    title: "🔔 Set Your Target Price",
    body: "Chưa muốn mua ngay? Đặt mức giá bạn mong muốn tại đây. MeoSanSales sẽ thông báo ngay khi giá chạm sàn để bạn vào chốt đơn!",
    mood: "nod",
  },
];

type Props = {
  /** Flip to true to start the tour (e.g. on a first-time visit). */
  run: boolean;
  steps?: TourStep[];
  /** Called when the tour finishes or is skipped. */
  onFinish?: () => void;
  /** BCP-47 voice language. Defaults to Vietnamese. */
  voiceLang?: string;
  /** Override the mascot image (defaults to /mascot.png). */
  mascotSrc?: string;
};

type DriverInstance = ReturnType<typeof driver>;

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** Resolve a selector now, or poll briefly for elements rendered after a tab switch. */
function waitForElement(selector: string, timeout = 4000): Promise<Element | null> {
  return new Promise((resolve) => {
    const immediate = document.querySelector(selector);
    if (immediate) return resolve(immediate);
    const start = Date.now();
    const id = window.setInterval(() => {
      const el = document.querySelector(selector);
      if (el || Date.now() - start > timeout) {
        window.clearInterval(id);
        resolve(el);
      }
    }, 100);
  });
}

/** Prefer a Vietnamese system voice, then the requested lang, then anything. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith("vi")) ??
    voices.find((v) => v.lang === lang) ??
    null
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ProductTour({
  run,
  steps = DEFAULT_TOUR_STEPS,
  onFinish,
  voiceLang = "vi-VN",
  mascotSrc,
}: Props) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const driverRef = useRef<DriverInstance | null>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /* ---- Load TTS voices (async on most browsers) ---- */
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const load = () => {
      voicesRef.current = synth.getVoices();
    };
    load();
    synth.addEventListener?.("voiceschanged", load);
    return () => synth.removeEventListener?.("voiceschanged", load);
  }, []);

  /* ---- Speech ---- */
  function speak(text: string, force: boolean) {
    const synth = window.speechSynthesis;
    if (!synth) return;
    if (mutedRef.current && !force) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = voiceLang;
    utter.rate = 1;
    utter.pitch = 1.06;
    const voice = pickVoice(voicesRef.current, voiceLang);
    if (voice) utter.voice = voice;
    utter.onstart = () => setSpeaking(true);
    utter.onend = () => setSpeaking(false);
    utter.onerror = () => setSpeaking(false);
    synth.speak(utter);
  }

  /* ---- Step navigation ---- */
  async function showStep(i: number) {
    const step = steps[i];
    if (!step) {
      finish();
      return;
    }
    await step.beforeStep?.();
    const el = await waitForElement(step.target, 4000);
    setIndex(i);

    if (!el) {
      // Target missing (e.g. not on this tab) — show a centered tooltip anyway.
      // eslint-disable-next-line no-console
      console.warn(`[ProductTour] target not found: ${step.target}`);
      setRect(null);
      return;
    }

    driverRef.current?.highlight({ element: el as HTMLElement });
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Measure after the smooth-scroll / spotlight animation settles.
    window.setTimeout(() => setRect(el.getBoundingClientRect()), 360);
  }

  function startTour() {
    driverRef.current?.destroy();
    driverRef.current = driver({
      animate: true,
      overlayColor: "#0f172a",
      overlayOpacity: 0.62,
      stagePadding: 8,
      stageRadius: 14,
      allowClose: false,
      allowKeyboardControl: false,
      disableActiveInteraction: true,
    });
    setActive(true);
    setMuted(false);
    mutedRef.current = false;
    void showStep(0);
  }

  function finish() {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    driverRef.current?.destroy();
    driverRef.current = null;
    setActive(false);
    onFinish?.();
  }

  /* ---- React to the `run` prop ---- */
  useEffect(() => {
    if (run && !active) startTour();
    if (!run && active) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  /* ---- Speak whenever the active step changes ---- */
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (step) speak(step.body, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  /* ---- Keep the tooltip glued to the target on scroll / resize ---- */
  useEffect(() => {
    if (!active) return;
    const step = steps[index];
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  /* ---- Cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      driverRef.current?.destroy();
    };
  }, []);

  function toggleMute() {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (next) {
        window.speechSynthesis?.cancel();
        setSpeaking(false);
      } else {
        const step = steps[index];
        if (step) speak(step.body, true); // re-read the current step on unmute
      }
      return next;
    });
  }

  const step = steps[index];
  if (!active || !step) return null;

  return createPortal(
    <TourTooltip
      title={step.title}
      body={step.body}
      mood={step.mood}
      index={index}
      total={steps.length}
      targetRect={rect}
      muted={muted}
      speaking={speaking}
      mascotSrc={mascotSrc}
      onNext={() => (index >= steps.length - 1 ? finish() : void showStep(index + 1))}
      onPrev={() => index > 0 && void showStep(index - 1)}
      onSkip={finish}
      onToggleMute={toggleMute}
    />,
    document.body
  );
}
