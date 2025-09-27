/**
 * Componente de tarjeta de estadísticas optimizado para Notion CRM
 * Proporciona visualización mejorada de métricas del CRM
 */

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NotionStatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  format?: 'number' | 'currency' | 'percentage';
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  className?: string;
}

const NotionStatsCard: React.FC<NotionStatsCardProps> = ({
  title,
  value,
  icon: Icon,
  subtitle,
  trend,
  format = 'number',
  color = 'blue',
  className = ''
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('es-ES', {
          style: 'currency',
          currency: 'EUR',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      case 'percentage':
        return `${val}%`;
      default:
        return new Intl.NumberFormat('es-ES').format(val);
    }
  };

  const getColorClasses = () => {
    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'text-blue-600',
        text: 'text-blue-900'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'text-green-600',
        text: 'text-green-900'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'text-purple-600',
        text: 'text-purple-900'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'text-orange-600',
        text: 'text-orange-900'
      },
      red: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        icon: 'text-red-600',
        text: 'text-red-900'
      }
    };
    return colors[color];
  };

  const colorClasses = getColorClasses();

  const getTrendIcon = () => {
    if (!trend) return null;
    
    if (trend.value > 0) {
      return <TrendingUp className="w-4 h-4 text-green-500" />;
    } else if (trend.value < 0) {
      return <TrendingDown className="w-4 h-4 text-red-500" />;
    } else {
      return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-500';
    
    if (trend.isPositive) {
      return trend.value > 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return trend.value > 0 ? 'text-red-600' : 'text-green-600';
    }
  };

  return (
    <div className={`${colorClasses.bg} ${colorClasses.border} border rounded-lg p-6 hover:shadow-md transition-all duration-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${colorClasses.text}`}>
            {formatValue(value)}
          </p>
          
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">
              {subtitle}
            </p>
          )}
          
          {trend && (
            <div className="flex items-center mt-2 space-x-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(trend.value)}%
              </span>
              <span className="text-sm text-gray-500">
                vs mes anterior
              </span>
            </div>
          )}
        </div>
        
        <div className={`p-3 rounded-full ${colorClasses.bg} border ${colorClasses.border}`}>
          <Icon className={`w-6 h-6 ${colorClasses.icon}`} />
        </div>
      </div>
    </div>
  );
};

export default NotionStatsCard;