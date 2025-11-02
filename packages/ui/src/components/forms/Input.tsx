import React, { useState } from 'react';
import Icon, { type IconName } from '../Icon';
import { cn } from '../../utils/cn';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  placeholder?: string;
  leftIcon?: IconName;
  rightIcon?: IconName;
  size?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
}

export default function Input({ 
  label, 
  error, 
  className = '', 
  leftIcon,
  rightIcon,
  size = 'md',
  showPasswordToggle = false,
  type,
  ...props 
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  
  // Only use password toggle if type is password and showPasswordToggle is true
  const isPassword = type === 'password';
  const inputType = isPassword && showPasswordToggle && showPassword ? 'text' : type;
  const sizeClasses = {
    sm: 'h-9 text-sm px-3',
    md: 'h-10 text-base px-3',
    lg: 'h-12 text-base px-4',
  };

  const iconPadding = {
    sm: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '',
    md: leftIcon ? 'pl-10' : rightIcon ? 'pr-10' : '',
    lg: leftIcon ? 'pl-12' : rightIcon ? 'pr-12' : '',
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={props.id} className="block text-sm font-medium text-text mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name={leftIcon} size={16} className="text-text-muted" />
          </div>
        )}
        <input
          type={inputType}
          className={cn(
            'w-full border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors',
            'bg-white text-gray-900',
            sizeClasses[size],
            iconPadding[size],
            rightIcon && !leftIcon && 'pr-10',
            isPassword && showPasswordToggle && 'pr-10',
            error ? 'border-error focus:border-error focus:ring-error' : 'border-gray-300',
            props.disabled && 'opacity-50 cursor-not-allowed bg-gray-50',
            className
          )}
          {...props}
        />
        {rightIcon && !(isPassword && showPasswordToggle) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon name={rightIcon} size={16} className="text-text-muted" />
          </div>
        )}
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? '👁️' : '👁️‍🗨️'}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-error">{error}</p>
      )}
    </div>
  );
}
