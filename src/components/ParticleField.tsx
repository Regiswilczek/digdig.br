import { useEffect, useRef } from "react";

/**
 * Animated terrain canvas — Brazil flag palette wave field.
 * Imperative canvas created outside React reconciler to avoid SSR/Strict Mode.
 * Pauses when off-screen or tab hidden. Respects prefers-reduced-motion.
 */
export function ParticleField() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || typeof window === "undefined") return;

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.style.cssText =
      "position:absolute;top:0;left:0;width:100%;height:100%;display:block";
    wrap.appendChild(cv);

    const ctx = cv.getContext("2d")!;
    let t = 0;
    let raf = 0;
    let alive = true;
    let visible = true;
    let tabVisible = !document.hidden;
    let lastFrame = 0;
    const FRAME_MS = 1000 / 30;

    function resize() {
      cv.width = wrap!.clientWidth || window.innerWidth;
      cv.height = wrap!.clientHeight || window.innerHeight;
    }

    function drawFrame() {
      const W = cv.width;
      const H = cv.height;
      if (W < 2 || H < 2) return;

      ctx.clearRect(0, 0, W, H);

      const STEP = 6;
      const PIX = 3;

      const BLUE = [10, 35, 110];
      const GREEN = [0, 130, 60];
      const YELLOW = [240, 200, 30];

      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
      const mix = (c1: number[], c2: number[], t: number) => [
        lerp(c1[0], c2[0], t),
        lerp(c1[1], c2[1], t),
        lerp(c1[2], c2[2], t),
      ];

      for (let py = 0; py < H; py += STEP) {
        const ny = py / H;
        for (let px = 0; px < W; px += STEP) {
          const nx = px / W;

          const w1 = Math.sin(nx * 4.2 + ny * 2.6 + t * 0.35);
          const w2 = Math.sin(nx * 1.9 - ny * 3.4 - t * 0.22);
          const w3 = Math.cos((nx + ny) * 3.1 + t * 0.18);
          const raw = (w1 * 0.42 + w2 * 0.33 + w3 * 0.25) * 0.5 + 0.5;

          const ridge = Math.pow(1 - Math.abs(2 * raw - 1), 1.8);

          const THRESH = 0.30;
          if (ridge < THRESH) continue;
          const norm = (ridge - THRESH) / (1 - THRESH);

          const band = (nx * 0.55 + (1 - ny) * 0.45 + Math.sin(t * 0.12) * 0.04 + raw * 0.08) % 1;

          let col: number[];
          if (band < 0.40) {
            const u = band / 0.40;
            col = mix(GREEN, YELLOW, Math.pow(u, 1.6));
          } else if (band < 0.62) {
            const u = (band - 0.40) / 0.22;
            col = mix(YELLOW, mix(YELLOW, BLUE, 0.5), u);
          } else {
            const u = (band - 0.62) / 0.38;
            col = mix(mix(YELLOW, BLUE, 0.5), BLUE, Math.pow(u, 0.8));
          }

          const intensity = 0.40 + norm * 0.65;
          const r = Math.min(255, Math.round(col[0] * intensity));
          const g = Math.min(255, Math.round(col[1] * intensity));
          const b = Math.min(255, Math.round(col[2] * intensity));

          const alpha = Math.min(0.85, 0.35 + norm * 0.50);
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha.toFixed(2)})`;
          ctx.fillRect(px, py, PIX, PIX);
        }
      }
    }

    function tick(now: number) {
      if (!alive) return;
      if (!visible || !tabVisible) return;
      if (now - lastFrame >= FRAME_MS) {
        lastFrame = now;
        drawFrame();
        t += 0.024;
      }
      raf = requestAnimationFrame(tick);
    }

    function start() {
      if (!alive || reducedMotion) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    }

    function onVisibility() {
      tabVisible = !document.hidden;
      if (tabVisible) start();
      else cancelAnimationFrame(raf);
    }

    resize();
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0]?.isIntersecting ?? true;
        if (visible) start();
        else cancelAnimationFrame(raf);
      },
      { threshold: 0.01 }
    );
    io.observe(wrap);

    if (reducedMotion) drawFrame();
    else start();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
      cv.remove();
    };
  }, []);

  return <div ref={wrapRef} aria-hidden="true" className="absolute inset-0" />;
}
