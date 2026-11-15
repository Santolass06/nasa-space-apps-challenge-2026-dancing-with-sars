import { useEffect, useRef } from "react";

type Props = {
  /** True while the fire act is the one being read; the ash fades in and out with it. */
  active: boolean;
};

type Particle = {
  x: number;
  y: number;
  z: number; // depth: 1 is near (bigger, faster, brighter), about 0.3 is far
  r: number; // radius, px
  fall: number; // fall speed, px/s
  wind: number; // drift to the right, px/s
  phase: number;
  flicker: number; // rad/s
  ember: boolean; // glowing ember, otherwise a flake of grey ash
  heat: number; // 1 = white-yellow, 0.6 = orange, 0.25 = red, 0 = out (embers only)
  cool: number; // heat lost per second
};

const FADE_SECONDS = 1.2;

const mix = (a: number[], b: number[], t: number) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

// Embers glow yellow-white when fresh (about 900 °C and more), orange, then dull red, then go out.
const WHITE = [255, 232, 170];
const ORANGE = [255, 140, 50];
const RED = [200, 60, 30];
const DARK = [90, 30, 20];

const emberColour = (heat: number) =>
  heat > 0.6
    ? mix(ORANGE, WHITE, (heat - 0.6) / 0.4)
    : heat > 0.25
      ? mix(RED, ORANGE, (heat - 0.25) / 0.35)
      : mix(DARK, RED, heat / 0.25);

/**
 * Embers and ash drifting through the fire act: lots of tiny points in a few depth
 * layers, blown sideways and lifted or dropped by slow gusts, the glowing ones
 * flickering and cooling from yellow to red to nothing, the grey ash tumbling. They
 * are painted on a small canvas behind the text and the maps, never over them.
 * Nothing is drawn with prefers-reduced-motion, and the loop stops when the act is
 * not active or the tab is hidden.
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

    const spawn = (anywhere: boolean): Particle => {
      const ember = Math.random() < 0.62;
      const z = 0.35 + Math.random() * 0.65;
      return {
        x: (anywhere ? Math.random() : Math.random() * 1.15 - 0.15) * width,
        y: anywhere ? Math.random() * height : -10 - Math.random() * 60,
        z,
        r: ember ? (0.5 + Math.random() * 1.1) * z * 1.6 : (0.9 + Math.random() * 1.6) * z,
        fall: (ember ? 12 + Math.random() * 30 : 8 + Math.random() * 14) * z,
        wind: (16 + Math.random() * 26) * z,
        phase: Math.random() * Math.PI * 2,
        flicker: 4 + Math.random() * 9,
        ember,
        heat: anywhere ? Math.random() : 0.75 + Math.random() * 0.25,
        cool: 0.1 + Math.random() * 0.12,
      };
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      element.width = Math.round(width * ratio);
      element.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const wanted = Math.max(60, Math.min(220, Math.round((width * height) / 7000)));
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
      const t = now / 1000;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        // slow gusts: sideways turbulence, and a lift that now and then beats the fall
        const turbulence = Math.sin(t * 0.5 + p.y * 0.006 + p.phase) * 14 + Math.sin(t * 0.9 + p.x * 0.004) * 8;
        const lift = Math.sin(t * 0.35 + p.x * 0.003 + p.phase) * (p.ember ? 16 : 7);
        p.x += (p.wind + turbulence * p.z) * dt;
        p.y += (p.fall - lift * p.z) * dt;
        if (p.ember) {
          p.heat -= p.cool * dt;
        }
        if (p.y > height + 10 || p.x > width + 10 || p.y < -80 || (p.ember && p.heat <= 0)) {
          particles[i] = spawn(false);
        }
      }

      // grey ash first, tumbling, in normal blending
      ctx.globalCompositeOperation = "source-over";
      for (const p of particles) {
        if (p.ember) {
          continue;
        }
        const alpha = (0.09 + 0.14 * p.z) * level * (0.7 + 0.3 * Math.sin(t * 1.3 + p.phase));
        ctx.fillStyle = `rgba(160, 154, 148, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.r * 1.5, p.r * 0.8, t * 0.8 + p.phase, 0, Math.PI * 2);
        ctx.fill();
      }

      // glowing embers on top, added to what is behind, each with a short streak
      ctx.globalCompositeOperation = "lighter";
      ctx.lineCap = "round";
      for (const p of particles) {
        if (!p.ember) {
          continue;
        }
        const [red, green, blue] = emberColour(Math.max(0, p.heat)).map((v) => v | 0);
        const flick = 0.6 + 0.4 * Math.sin(t * p.flicker + p.phase) ** 2;
        const alpha = Math.min(1, p.heat * 3) * (0.35 + 0.65 * p.z) * flick * level;
        const vx = p.wind + Math.sin(t * 0.5 + p.y * 0.006 + p.phase) * 14 * p.z;
        const vy = p.fall - Math.sin(t * 0.35 + p.x * 0.003 + p.phase) * 16 * p.z;
        ctx.strokeStyle = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        ctx.lineWidth = Math.max(0.8, p.r * 1.5);
        ctx.beginPath();
        ctx.moveTo(p.x - vx * 0.05, p.y - vy * 0.05);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        if (p.r > 1.15 && p.heat > 0.3) {
          ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${alpha * 0.14})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = "source-over";
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
