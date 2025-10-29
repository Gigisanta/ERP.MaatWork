import { ReactNode } from 'react';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Panel de Administración</h1>
      <div>{children}</div>
    </section>
  );
}


