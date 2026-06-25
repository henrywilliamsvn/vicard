import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TourMascot, type MascotMood } from "./TourMascot";

const TOOLTIP_WIDTH = 348;

type Placement = "top" | "bottom";

type Props = {
  title: string;
  body: string;
  mood: MascotMood;
  index: number;
  total: number;
  /** Bounding box of the highlighted element, or null to center on screen. */
  targetRect: DOMRect | null;
  muted: boolean;
  speaking: boolean;
  mascotSrc?: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onToggleMute: () => void;
};

/**
 * Fully custom tour tooltip. Positions itself relative to the highlighted
 * element (flips above when there's no room below) and clamps to the viewport.
 */
export function TourTooltip({
  title,
  body,
  mood,
  index,
  total,
  targetRect,
  muted,
  speaking,
  mascotSrc,
  onNext,
  onPrev,
  onSkip,
  onToggleMute,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; placement: Placement }>({
    top: -9999,
    left: -9999,
    placement: "bottom",
  });

  // Recompute placement whenever the target moves or the step content changes.
  useLayoutEffect(() => {
    const MARGIN = 16;
    const GAP = 22; // leaves room for the mascot peeking above the card
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const height = ref.current?.offsetHeight ?? 240;

    if (!targetRect) {
      setPos({ top: vh / 2 - height / 2, left: vw / 2 - TOOLTIP_WIDTH / 2, placement: "bottom" });
      return;
    }

    let placement: Placement = "bottom";
    let top = targetRect.bottom + GAP;
    const fitsBelow = top + height <= vh - MARGIN;
    const fitsAbove = targetRect.top - GAP - height >= MARGIN;
    if (!fitsBelow && fitsAbove) {
      placement = "top";
      top = targetRect.top - GAP - height;
    }

    let left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2;
    left = Math.max(MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - MARGIN));
    top = Math.max(MARGIN, Math.min(top, vh - height - MARGIN));

    setPos({ top, left, placement });
  }, [targetRect, index, body]);

  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <motion.div
      ref={ref}
      className="mss-tooltip"
      data-placement={pos.placement}
      style={{ top: pos.top, left: pos.left, width: TOOLTIP_WIDTH }}
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      role="dialog"
      aria-live="polite"
      aria-label={title}
    >
      <div className="mss-mascot-wrap">
        <TourMascot mood={mood} src={mascotSrc} speaking={speaking} />
      </div>

      <button
        type="button"
        className="mss-mute"
        onClick={onToggleMute}
        aria-pressed={muted}
        aria-label={muted ? "Bật tiếng hướng dẫn" : "Tắt tiếng hướng dẫn"}
      >
        {muted ? "🔇 Bật tiếng" : "🔊 Tắt tiếng"}
      </button>

      <motion.div
        key={index}
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
      >
        <h3 className="mss-title">{title}</h3>
        <p className="mss-body">{body}</p>
      </motion.div>

      <div className="mss-dots" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={i === index ? "on" : ""} />
        ))}
      </div>

      <div className="mss-actions">
        <button type="button" className="mss-skip" onClick={onSkip}>
          Bỏ qua
        </button>
        <div className="mss-nav">
          {!isFirst && (
            <button type="button" className="mss-prev" onClick={onPrev}>
              Quay lại
            </button>
          )}
          <button type="button" className="mss-next" onClick={onNext}>
            {isLast ? "Hoàn tất 🎉" : "Tiếp tục"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
