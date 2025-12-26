import React from 'react';
import { PageTransition } from '@maatwork/ui';

export default function Template({ children }: { children: React.ReactNode }) {
  return <PageTransition variant="fade-up">{children}</PageTransition>;
}
