/**
 * Keeps the page's glow drifting (see the --amp and --t notes in moods.css). The drift never
 * stops: while the reader scrolls, moves the mouse or types it runs at a third of its
 * amplitude (data-drift="low"); after a few quiet seconds it opens up to the full amplitude
 * (data-drift="full"). Two things have to stay in step, because the sticky act label paints
 * the same glow as the page behind it: they all share one clock, so their blobs are always in
 * the same place. Nothing runs with prefers-reduced-motion, and everything pauses while the
 * tab is hidden. An act label only animates while its act is on screen and the label is shown
 * (a portrait phone hides them): the six labels cost about two thirds of the style work.
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
  const clock = (element: Element, pseudoElement?: string) =>
    element.animate([{ "--t": 0 }, { "--t": CLOCK_SECONDS }], {
      duration: CLOCK_SECONDS * 1000,
      iterations: Infinity,
      easing: "linear",
      ...(pseudoElement ? { pseudoElement } : {}),
    });
  const page = clock(document.body, "::before");
  const labels = Array.from(document.querySelectorAll<HTMLElement>(".story__act-title")).map((element) => ({
    element,
    animation: clock(element),
    onScreen: false,
  }));
  const animations = [page, ...labels.map((label) => label.animation)];
  // Every animation starts at the timeline's origin, so they all show the same moment.
  // (Setting startTime also resumes a paused animation, so this is the one place that plays.)
  const start = (animation: Animation) => {
    animation.startTime = 0;
  };
  // Plays what should be moving now and pauses the rest.
  const update = () => {
    if (document.hidden) {
      animations.forEach((animation) => animation.pause());
      return;
    }
    start(page);
    for (const label of labels) {
      if (label.onScreen && getComputedStyle(label.element).display !== "none") {
        start(label.animation);
      } else {
        label.animation.pause();
      }
    }
  };
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const label = labels.find((item) => item.element.closest(".story__act") === entry.target);
        if (label) {
          label.onScreen = entry.isIntersecting;
        }
      }
      update();
    },
    { rootMargin: "100px" },
  );
  labels.forEach((label) => {
    const act = label.element.closest(".story__act");
    if (act) {
      observer.observe(act);
    }
  });
  // The labels appear and disappear when the layout changes (portrait phone to landscape).
  const layout = window.matchMedia("(max-width: 900px) and (orientation: portrait)");
  layout.addEventListener("change", update);
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
    update();
    if (document.hidden) {
      window.clearTimeout(idleTimer);
    } else {
      calm();
    }
  };

  for (const type of ACTIVITY) {
    window.addEventListener(type, calm, { passive: true });
  }
  document.addEventListener("visibilitychange", visibility);
  update();
  calm();

  return () => {
    window.clearTimeout(idleTimer);
    for (const type of ACTIVITY) {
      window.removeEventListener(type, calm);
    }
    document.removeEventListener("visibilitychange", visibility);
    layout.removeEventListener("change", update);
    observer.disconnect();
    root.removeAttribute("data-drift");
    animations.forEach((animation) => animation.cancel());
  };
}
