import React from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
// Removed LayoutConfig import - using semantic Tailwind classes

interface MetricCardProps {
  title: string;
  value: number | string | React.ReactNode;
  previousValue?: number | string;
  icon: React.ReactNode;
  emoji?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  className?: string;
  isLoading?: boolean;
  animated?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral';
  hasHistoricalData?: boolean;
  onHistoricalClick?: () => void;
  metricKey?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  previousValue,
  icon,
  emoji,
  trend = 'neutral',
  trendValue,
  className,
  isLoading = false,
  animated = true,
  variant = 'primary',
  hasHistoricalData = false,
  onHistoricalClick,
  metricKey
}) => {

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-cactus-600';
      case 'down':
        return 'text-error-600';
      default:
        return 'text-secondary';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-br from-cactus-50 to-cactus-100 bg-primary border border-cactus-200 hover:shadow-xl';
      case 'secondary':
        return 'bg-gradient-to-br from-oasis-50 to-oasis-100 bg-primary border border-oasis-200 hover:shadow-xl';
      case 'accent':
        return 'bg-gradient-to-br from-terracotta-50 to-terracotta-100 bg-primary border border-terracotta-200 hover:shadow-xl';
      case 'neutral':
        return 'bg-secondary bg-primary border border-border-primary hover:shadow-xl';
      default:
        return 'bg-gradient-to-br from-cactus-50 to-cactus-100 bg-primary border border-cactus-200 hover:shadow-xl';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4" />;
      case 'down':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const handleHistoricalClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasHistoricalData && onHistoricalClick) {
      onHistoricalClick();
    }
  };



  return (
    <div 
      className={cn(
        "rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl p-6",
        "backdrop-blur-sm animate-fade-in-up relative",
        getVariantStyles(),
        hasHistoricalData && variant === 'primary' && 'hover:ring-2 hover:ring-cactus-200',
        hasHistoricalData && variant === 'secondary' && 'hover:ring-2 hover:ring-oasis-200',
        hasHistoricalData && variant === 'accent' && 'hover:ring-2 hover:ring-terracotta-200',
        hasHistoricalData && variant === 'neutral' && 'hover:ring-2 hover:ring-border-primary',
        className
      )}
    >
      {isLoading ? (
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div className="h-4 bg-soft rounded-lg w-24"></div>
            <div className="h-8 w-8 bg-soft rounded-full"></div>
          </div>
          <div className="h-10 bg-soft rounded-lg w-20 mb-4"></div>
          <div className="h-3 bg-soft rounded-lg w-24"></div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-secondary tracking-wide">{title}</h3>
            <div className="flex items-center space-x-2">
              {emoji && (
                <span className="text-2xl transition-all duration-300">
                  {emoji}
                </span>
              )}
              <div className="text-disabled transition-all duration-300">
                {icon}
              </div>
              {hasHistoricalData && (
                <button
                  onClick={handleHistoricalClick}
                  className="p-2 rounded-lg bg-soft hover:bg-neutral-200 transition-colors duration-200 group"
                  title="Ver datos históricos"
                >
                  <BarChart3 className="w-4 h-4 text-secondary group-hover:text-primary" />
                </button>
              )}
            </div>
          </div>
          
          {/* Historical Data Indicator */}
          {hasHistoricalData && (
            <div className="absolute top-4 right-4 pointer-events-none">
              <div className={cn(
                "p-1.5 rounded-full transition-all duration-300 opacity-60 hover:opacity-100",
                "bg-white/80 backdrop-blur-sm shadow-sm",
                variant === 'primary' && "text-cactus-600 hover:bg-cactus-50",
                variant === 'secondary' && "text-cactus-700 hover:bg-cactus-100",
                variant === 'accent' && "text-cactus-800 hover:bg-cactus-200",
                variant === 'neutral' && "text-neutral-600 hover:bg-neutral-50"
              )}>
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
          )}
          
          <div className="text-3xl font-bold text-primary mb-4 font-cactus">
            {value}
          </div>
          
          {trendValue && (
            <div className={cn(
              "flex items-center text-sm font-medium transition-all duration-300",
              getTrendColor()
            )}>
              <div className="mr-2 flex items-center">{getTrendIcon()}</div>
              <span>{trendValue}</span>
            </div>
          )}
          

        </>
      )}
    </div>
  );
};

export default MetricCard;