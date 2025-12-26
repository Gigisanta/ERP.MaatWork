'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({
  children,
  defaultCollapsed = false,
}: {
  children: ReactNode;
  defaultCollapsed?: boolean;
}) {
  // Default to expanded (false)
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        if (saved === 'true') {
          setCollapsed(true);
        } else if (saved === 'false') {
          setCollapsed(false);
        } else if (saved !== 'undefined' && saved !== 'null') {
          try {
            const parsed = JSON.parse(saved);
            if (typeof parsed === 'boolean') {
              setCollapsed(parsed);
            }
          } catch (e) {
            console.warn('[SidebarContext] Error parsing sidebar-collapsed:', e);
            localStorage.removeItem('sidebar-collapsed');
          }
        }
      }
    }
  }, []);

  // Save to localStorage when collapsed changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', JSON.stringify(collapsed));
    }
  }, [collapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
