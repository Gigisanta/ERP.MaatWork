import React from 'react';
import { Loader2 } from 'lucide-react';
// Removed LayoutConfig import - using semantic Tailwind classes

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner = ({ size = 'md', className = '' }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div className={`flex items-center justify-center p-8 ${className}`}>
      <Loader2 className={`animate-spin text-cactus-600 dark:text-cactus-400 ${sizeClasses[size]}`} />
    </div>
  );
};

export default LoadingSpinner;