'use client';

import { useEffect, useRef } from 'react';
import type { AnimationItem } from 'lottie-web';
import animationData from '../../public/neanderthal-flip.json';

export function HeaderLottie() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let isMounted = true;

    // Dynamically import lottie-web on client-side only
    import('lottie-web').then((mod) => {
      if (!isMounted || !containerRef.current) return;
      const lottie = mod.default || mod;

      // Check if user prefers reduced motion
      const prefersReducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;

      animRef.current = lottie.loadAnimation({
        container: containerRef.current,
        renderer: 'svg',
        loop: !prefersReducedMotion,
        autoplay: !prefersReducedMotion,
        animationData,
      });

      if (prefersReducedMotion && animRef.current) {
        animRef.current.goToAndStop(0, true);
      }
    });

    // Pause animation when scrolled out of view to conserve GPU, CPU, and battery
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!animRef.current) return;
        if (entry.isIntersecting) {
          animRef.current.play();
        } else {
          animRef.current.pause();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(container);

    return () => {
      isMounted = false;
      observer.disconnect();
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="shrink-0 aspect-[219/215] w-[32px] h-[32px] md:w-[44px] md:h-[44px] select-none pointer-events-none overflow-hidden rounded-[8px] isolate"
    />


  );
}
