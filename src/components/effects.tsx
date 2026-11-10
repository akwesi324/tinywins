"use client";

import { useEffect, useRef } from "react";

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Confetti burst on a full-screen canvas. Does nothing when the user prefers reduced motion. */
export function Confetti({ burst, big = false }: { burst: number; big?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!burst || reducedMotion()) return;
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#f43f5e", "#f97316", "#facc15", "#84cc16", "#10b981", "#0ea5e9", "#8b5cf6", "#d946ef"];
    const pieces = Array.from({ length: big ? 260 : 120 }, () => ({
      x: innerWidth / 2 + (Math.random() - 0.5) * 120,
      y: innerHeight * 0.45,
      vx: (Math.random() - 0.5) * (big ? 22 : 15),
      vy: -Math.random() * (big ? 20 : 15) - 4,
      r: Math.random() * 6 + 4,
      spin: Math.random() * 0.4 - 0.2,
      a: Math.random() * Math.PI,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    let frame = 0;
    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of pieces) {
        p.vy += 0.45;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.spin;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.fillStyle = p.c;
        ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
        ctx.restore();
      }
      frame += 1;
      if (frame < 180) raf = requestAnimationFrame(draw);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [burst, big]);
  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-[60] h-full w-full" />;
}

let audio: AudioContext | null = null;
/** A short cheerful chime (no sound file needed). */
export function chime(kind: "reminder" | "win" = "reminder") {
  try {
    audio ??= new AudioContext();
    const notes = kind === "win" ? [523.25, 659.25, 783.99, 1046.5] : [880, 660, 880];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = audio!.currentTime + i * 0.12;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(audio!.destination);
      o.start(t);
      o.stop(t + 0.32);
    });
  } catch {
    /* audio not available */
  }
}
