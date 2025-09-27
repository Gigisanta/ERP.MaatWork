import React, { useEffect, useState } from 'react';
import { cn } from '../lib/utils';


interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export const AnimatedCounter: React.FC<AnimatedCounterProps> = ({
  value,
  duration = 1000,
  className,
  prefix = '',
  suffix = '',
  decimals = 0
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Only animate if the value actually changed
    if (value === displayValue) return;
    
    setIsAnimating(true);
    const startValue = displayValue;
    const endValue = value;
    const startTime = Date.now();
    let animationId: number;

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationId = requestAnimationFrame(animate);
      } else {
        setDisplayValue(endValue);
        setIsAnimating(false);
      }
    };

    animationId = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [value]); // Remove duration dependency

  const formatValue = (val: number) => {
    return val.toFixed(decimals);
  };

  return (
    <span className={cn(
      "transition-all duration-300",
      isAnimating && "text-cactus-600 dark:text-cactus-400",
      className
    )}>
      {prefix}{formatValue(displayValue)}{suffix}
    </span>
  );
};