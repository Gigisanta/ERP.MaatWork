'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Spinner,
  Alert,
  Toast,
  Breadcrumbs,
  BreadcrumbItem,
} from '@maatwork/ui';
import { ConfirmDialog } from '@maatwork/ui';
import PortfolioLineRow from './components/PortfolioLineRow';
import { PortfolioLineForm } from './components/PortfolioLineForm';
import { PortfolioHeader } from './components/PortfolioHeader';
import { Plus } from 'lucide-react';
import { usePortfolioData } from './hooks/usePortfolioData';
import { usePortfolioLineActions } from './hooks/usePortfolioLineActions';

export default function PortfolioDetailPage() {
  const { user, loading: authLoading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [showCreateLineModal, setShowCreateLineModal] = useState(false);

  const {
    portfolio,
    loading: dataLoading,
    error,
    refetch,
  } = usePortfolioData(templateId, !authLoading && !!user);

  const {
    isCreating,
    toast,
    setToast,
    confirmDialog,
    setConfirmDialog,
    handleCreateLine,
    handleDeleteLine,
  } = usePortfolioLineActions(templateId, portfolio?.totalWeight ?? 0, refetch);

  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] p-8">
        <Stack direction="column" gap="md" align="center">
          <Spinner size="lg" />
          <Text color="secondary">Cargando cartera...</Text>
        </Stack>
      </div>
    );
  }

  // Solo admin y managers pueden gestionar carteras
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <div className="p-8">
        <Alert variant="error" title="Acceso denegado">
          No tienes permisos para gestionar carteras modelo.
        </Alert>
        <Button onClick={() => router.push('/portfolios')} variant="outline" className="mt-4">
          Volver a Carteras
        </Button>
      </div>
    );
  }

  if (error && !portfolio) {
    return (
      <div className="p-8">
        <Alert variant="error" title="Error">
          {error}
        </Alert>
        <Button onClick={() => router.push('/portfolios')} variant="outline" className="mt-4">
          Volver a Carteras
        </Button>
      </div>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: '/portfolios', label: 'Carteras' },
    { href: `/portfolios/${templateId}`, label: portfolio?.name || 'Cartera Modelo' },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />

      <PortfolioHeader portfolio={portfolio} onAddLine={() => setShowCreateLineModal(true)} />

      {/* Modal para agregar línea */}
      <PortfolioLineForm
        open={showCreateLineModal}
        onOpenChange={setShowCreateLineModal}
        onSubmit={handleCreateLine}
        isSubmitting={isCreating}
        currentTotalWeight={portfolio?.totalWeight ?? 0}
      />

      {error && portfolio && (
        <Alert variant="warning" title="Advertencia" className="mb-4">
          {error}
        </Alert>
      )}

      {portfolio && (
        <>
          {/* Resumen de la cartera */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Composición de la Cartera</CardTitle>
                  <Text color="secondary" size="sm" className="mt-1">
                    {portfolio.lines?.length || 0} componentes
                  </Text>
                </div>
                <div className="text-right">
                  <Text
                    size="xl"
                    weight="bold"
                    color={portfolio.isValid ? 'default' : 'secondary'}
                    className={portfolio.isValid ? '' : 'text-error'}
                  >
                    {(portfolio.totalWeight * 100).toFixed(2)}%
                  </Text>
                  <Text
                    size="xs"
                    color={portfolio.isValid ? 'default' : 'secondary'}
                    weight="medium"
                    className={portfolio.isValid ? '' : 'text-error'}
                  >
                    {portfolio.isValid ? 'Composición válida' : 'Peso no suma 100%'}
                  </Text>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {portfolio.lines && portfolio.lines.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="p-3 text-left font-semibold">Tipo</th>
                        <th className="p-3 text-left font-semibold">Componente</th>
                        <th className="p-3 text-right font-semibold">Peso</th>
                        <th className="p-3 text-center font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portfolio.lines.map((line) => (
                        <PortfolioLineRow key={line.id} line={line} onDelete={handleDeleteLine} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Text color="secondary">No hay componentes en esta cartera</Text>
                  <Button
                    onClick={() => setShowCreateLineModal(true)}
                    variant="primary"
                    className="mt-4"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Primer Componente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Toast Notifications */}
      <Toast
        title={toast.title}
        {...(toast.description && { description: toast.description })}
        variant={toast.variant}
        open={toast.show}
        onOpenChange={(open: boolean) => setToast((prev) => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
