import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <section className="p-6">{children}</section>;
}
