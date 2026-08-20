import { useState, useEffect, useCallback } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export interface ViewportInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isWide: boolean;
  breakpoint: Breakpoint;
  isLandscape: boolean;
  isTouchDevice: boolean;
}

const getBreakpoint = (width: number): Breakpoint => {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  if (width < 1536) return 'desktop';
  return 'wide';
};

export function useViewport(): ViewportInfo {
  const [viewport, setViewport] = useState<ViewportInfo>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 1280,
        height: 720,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isWide: false,
        breakpoint: 'desktop',
        isLandscape: true,
        isTouchDevice: false,
      };
    }
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      width: w,
      height: h,
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024 && w < 1536,
      isWide: w >= 1536,
      breakpoint: getBreakpoint(w),
      isLandscape: w > h,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    };
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        setViewport({
          width: w,
          height: h,
          isMobile: w < 640,
          isTablet: w >= 640 && w < 1024,
          isDesktop: w >= 1024 && w < 1536,
          isWide: w >= 1536,
          breakpoint: getBreakpoint(w),
          isLandscape: w > h,
          isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  return viewport;
}

export function useIsMobile(): boolean {
  const { isMobile } = useViewport();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = useViewport();
  return isTablet;
}

export function useIsTabletOrMobile(): boolean {
  const { isMobile, isTablet } = useViewport();
  return isMobile || isTablet;
}

export function useIsDesktop(): boolean {
  const { isDesktop, isWide } = useViewport();
  return isDesktop || isWide;
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    if (mql.addEventListener) {
      mql.addEventListener('change', handler);
      return () => mql.removeEventListener('change', handler);
    }
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, [query]);

  return matches;
}

export function useWindowSize() {
  const getSize = useCallback(() => {
    if (typeof window === 'undefined') return { width: 1280, height: 720 };
    return { width: window.innerWidth, height: window.innerHeight };
  }, []);

  const [size, setSize] = useState(getSize);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setSize(getSize()), 100);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [getSize]);

  return size;
}
