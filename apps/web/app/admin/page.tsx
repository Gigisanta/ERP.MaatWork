import Link from 'next/link';

export default function AdminHubPage() {
  const cards = [
    {
      title: 'Usuarios y cuentas',
      description: 'Administra usuarios, roles, permisos y cuentas del sistema.',
      href: '/admin/users',
      icon: '👥'
    },
    {
      title: 'AUM y Brokers',
      description: 'Sincroniza y normaliza datos reales de brokers con el CRM.',
      href: '/admin/aum',
      icon: '📊'
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text">Panel de Administración</h1>
        <p className="text-sm text-text-secondary">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block group">
            <div className="h-full rounded-lg border border-border bg-surface p-5 shadow-sm transition-all group-hover:shadow-md group-hover:border-primary/30">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl" aria-hidden>{c.icon}</span>
                <h2 className="text-lg font-medium text-text">{c.title}</h2>
              </div>
              <p className="text-sm text-text-secondary">{c.description}</p>
              <div className="mt-4 text-sm text-primary">Ir →</div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
