import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  /** Per-step mascot expression image. Falls back to /mascot.png if missing. */
  image?: string;
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
    image: "/assets/mascot-greeting.png",
  },
  {
    target: "#cashback-comparison-section",
    title: "💳 Optimize Your Credit Cards",
    body: "Hệ thống sẽ gợi ý thẻ có phần trăm hoàn tiền cao nhất. Hãy vào tab 'Ví Thẻ' để chọn những thẻ bạn đang sở hữu nhé!",
    mood: "point",
    image: "/assets/mascot-thinking.png",
  },
  {
    target: "#bonus-channels-guide",
    title: "🚀 Double or Triple Your Rewards",
    body: "Đừng quên chọn thêm các kênh tích điểm đối tác (như ShopBack, ví điện tử) để chồng thêm nhiều tầng giảm giá cùng lúc.",
    mood: "cheer",
    image: "/assets/mascot-excited.png",
  },
  {
    target: "#price-alert-trigger",
    title: "🔔 Set Your Target Price",
    body: "Chưa muốn mua ngay? Đặt mức giá bạn mong muốn tại đây. MeoSanSales sẽ thông báo ngay khi giá chạm sàn để bạn vào chốt đơn!",
    mood: "nod",
    image: "/assets/mascot-winking.png",
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

const SPOTLIGHT_PAD = 8;

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

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function ProductTour({
  run,
  steps = DEFAULT_TOUR_STEPS,
  onFinish,
  mascotSrc,
}: Props) {
  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  // Voice is OPT-IN (muted by default). Autoplaying audio was implicated in
  // renderer freezes on some Windows/Chrome machines (2026-07-02), and
  // auto-playing a voice at first-time visitors is pushy anyway. The user can
  // tap the speaker button — that tap is also the user gesture browsers
  // require for audio playback.
  const [muted, setMuted] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /* ---- Voice: pre-generated ElevenLabs "Adam" clips ONLY. ----
   * Clips live at /tour-audio/step-<i>.mp3 — generate them with
   * scripts/generate-tour-audio.mjs and ship them with the deploy.
   * If a clip is missing the step is simply silent (visual tour still works).
   *
   * IMPORTANT: never fall back to window.speechSynthesis here. The Web Speech
   * API has a long-standing Chromium-on-Windows bug where speak()/cancel()
   * cycles can hang the renderer process (hard tab freeze, no console error).
   * We hit exactly that in production on 2026-07-02: the deployed build was
   * missing /tour-audio/*.mp3, every visitor's first click fell back to TTS,
   * and the page froze. Silence beats a dead app.
   */
  const TOUR_AUDIO_BASE = "/tour-audio";

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  }

  function speak(_text: string, force: boolean, stepIndex?: number) {
    if (mutedRef.current && !force) return;
    stopAudio();
    if (stepIndex == null) return;
    const a = new Audio(`${TOUR_AUDIO_BASE}/step-${stepIndex}.mp3`);
    audioRef.current = a;
    a.onplay = () => setSpeaking(true);
    a.onended = () => setSpeaking(false);
    const silent = () => {
      if (audioRef.current === a) audioRef.current = null;
      setSpeaking(false);
    };
    a.onerror = silent;
    a.play().catch(silent);
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
      // eslint-disable-next-line no-console
      console.warn(`[ProductTour] target not found: ${step.target}`);
      setRect(null);
      return;
    }

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Measure after the smooth-scroll settles.
    window.setTimeout(() => setRect(el.getBoundingClientRect()), 360);
  }

  function startTour() {
    setActive(true);
    // No autoplay "prime" listener: voice stays off until the user taps the
    // speaker button (see the muted-by-default note above).
    void showStep(0);
  }

  function finish() {
    stopAudio();
    setSpeaking(false);
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
    if (step) speak(step.body, false, index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  /* ---- Keep the spotlight + tooltip glued to the target on scroll / resize ---- */
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
      stopAudio();
    };
  }, []);

  function toggleMute() {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (next) {
        stopAudio();
        setSpeaking(false);
      } else {
        const step = steps[index];
        if (step) speak(step.body, true, index); // re-read the current step on unmute
      }
      return next;
    });
  }

  const step = steps[index];
  if (!active || !step) return null;

  // Spotlight overlay: a transparent rect over the target with a huge box-shadow
  // that dims everything else. pointer-events:none — it NEVER blocks clicks.
  const overlay = rect ? (
    <div
      className="mss-overlay"
      // Positioned via transform (not top/left) so moving the spotlight never
      // registers as a layout shift — this element alone was scoring CLS 0.35.
      style={{
        transform: `translate(${rect.left - SPOTLIGHT_PAD}px, ${rect.top - SPOTLIGHT_PAD}px)`,
        width: rect.width + SPOTLIGHT_PAD * 2,
        height: rect.height + SPOTLIGHT_PAD * 2,
      }}
    />
  ) : (
    <div className="mss-overlay mss-overlay-full" />
  );

  return createPortal(
    <>
      {overlay}
      <TourTooltip
        title={step.title}
        body={step.body}
        mood={step.mood}
        index={index}
        total={steps.length}
        targetRect={rect}
        muted={muted}
        speaking={speaking}
        mascotSrc={step.image ?? mascotSrc}
        onNext={() => (index >= steps.length - 1 ? finish() : void showStep(index + 1))}
        onPrev={() => index > 0 && void showStep(index - 1)}
        onSkip={finish}
        onToggleMute={toggleMute}
        onGoto={(i) => void showStep(i)}
      />
    </>,
    document.body
  );
}
