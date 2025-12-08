'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark'; // The actual theme being applied (resolved from 'system' if needed)
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderWrapperProps {
  children: React.ReactNode;
  defaultTheme?: string;
}

// AI_DECISION: Add 'system' as explicit theme option
// Justificación: Users should be able to explicitly choose "automático" mode instead of it being implicit
// Impacto: Theme can now be 'system' which follows OS preference, or 'light'/'dark' for fixed themes

export default function ThemeProviderWrapper({
  children,
  defaultTheme,
}: ThemeProviderWrapperProps) {
  // Use a temporary initial state, will be set correctly in useEffect
  const [theme, setThemeState] = useState<Theme>('light');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Helper to get system preference
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // Helper to apply theme to DOM
  const applyThemeToDOM = useCallback((themeToApply: 'light' | 'dark') => {
    if (typeof window === 'undefined') return;
    document.documentElement.setAttribute('data-theme', themeToApply);
    // AI_DECISION: Add both data-theme attribute AND .dark class for CSS compatibility
    // Justificación: CSS uses .dark class selector, while ThemeProvider used data-theme attribute
    // Impacto: Dark mode styles now properly apply with both selectors
    if (themeToApply === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cactus-theme', newTheme);

      // Resolve theme: if 'system', use system preference, otherwise use the theme directly
      const themeToApply = newTheme === 'system' ? getSystemTheme() : newTheme;
      setResolvedTheme(themeToApply);
      applyThemeToDOM(themeToApply);
    }
  };

  const toggleTheme = () => {
    // Toggle between light and dark (skip system)
    const newTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'light' : 'light';
    setTheme(newTheme);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const savedThemeRaw = localStorage.getItem('cactus-theme');

    // Determine initial theme: use saved theme, or defaultTheme/system if nothing saved
    // If saved theme is 'high-contrast' (old value), treat as 'light' for compatibility
    let initialTheme: Theme;
    if (savedThemeRaw === 'high-contrast') {
      // Migrate old 'high-contrast' to 'light'
      initialTheme = 'light';
      localStorage.setItem('cactus-theme', 'light');
    } else if (
      savedThemeRaw &&
      (savedThemeRaw === 'light' || savedThemeRaw === 'dark' || savedThemeRaw === 'system')
    ) {
      initialTheme = savedThemeRaw as Theme;
    } else {
      // No saved theme: use defaultTheme if provided and valid, otherwise default to 'system'
      if (
        defaultTheme !== undefined &&
        (defaultTheme === 'light' || defaultTheme === 'dark' || defaultTheme === 'system')
      ) {
        initialTheme = defaultTheme as Theme;
      } else {
        // Default to 'system' to follow OS preference when no defaultTheme is provided
        initialTheme = 'system';
      }
    }

    setThemeState(initialTheme);

    // Resolve the actual theme to apply
    const themeToApply = initialTheme === 'system' ? getSystemTheme() : initialTheme;
    setResolvedTheme(themeToApply);
    applyThemeToDOM(themeToApply);

    // Only listen to system preference changes if theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      const currentSavedTheme = localStorage.getItem('cactus-theme') as Theme | null;
      // Only react to system changes if current theme is 'system'
      if (currentSavedTheme === 'system') {
        const newResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newResolvedTheme);
        applyThemeToDOM(newResolvedTheme);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [getSystemTheme, applyThemeToDOM, defaultTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProviderWrapper');
  }
  return context;
}
