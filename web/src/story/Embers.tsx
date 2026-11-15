import { useEffect, useRef } from "react";

type Props = {
  /** True while the fire act is the one being read; the ash fades in and out with it. */
  active: boolean;
};

type Particle = {
  x: number;
  y: number;
  r: number; // radius, px
  vy: number; // fall speed, px/s
  sway: number; // sideways drift amplitude, px/s
  phase: number;
  heat: number; // 1 = glowing ember, 0 = cold ash
};

const FADE_SECONDS = 1.2;
const EMBER = [255, 138, 56];
const ASH = [165, 156, 150];

/**
 * A few flakes of ash and dying embers, falling slowly behind the page during the fire
 * act. Decoration only: a small canvas behind the text and the maps, never over them.
 * Nothing is drawn with prefers-reduced-motion, and the loop stops when the act is not
 * active or the tab is hidden.
 */
export default function Embers({ active }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const activeRef = useRef(active);
  const start = useRef<() => void>(() => undefined);
  activeRef.current = active;

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!element || !ctx) {
      return;
    }
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let frame = 0;
    let level = 0;
    let last = 0;

    const spawn = (anywhere: boolean): Particle => ({
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10 - Math.random() * 60,
      r: 0.8 + Math.random() * 1.6,
      vy: 14 + Math.random() * 22,
      sway: 6 + Math.random() * 14,
      phase: Math.random() * Math.PI * 2,
      heat: anywhere ? Math.random() : 0.6 + Math.random() * 0.4,
    });

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const wanted = Math.max(12, Math.min(40, Math.round((width * height) / 36000)));
      while (particles.length < wanted) {
        particles.push(spawn(true));
      }
      particles = particles.slice(0, wanted);
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const target = activeRef.current && !document.hidden && !motion.matches ? 1 : 0;
      level += Math.sign(target - level) * Math.min(Math.abs(target - level), dt / FADE_SECONDS);
      ctx.clearRect(0, 0, width, height);
      if (level === 0 && target === 0) {
        frame = 0;
        return;
      }
      const seconds = now / 1000;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.vy * dt;
        p.x += Math.sin(seconds * 0.6 + p.phase) * p.sway * dt + 4 * dt;
        p.heat = Math.max(0, p.heat - dt * 0.07);
        if (p.y > height + 10 || p.x > width + 10) {
          particles[i] = spawn(false);
          continue;
        }
        const mix = 1 - p.heat;
        const red = EMBER[0] + (ASH[0] - EMBER[0]) * mix;
        const green = EMBER[1] + (ASH[1] - EMBER[1]) * mix;
        const blue = EMBER[2] + (ASH[2] - EMBER[2]) * mix;
        const alpha = (0.16 + 0.44 * p.heat) * level;
        if (p.heat > 0.45) {
          ctx.fillStyle = `rgba(${red | 0}, ${green | 0}, ${blue | 0}, ${alpha * 0.18})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = `rgba(${red | 0}, ${green | 0}, ${blue | 0}, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame = requestAnimationFrame(tick);
    };

    start.current = () => {
      if (frame === 0 && !motion.matches) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", start.current);
    start.current();
    return () => {
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", start.current);
      cancelAnimationFrame(frame);
      frame = 0;
      start.current = () => undefined;
    };
  }, []);

  useEffect(() => {
    if (active) {
      start.current();
    }
  }, [active]);

  return <canvas ref={canvas} className="embers" aria-hidden="true" />;
}
