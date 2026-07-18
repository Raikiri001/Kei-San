import { motion, useReducedMotion } from "motion/react";

/**
 * Boot-time overlay shown while the curated font set downloads — the
 * "kei-san" wordmark fills left-to-right with real progress (see
 * ensureFontsLoaded's per-font onProgress callback), not a faked animation.
 * Rendered on top of the rest of the app, which mounts immediately underneath
 * since nothing on screen at boot depends on the new fonts being ready yet.
 */
export function LoadingScreen({ progress }: { progress: number }) {
  const prefersReducedMotion = useReducedMotion();
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: "rgb(var(--chrome-bg))" }}
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.4, ease: "easeOut" }}
    >
      <div className="relative">
        <span
          className="block text-[15vw] font-semibold leading-none tracking-wide opacity-20 sm:text-6xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          kei-san
        </span>
        <span
          className="absolute inset-0 block text-[15vw] font-semibold leading-none tracking-wide sm:text-6xl"
          style={{
            fontFamily: "var(--font-display)",
            color: "rgb(var(--color-accent-glow))",
            clipPath: `inset(0 ${(1 - clamped) * 100}% 0 0)`,
          }}
        >
          kei-san
        </span>
      </div>
    </motion.div>
  );
}
