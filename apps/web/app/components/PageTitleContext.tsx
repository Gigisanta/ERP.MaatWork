"use client";
import React, { createContext, useContext, useState, type ReactNode } from 'react';

interface PageTitleContextType {
  pageTitle: string | null;
  setPageTitle: (title: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export function PageTitleProvider({ children }: { children: ReactNode }) {
  const [pageTitle, setPageTitle] = useState<string | null>(null);

  return (
    <PageTitleContext.Provider value={{ pageTitle, setPageTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

export function usePageTitle(title: string | null) {
  const context = useContext(PageTitleContext);

  React.useEffect(() => {
    if (context) {
      context.setPageTitle(title);
      // Cleanup: reset title when component unmounts
      return () => {
        context.setPageTitle(null);
      };
    }
  }, [title, context]);
}

export function usePageTitleContext() {
  const context = useContext(PageTitleContext);
  if (context === undefined) {
    throw new Error('usePageTitleContext must be used within a PageTitleProvider');
  }
  return context;
}

