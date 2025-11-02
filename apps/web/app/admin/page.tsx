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
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Panel de Administración</h1>
        <p className="text-sm text-gray-600">Selecciona un módulo para continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="block group">
            <div className="h-full rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-all group-hover:shadow-md group-hover:border-gray-300">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl" aria-hidden>{c.icon}</span>
                <h2 className="text-lg font-medium text-gray-900">{c.title}</h2>
              </div>
              <p className="text-sm text-gray-600">{c.description}</p>
              <div className="mt-4 text-sm text-indigo-600">Ir →</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}






