'use client';
import { useEffect, useRef, useMemo, useState } from 'react';

/** 3D space scene background — viewer floating in space looking at Earth.
 *  Layers: deep space → distant nebula → milky way stars → planet Earth. */
export function SpaceBackground() {
  const earthRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Distant stars (3 layers for depth) — TOTAL 400 stars biar padat & bersinar
  const starLayers = useMemo(() => {
    function gen(count: number, maxSize: number, opacity: number) {
      return Array.from({ length: count }, () => ({
        top: Math.random() * 100 + '%',
        left: Math.random() * 100 + '%',
        size: (Math.random() * maxSize + 0.5).toFixed(1) + 'px',
        opacity: (Math.random() * opacity + 0.3).toFixed(2),
        twinkleDelay: (Math.random() * 4).toFixed(1) + 's',
      }));
    }
    return {
      far: gen(220, 1.2, 0.6),    // tiny distant stars (dense)
      mid: gen(120, 2, 0.85),     // medium stars
      near: gen(40, 3.5, 1),      // bright nearby stars
      bigBright: Array.from({ length: 12 }, () => ({  // big sparkle stars
        top: Math.random() * 100 + '%',
        left: Math.random() * 100 + '%',
        delay: (Math.random() * 5).toFixed(1) + 's',
      })),
    };
  }, []);

  useEffect(() => {
    let raf = 0;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;

    function onMove(e: MouseEvent) {
      targetX = (e.clientX / window.innerWidth) - 0.5;
      targetY = (e.clientY / window.innerHeight) - 0.5;
    }
    function tick() {
      curX += (targetX - curX) * 0.05;
      curY += (targetY - curY) * 0.05;
      // Earth subtle parallax (closer object moves more)
      if (earthRef.current) {
        earthRef.current.style.transform =
          `translate3d(${curX * 30}px, ${curY * 30}px, 0) rotateZ(${curX * 2}deg)`;
      }
      // Scene subtle drift (distant)
      if (sceneRef.current) {
        sceneRef.current.style.transform = `translate3d(${curX * -10}px, ${curY * -10}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }
    window.addEventListener('mousemove', onMove);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="space-bg fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {/* Deep space gradient */}
      <div className="space-deep" />

      {/* Distant nebula clouds */}
      <div className="space-nebula space-nebula-1" />
      <div className="space-nebula space-nebula-2" />
      <div className="space-nebula space-nebula-3" />

      {/* Star layers (parallax depth) — client-only to avoid SSR hydration mismatch from Math.random */}
      <div ref={sceneRef} className="space-scene" suppressHydrationWarning>
        {mounted && starLayers.far.map((s, i) => (
          <span
            key={`f-${i}`}
            className="space-star space-star-twinkle"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              opacity: s.opacity, animationDelay: s.twinkleDelay,
            }}
          />
        ))}
        {mounted && starLayers.mid.map((s, i) => (
          <span
            key={`m-${i}`}
            className="space-star space-star-twinkle"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              opacity: s.opacity, animationDelay: s.twinkleDelay,
              boxShadow: '0 0 4px rgba(255,255,255,0.6)',
            }}
          />
        ))}
        {mounted && starLayers.near.map((s, i) => (
          <span
            key={`n-${i}`}
            className="space-star space-star-twinkle"
            style={{
              top: s.top, left: s.left, width: s.size, height: s.size,
              opacity: s.opacity, animationDelay: s.twinkleDelay,
              boxShadow: '0 0 8px rgba(255,255,255,0.9), 0 0 14px rgba(135,206,250,0.6)',
            }}
          />
        ))}
        {/* Big sparkle stars dengan 4-pointed cross effect */}
        {mounted && starLayers.bigBright.map((s, i) => (
          <span
            key={`big-${i}`}
            className="space-sparkle"
            style={{ top: s.top, left: s.left, animationDelay: s.delay }}
          />
        ))}
      </div>

      {/* Earth — pure CSS planet */}
      <div ref={earthRef} className="space-earth-wrap">
        <div className="space-earth">
          {/* Continents — pseudo random shapes */}
          <div className="space-earth-continents" />
          {/* Cloud layer */}
          <div className="space-earth-clouds" />
          {/* Day/night terminator */}
          <div className="space-earth-shadow" />
          {/* Atmosphere glow */}
          <div className="space-earth-atmosphere" />
        </div>
        {/* Outer atmosphere glow */}
        <div className="space-earth-halo" />
      </div>

      {/* Vignette */}
      <div className="space-vignette" />
    </div>
  );
}
