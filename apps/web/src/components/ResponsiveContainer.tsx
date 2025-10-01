import React from 'react';
import { cn } from '../lib/utils';
// import { LayoutConfig } from '../config/layout';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  center?: boolean;
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  maxWidth = 'full',
  padding = 'md',
  center = true
}) => {
  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    'full': 'max-w-full'
  };

  const paddingClasses = {
    'none': '',
    'sm': 'p-2 sm:p-4',
    'md': 'p-4 sm:p-6',
    'lg': 'p-6 sm:p-8'
  };

  return (
    <div className={cn(
      'w-full',
      maxWidthClasses[maxWidth],
      paddingClasses[padding],
      center && 'mx-auto',
      className
    )}>
      {children}
    </div>
  );
};

export default ResponsiveContainer;

// Grid component for responsive layouts
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, cols = { default: 1, md: 2, lg: 3 }, gap = 'md', className }) => {
  const gapClasses = {
    'sm': 'gap-2',
    'md': 'gap-4',
    'lg': 'gap-6'
  };

  const getGridCols = () => {
    const classes = [];
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    return classes.join(' ');
  };

  return (
    <div className={cn(
      'grid',
      getGridCols(),
      gapClasses[gap],
      className
    )}>
      {children}
    </div>
  );
};

// Responsive card component
export const ResponsiveCard: React.FC<{
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'sm' | 'md' | 'lg';
}> = ({ children, title, subtitle, className, padding = 'md', shadow = 'md' }) => {
  const paddingClasses = {
    'sm': 'p-3 sm:p-4',
    'md': 'p-4 sm:p-6',
    'lg': 'p-6 sm:p-8'
  };

  const shadowClasses = {
    'sm': 'shadow-sm',
    'md': 'shadow-md',
    'lg': 'shadow-lg'
  };

  return (
    <div className={cn(
      'bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700',
      shadowClasses[shadow],
      paddingClasses[padding],
      className
    )}>
      {(title || subtitle) && (
        <div className="mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-700">
          {title && (
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              {title}
            </h3>
          )}
          {subtitle && (
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {subtitle}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

// Responsive stack component
export const ResponsiveStack: React.FC<{
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}> = ({ children, direction = 'vertical', spacing = 'md', align = 'stretch', className }) => {
  const spacingClasses = {
    'sm': 'space-y-2 sm:space-y-0 sm:space-x-2',
    'md': 'space-y-4 sm:space-y-0 sm:space-x-4',
    'lg': 'space-y-6 sm:space-y-0 sm:space-x-6'
  };

  const alignClasses = {
    'start': 'items-start',
    'center': 'items-center',
    'end': 'items-end',
    'stretch': 'items-stretch'
  };

  const directionClasses = {
    'vertical': 'flex flex-col',
    'horizontal': 'flex flex-row',
    'responsive': 'flex flex-col sm:flex-row'
  };

  return (
    <div className={cn(
      directionClasses[direction],
      alignClasses[align],
      direction === 'responsive' ? spacingClasses[spacing] : 
      direction === 'vertical' ? `space-y-${spacing === 'sm' ? '2' : spacing === 'md' ? '4' : '6'}` :
      `space-x-${spacing === 'sm' ? '2' : spacing === 'md' ? '4' : '6'}`,
      className
    )}>
      {children}
    </div>
  );
};

// Hook for responsive breakpoints
export const useResponsive = () => {
  const [breakpoint, setBreakpoint] = React.useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');

  React.useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 640) setBreakpoint('sm');
      else if (width < 768) setBreakpoint('md');
      else if (width < 1024) setBreakpoint('lg');
      else if (width < 1280) setBreakpoint('xl');
      else setBreakpoint('2xl');
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return {
    breakpoint,
    isMobile: breakpoint === 'sm',
    isTablet: breakpoint === 'md',
    isDesktop: ['lg', 'xl', '2xl'].includes(breakpoint),
    isLargeScreen: ['xl', '2xl'].includes(breakpoint)
  };
};

// Responsive text component
export const ResponsiveText: React.FC<{
  children: React.ReactNode;
  size?: {
    default?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    sm?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    md?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    lg?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
  };
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'gray' | 'black' | 'white' | 'primary';
  className?: string;
}> = ({ children, size = { default: 'base' }, weight = 'normal', color = 'gray', className }) => {
  const getSizeClasses = () => {
    const classes = [];
    if (size.default) classes.push(`text-${size.default}`);
    if (size.sm) classes.push(`sm:text-${size.sm}`);
    if (size.md) classes.push(`md:text-${size.md}`);
    if (size.lg) classes.push(`lg:text-${size.lg}`);
    return classes.join(' ');
  };

  const weightClasses = {
    'normal': 'font-normal',
    'medium': 'font-medium',
    'semibold': 'font-semibold',
    'bold': 'font-bold'
  };

  const colorClasses = {
    'gray': 'text-neutral-700 dark:text-neutral-300',
    'black': 'text-neutral-900 dark:text-neutral-100',
    'white': 'text-white',
    'primary': 'text-cactus-600 dark:text-cactus-400'
  };

  return (
    <span className={cn(
      getSizeClasses(),
      weightClasses[weight],
      colorClasses[color],
      className
    )}>
      {children}
    </span>
  );
};

// Mobile-first button component
export const ResponsiveButton: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  mobileFullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  mobileFullWidth = false,
  onClick, 
  disabled = false, 
  className 
}) => {
  const variantClasses = {
    'primary': 'bg-cactus-600 hover:bg-cactus-700 text-white',
    'secondary': 'bg-neutral-600 hover:bg-neutral-700 text-white',
    'outline': 'border border-cactus-500 text-cactus-600 dark:text-cactus-400 hover:bg-cactus-50 dark:hover:bg-cactus-900/20',
    'ghost': 'text-cactus-600 dark:text-cactus-400 hover:bg-cactus-50 dark:hover:bg-cactus-900/20'
  };

  const sizeClasses = {
    'sm': 'px-3 py-1.5 text-sm',
    'md': 'px-4 py-2 text-base',
    'lg': 'px-6 py-3 text-lg'
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-lg font-medium transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-cactus-500 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        mobileFullWidth && 'w-full sm:w-auto',
        className
      )}
    >
      {children}
    </button>
  );
};