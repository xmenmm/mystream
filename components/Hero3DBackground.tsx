'use client';
import { useEffect, useRef } from 'react';

/** 3D-feel background — covers FULL landing page (fixed to viewport).
 *  Multi-layer: aurora + perspective grid + floating orbs + stars + parallax. */
export function Hero3DBackground() {
  const auroraRef = useRef<HTMLDivElement>(null);
  const orbsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const scrollOrbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    let targetX = 0, targetY = 0;
    let curX = 0, curY = 0;
    let scrollY = 0;

    function onMove(e: MouseEvent) {
      targetX = (e.clientX / window.innerWidth) - 0.5;
      targetY = (e.clientY / window.innerHeight) - 0.5;
    }
    function onScroll() {
      scrollY = window.scrollY;
    }

    function tick() {
      curX += (targetX - curX) * 0.06;
      curY += (targetY - curY) * 0.06;

      if (auroraRef.current) {
        auroraRef.current.style.transform = `translate3d(${curX * 30}px, ${curY * 30 - scrollY * 0.05}px, 0)`;
      }
      if (orbsRef.current) {
        orbsRef.current.style.transform = `translate3d(${curX * 60}px, ${curY * 60 - scrollY * 0.15}px, 0)`;
      }
      if (gridRef.current) {
        gridRef.current.style.transform =
          `perspective(800px) rotateX(${60 + curY * 8}deg) rotateY(${curX * 4}deg) translateZ(-40px) scale(2)`;
      }
      if (scrollOrbsRef.current) {
        // Different parallax speed for second orb layer
        scrollOrbsRef.current.style.transform = `translate3d(${curX * 100}px, ${curY * 100 - scrollY * 0.3}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="hero3d-fixed" aria-hidden="true">
      {/* Layer 1: Aurora — colored conic gradient */}
      <div ref={auroraRef} className="hero3d-aurora" />

      {/* Layer 2: 3D perspective grid */}
      <div ref={gridRef} className="hero3d-grid" />

      {/* Layer 3: Floating orbs (parallax with scroll) */}
      <div ref={orbsRef} className="hero3d-parallax">
        <div className="hero3d-orb hero3d-orb-1" />
        <div className="hero3d-orb hero3d-orb-2" />
        <div className="hero3d-orb hero3d-orb-3" />
        <div className="hero3d-orb hero3d-orb-4" />
        <div className="hero3d-orb hero3d-orb-5" />
      </div>

      {/* Layer 4: Stars (no parallax) */}
      <div className="hero3d-stars" />

      {/* Layer 5: Extra orbs that follow scroll faster (second parallax layer) */}
      <div ref={scrollOrbsRef} className="hero3d-parallax">
        <div className="hero3d-orb-extra hero3d-orb-x1" />
        <div className="hero3d-orb-extra hero3d-orb-x2" />
        <div className="hero3d-orb-extra hero3d-orb-x3" />
        <div className="hero3d-orb-extra hero3d-orb-x4" />
      </div>

      {/* Layer 6: Vignette */}
      <div className="hero3d-vignette" />
    </div>
  );
}
