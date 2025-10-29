import React from 'react';
import { cn } from '../utils/cn';

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface User {
  name: string;
  email: string;
  role: string;
}

export interface HeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, 'children'> {
  children?: React.ReactNode;
  className?: string;
  logo?: React.ReactNode;
  navItems?: NavItem[];
  user?: User;
  onLogout?: () => void;
}

export function Header({ 
  className, 
  children, 
  logo,
  navItems,
  user,
  onLogout,
  ...props 
}: HeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
        className
      )}
      {...props}
    >
      {children}
    </header>
  );
}

