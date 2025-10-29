import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export default function Label({ children, className = '', ...props }: LabelProps) {
  return (
    <label className={`block text-sm font-medium text-text mb-1 ${className}`} {...props}>
      {children}
    </label>
  );
}
