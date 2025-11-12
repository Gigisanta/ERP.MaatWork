import Link from 'next/link';
import { Button, Text } from '@cactus/ui';

export default function AumComisionesPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AUM - Comisiones</h2>
          <p className="text-sm text-gray-600">Gestiona y normaliza datos de comisiones por operaciones</p>
        </div>
        <Link href="/admin/aum">
          <Button variant="outline" size="sm">
            ← Volver al hub
          </Button>
        </Link>
      </div>

      {/* Placeholder content */}
      <div className="border rounded-lg p-8 text-center">
        <Text size="lg" className="text-text-secondary mb-2">
          Esta sección está en desarrollo
        </Text>
        <Text size="sm" className="text-text-muted">
          Próximamente podrás gestionar y normalizar datos de comisiones por operaciones de brokers.
        </Text>
      </div>
    </div>
  );
}










