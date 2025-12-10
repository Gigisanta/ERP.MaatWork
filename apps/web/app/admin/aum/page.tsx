import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@cactus/ui';

export default function AumHubPage() {
  const sections = [
    {
      title: 'AUM - Comisiones',
      description: 'Gestiona y normaliza datos de comisiones por operaciones de brokers.',
      href: '/admin/aum/comisiones',
      icon: '💰',
    },
    {
      title: 'AUM - Filas y Cuentas',
      description: 'Normalización y sincronización de cuentas comitentes con el CRM.',
      href: '/admin/aum/rows',
      icon: '📊',
    },
  ];

  return (
    <section className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">AUM y Brokers</h1>
        <p className="text-sm text-gray-600">Selecciona una sección para continuar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="block group">
            <Card variant="interactive" padding="lg" className="h-full">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl" aria-hidden>
                    {section.icon}
                  </span>
                  <CardTitle>{section.title}</CardTitle>
                </div>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mt-4 text-sm text-primary">Ir a {section.title} →</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
