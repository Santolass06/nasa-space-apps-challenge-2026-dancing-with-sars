/**
 * Keeps the page's glow drifting (see the --amp and --t notes in moods.css). The drift never
 * stops: while the reader scrolls, moves the mouse or types it runs at a third of its
 * amplitude (data-drift="low"); after a few quiet seconds it opens up to the full amplitude
 * (data-drift="full"). Two things have to stay in step, because the sticky act label paints
 * the same glow as the page behind it: they all share one clock, so their blobs are always in
 * the same place. Nothing runs with prefers-reduced-motion, and everything pauses while the
 * tab is hidden.
 */
const IDLE_MS = 4000; // rest before the drift opens up to the full amplitude
const CLOCK_SECONDS = 3600; // the master clock runs for an hour before it starts again

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
  // (Setting startTime also resumes a paused animation, so this is the one place that plays.)
  const play = () => animations.forEach((animation) => (animation.startTime = 0));
  let idleTimer = 0;

  const calm = () => {
    window.clearTimeout(idleTimer);
    if (document.hidden) {
      return;
    }
    root.setAttribute("data-drift", "low");
    idleTimer = window.setTimeout(() => root.setAttribute("data-drift", "full"), IDLE_MS);
  };
  const visibility = () => {
    if (document.hidden) {
      window.clearTimeout(idleTimer);
      animations.forEach((animation) => animation.pause());
    } else {
      play();
      calm();
    }
  };

  for (const type of ACTIVITY) {
    window.addEventListener(type, calm, { passive: true });
  }
  document.addEventListener("visibilitychange", visibility);
  play();
  calm();

  return () => {
    window.clearTimeout(idleTimer);
    for (const type of ACTIVITY) {
      window.removeEventListener(type, calm);
    }
    document.removeEventListener("visibilitychange", visibility);
    root.removeAttribute("data-drift");
    animations.forEach((animation) => animation.cancel());
  };
}
