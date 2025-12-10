import React from 'react';
import { PageTransition } from './components/PageTransition';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <PageTransition variant="fade-up">
      {children}
    </PageTransition>
  );
}
