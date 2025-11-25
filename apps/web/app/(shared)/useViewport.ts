"use client";
import { useEffect, useState } from 'react';

export function useViewport() {
  const [width, setWidth] = useState<number>(typeof window === 'undefined' ? 1920 : window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return {
    width,
    isXs: width < 640,
    isSm: width >= 640 && width < 768,
    isMd: width >= 768 && width < 1024,
    isLg: width >= 1024,
  } as const;
}


