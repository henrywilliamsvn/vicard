import { useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";

const FALLBACK_SRC = "/mascot.png";

/** The four "moods" the instructor mascot can act out, one per tour step. */
export type MascotMood = "wave" | "point" | "cheer" | "nod";

/**
 * Looping body-language animations. Each is an `animate` target with its own
 * repeating transition, so the mascot keeps "performing" while a step is open.
 */
const MOOD_ANIMATION: Record<MascotMood, Variants> = {
  // Step 1 — a friendly hello
  wave: {
    play: {
      rotate: [0, 16, -6, 16, 0],
      transition: { duration: 1.5, repeat: Infinity, repeatDelay: 0.5, ease: "easeInOut" },
    },
  },
  // Step 2 — nudging toward the highlighted section
  point: {
    play: {
      x: [0, 12, 0],
      rotate: [0, -4, 0],
      transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
    },
  },
  // Step 3 — excited "stack your rewards!" bounce
  cheer: {
    play: {
      y: [0, -14, 0],
      scale: [1, 1.07, 1],
      transition: { duration: 0.65, repeat: Infinity, ease: "easeInOut" },
    },
  },
  // Step 4 — calm, reassuring nod
  nod: {
    play: {
      rotate: [0, 7, -2, 0],
      y: [0, 3, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: "easeInOut" },
    },
  },
};

/** Origin point so each motion reads naturally (wave pivots from the feet). */
const MOOD_ORIGIN: Record<MascotMood, string> = {
  wave: "bottom center",
  point: "center center",
  cheer: "bottom center",
  nod: "bottom center",
};

type Props = {
  mood: MascotMood;
  /** Mascot artwork. Drop your Meo image at /public/mascot.png. */
  src?: string;
  /** When true (TTS is talking), show a soft pulsing "speaking" ring. */
  speaking?: boolean;
};

export function TourMascot({ mood, src = "/mascot.png", speaking = false }: Props) {
  // Try the per-step expression image; fall back to the base mascot if it 404s
  // (so the tour works before the expression images are generated/uploaded).
  const [imgSrc, setImgSrc] = useState(src);
  useEffect(() => {
    setImgSrc(src);
  }, [src]);

  return (
    <motion.div
      className="mss-mascot"
      // Pop-in entrance whenever the mascot (re)mounts on a step.
      initial={{ scale: 0, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 18 }}
    >
      {speaking && (
        <motion.span
          className="mss-mascot-ring"
          animate={{ scale: [1, 1.18, 1], opacity: [0.55, 0, 0.55] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
          aria-hidden
        />
      )}
      <motion.img
        src={imgSrc}
        onError={() => {
          if (imgSrc !== FALLBACK_SRC) setImgSrc(FALLBACK_SRC);
        }}
        alt="Meo — trợ lý mua sắm MeoSanSales"
        className="mss-mascot-img"
        style={{ transformOrigin: MOOD_ORIGIN[mood] }}
        variants={MOOD_ANIMATION[mood]}
        animate="play"
        draggable={false}
      />
    </motion.div>
  );
}
