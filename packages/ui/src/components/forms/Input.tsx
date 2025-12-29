'use client';

import React, { useState, forwardRef, useId } from 'react';
import { Icon, type IconName } from '../Icon.js';
import { cn } from '../../utils/cn.js';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string | null | undefined;
  placeholder?: string;
  leftIcon?: IconName | undefined;
  rightIcon?: IconName | undefined;
  /** Callback when right icon is clicked (makes icon interactive) */
  onRightIconClick?: (() => void) | undefined;
  size?: 'sm' | 'md' | 'lg';
  showPasswordToggle?: boolean;
}

/**
 * Input component with brand styling.
 * Uses Open Sans (body font) for text.
 * Focus ring uses Primary Purple color.
 *
 * @example
 * ```tsx
 * <Input label="Email" placeholder="Enter your email" />
 * <Input label="Password" type="password" showPasswordToggle />
 * <Input error="This field is required" />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    label,
    error,
    className = '',
    leftIcon,
    rightIcon,
    onRightIconClick,
    size = 'md',
    showPasswordToggle = false,
    type,
    ...props
  }: InputProps,
  ref: React.ForwardedRef<HTMLInputElement>
) {
  const generatedId = useId();
  const id = props.id || generatedId;
  const [showPassword, setShowPassword] = useState(false);

  // Normalize error: convert undefined to null for exactOptionalPropertyTypes compatibility
  const errorValue = error ?? null;

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
    <div className="w-full group">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-text mb-1.5 font-body transition-colors group-focus-within:text-primary"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
            <Icon name={leftIcon} size={16} />
          </div>
        )}
        <input
          ref={ref}
          id={id}
          type={inputType}
          className={cn(
            // Base styles with enhanced transitions
            'w-full border rounded-md transition-all-smooth font-body',
            'bg-background text-text placeholder:text-text-muted',
            // Focus styles - using Primary Purple with smooth glow transition
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]',
            // Size
            sizeClasses[size],
            iconPadding[size],
            rightIcon && !leftIcon && 'pr-10',
            isPassword && showPasswordToggle && 'pr-10',
            // Error state with shake animation class
            errorValue
              ? 'border-error focus:border-error focus:ring-error/30 animate-shake'
              : 'border-border hover:border-border-hover',
            // Disabled state
            props.disabled && 'opacity-50 cursor-not-allowed bg-surface',
            className
          )}
          {...props}
        />
        {rightIcon &&
          !(isPassword && showPasswordToggle) &&
          (onRightIconClick ? (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
              aria-label="Clear"
            >
              <Icon name={rightIcon} size={16} />
            </button>
          ) : (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted group-focus-within:text-primary transition-colors">
              <Icon name={rightIcon} size={16} />
            </div>
          ))}
        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors cursor-pointer"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} />
          </button>
        )}
      </div>
      {errorValue && (
        <p className="mt-1.5 text-sm text-error font-body animate-fade-in-down">{errorValue}</p>
      )}
    </div>
  );
});
