/**
 * Lets the page's glow drift while the reader rests (see the --amp and --t notes in
 * moods.css). Two things have to stay in step, because the sticky act label paints the same
 * glow as the page behind it: they all share one clock, so their blobs are always in the
 * same place. Nothing runs with prefers-reduced-motion, while the tab is hidden, or while the
 * reader is moving the mouse, scrolling or typing.
 */
const IDLE_MS = 4000; // rest before the drift begins
const CLOCK_SECONDS = 3600; // the master clock runs for an hour before it starts again
const SETTLE_MS = 2500; // after the blobs are back in place, stop animating

const ACTIVITY = ["pointermove", "pointerdown", "wheel", "keydown", "touchstart", "scroll"];

export function startMoodDrift(): () => void {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motion.matches) {
    return () => undefined;
  }
  const root = document.documentElement;
  const targets: Array<{ element: Element; pseudoElement?: string }> = [
    { element: document.body, pseudoElement: "::before" },
    ...Array.from(document.querySelectorAll(".story__act-title")).map((element) => ({ element })),
  ];
  const animations = targets.map(({ element, pseudoElement }) =>
    element.animate([{ "--t": 0 }, { "--t": CLOCK_SECONDS }], {
      duration: CLOCK_SECONDS * 1000,
      iterations: Infinity,
      easing: "linear",
      ...(pseudoElement ? { pseudoElement } : {}),
    }),
  );
  // Every animation starts at the timeline's origin, so they all show the same moment.
  const sync = () => animations.forEach((animation) => (animation.startTime = 0));
  let idleTimer = 0;
  let settleTimer = 0;
  sync();
  animations.forEach((animation) => animation.pause());

  const drift = () => {
    if (document.hidden || motion.matches) {
      return;
    }
    window.clearTimeout(settleTimer);
    sync();
    animations.forEach((animation) => animation.play());
    root.setAttribute("data-drift", "");
  };
  const rest = () => {
    window.clearTimeout(idleTimer);
    if (root.hasAttribute("data-drift")) {
      root.removeAttribute("data-drift");
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => animations.forEach((animation) => animation.pause()), SETTLE_MS);
    }
    idleTimer = window.setTimeout(drift, IDLE_MS);
  };

  for (const type of ACTIVITY) {
    window.addEventListener(type, rest, { passive: true });
  }
  document.addEventListener("visibilitychange", rest);
  idleTimer = window.setTimeout(drift, IDLE_MS);

  return () => {
    window.clearTimeout(idleTimer);
    window.clearTimeout(settleTimer);
    for (const type of ACTIVITY) {
      window.removeEventListener(type, rest);
    }
    document.removeEventListener("visibilitychange", rest);
    root.removeAttribute("data-drift");
    animations.forEach((animation) => animation.cancel());
  };
}
