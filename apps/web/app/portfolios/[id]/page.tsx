"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Spinner,
  Alert,
  Toast,
  Badge,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  Input,
  Select,
  Breadcrumbs,
  BreadcrumbItem,
} from '@cactus/ui';
import ConfirmDialog from '../../components/ConfirmDialog';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getPortfolioById, addPortfolioLine, deletePortfolioLine } from '@/lib/api';
import { logger } from '../../../lib/logger';
import type { AddPortfolioLineRequest, PortfolioWithLines, PortfolioLine } from '@/types';

interface CreateLineData {
  targetType: string;
  assetClass?: string;
  instrumentId?: string;
  targetWeight: string;
}

export default function PortfolioDetailPage() {
  const { user, loading } = useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  
  const [portfolio, setPortfolio] = useState<PortfolioWithLines | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLineModal, setShowCreateLineModal] = useState(false);
  const [createLineData, setCreateLineData] = useState<{
    targetType: 'instrument' | 'assetClass';
    assetClass?: string;
    instrumentId?: string;
    targetWeight: string;
  }>({
    targetType: 'assetClass',
    targetWeight: '0'
  });
  const [isCreating, setIsCreating] = useState(false);

  // Estado para toast notifications
  const [toast, setToast] = useState<{
    show: boolean;
    title: string;
    description?: string;
    variant: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    title: '',
    variant: 'info'
  });

  // Estado para ConfirmDialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {}
  });

  const showToast = (title: string, description?: string, variant: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setToast({ 
      show: true, 
      title, 
      ...(description && { description }), 
      variant 
    });
  };

  // AI_DECISION: Usar getPortfolioById para obtener template completo con líneas
  // Justificación: Endpoint único que retorna toda la información necesaria
  // Impacto: Menos requests, mejor performance, datos consistentes
  const fetchPortfolio = async () => {
    if (!templateId) return;
    
    try {
      setDataLoading(true);
      setError(null);
      
      const response = await getPortfolioById(templateId);
      
      if (response.success && response.data) {
        setPortfolio(response.data);
      } else {
        const errorMessage = response.error || 'Error al cargar la cartera';
        if (errorMessage.includes('404') || errorMessage.includes('no encontrada')) {
          setError('Cartera no encontrada');
        } else {
          setError(errorMessage);
        }
      }
    } catch (err) {
      logger.error('Error fetching portfolio', { err, templateId });
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('Error de conexión. Por favor verifica tu conexión a internet.');
        } else {
          setError(err.message);
        }
      } else {
        setError('Error desconocido al cargar la cartera');
      }
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateLine = async () => {
    if (!templateId) return;

    try {
      setIsCreating(true);
      
      // Validar peso
      const weightPercent = parseFloat(createLineData.targetWeight);
      if (isNaN(weightPercent) || weightPercent <= 0 || weightPercent > 100) {
        showToast('Peso inválido', 'El peso debe estar entre 0 y 100%', 'warning');
        return;
      }

      // Convertir de porcentaje a decimal
      const weight = weightPercent / 100;

      // Validar que no exceda 100% total
      const currentTotal = portfolio?.totalWeight ? portfolio.totalWeight * 100 : 0;
      if (currentTotal + weightPercent > 100) {
        showToast('Peso excedido', `El peso total excedería 100%. Actual: ${currentTotal.toFixed(2)}%`, 'warning');
        return;
      }

      // Validar campos requeridos según tipo
      if (createLineData.targetType === 'assetClass' && !createLineData.assetClass) {
        showToast('Campo requerido', 'Debes seleccionar una clase de activo', 'warning');
        return;
      }

      if (createLineData.targetType === 'instrument' && !createLineData.instrumentId) {
        showToast('Campo requerido', 'Debes seleccionar un instrumento', 'warning');
        return;
      }

      const payload: AddPortfolioLineRequest = {
        targetType: createLineData.targetType,
        targetWeight: weight
      };

      if (createLineData.targetType === 'assetClass' && createLineData.assetClass) {
        payload.assetClass = createLineData.assetClass;
      } else if (createLineData.targetType === 'instrument' && createLineData.instrumentId) {
        payload.instrumentId = createLineData.instrumentId;
      }

      const response = await addPortfolioLine(templateId, payload);
      
      if (!response.success) {
        const errorMessage = response.error || 'Error al crear la línea';
        throw new Error(errorMessage);
      }
      
      // Recargar portfolio completo
      await fetchPortfolio();
      
      // Reset form y cerrar modal
      setCreateLineData({ targetType: 'assetClass', targetWeight: '0' });
      setShowCreateLineModal(false);
      showToast('Línea agregada', 'La línea se agregó exitosamente', 'success');
      
    } catch (err) {
      logger.error('Error creating template line', { err, templateId, data: createLineData });
      const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
      showToast('Error al crear línea', errorMessage, 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLine = (lineId: string) => {
    if (!templateId) return;
    
    setConfirmDialog({
      open: true,
      title: 'Eliminar línea',
      description: '¿Estás seguro de eliminar esta línea? Esta acción no se puede deshacer.',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const response = await deletePortfolioLine(templateId, lineId);

          if (!response.success) {
            const errorMessage = response.error || 'Error al eliminar la línea';
            throw new Error(errorMessage);
          }

          // Recargar portfolio completo
          await fetchPortfolio();
          
          showToast('Línea eliminada', 'La línea se eliminó exitosamente', 'success');
        } catch (err) {
          logger.error('Error deleting template line', { err, lineId, templateId });
          const errorMessage = err instanceof Error ? err.message : 'Error desconocido';
          showToast('Error al eliminar línea', errorMessage, 'error');
        }
      }
    });
  };

  useEffect(() => {
    if (templateId && !loading && user) {
      fetchPortfolio();
    }
  }, [templateId, loading, user]);

  if (loading || dataLoading) {
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
          <ArrowLeft className="w-4 h-4 mr-2" />
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
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Carteras
        </Button>
      </div>
    );
  }

  const breadcrumbItems: BreadcrumbItem[] = [
    { href: '/portfolios', label: 'Carteras' },
    { href: `/portfolios/${templateId}`, label: portfolio?.name || 'Cartera Modelo' }
  ];

  const getRiskLevelVariant = (riskLevel?: string | null) => {
    switch (riskLevel) {
      case 'conservative':
        return 'success';
      case 'moderate':
        return 'warning';
      case 'aggressive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getRiskLevelLabel = (riskLevel?: string | null) => {
    switch (riskLevel) {
      case 'conservative':
        return 'Conservador';
      case 'moderate':
        return 'Moderado';
      case 'aggressive':
        return 'Agresivo';
      default:
        return riskLevel || 'N/A';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumbs items={breadcrumbItems} />
      
      <div className="mt-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <Heading level={1} className="mb-2">
              {portfolio?.name || 'Cartera Modelo'}
            </Heading>
            {portfolio?.description && (
              <Text color="secondary" className="mb-2">
                {portfolio.description}
              </Text>
            )}
            {portfolio?.riskLevel && (
              <Badge variant={getRiskLevelVariant(portfolio.riskLevel)}>
                {getRiskLevelLabel(portfolio.riskLevel)}
              </Badge>
            )}
          </div>
          <Stack direction="row" gap="sm">
            <Button onClick={() => router.push('/portfolios')} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
            <Button onClick={() => setShowCreateLineModal(true)} variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Agregar Componente
            </Button>
          </Stack>
        </div>
      </div>

      {/* Modal para agregar línea */}
      <Modal open={showCreateLineModal} onOpenChange={setShowCreateLineModal}>
        <ModalHeader>
          <ModalTitle>Agregar Componente a la Cartera</ModalTitle>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="lg">
            <Select
              label="Tipo de Componente"
              value={createLineData.targetType}
              onValueChange={(value) => setCreateLineData(prev => ({ ...prev, targetType: value as 'instrument' | 'assetClass' }))}
              items={[
                { value: 'assetClass', label: 'Clase de Activo' },
                { value: 'instrument', label: 'Instrumento Específico' }
              ]}
            />

            {createLineData.targetType === 'assetClass' && (
              <Select
                label="Clase de Activo"
                value={createLineData.assetClass || ''}
                onValueChange={(value) => setCreateLineData(prev => ({ ...prev, assetClass: value }))}
                items={[
                  { value: 'equity', label: 'Acciones' },
                  { value: 'fixed_income', label: 'Renta Fija' },
                  { value: 'commodities', label: 'Commodities' },
                  { value: 'cash', label: 'Efectivo' },
                  { value: 'alternatives', label: 'Alternativas' }
                ]}
              />
            )}

            {createLineData.targetType === 'instrument' && (
              <Input
                label="ID del Instrumento"
                value={createLineData.instrumentId || ''}
                onChange={(e) => setCreateLineData(prev => ({ ...prev, instrumentId: e.target.value }))}
                placeholder="Ingresa el ID del instrumento"
              />
            )}

            <Input
              label="Peso Objetivo (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={createLineData.targetWeight}
              onChange={(e) => setCreateLineData(prev => ({ ...prev, targetWeight: e.target.value }))}
              placeholder="Ej: 25.5"
            />
            <Text size="sm" color="secondary">
              Peso actual: {portfolio ? (portfolio.totalWeight * 100).toFixed(2) : '0.00'}%
            </Text>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Stack direction="row" gap="sm">
            <Button onClick={() => setShowCreateLineModal(false)} variant="outline">
              Cancelar
            </Button>
            <Button onClick={handleCreateLine} disabled={isCreating} variant="primary">
              {isCreating ? 'Agregando...' : 'Agregar'}
            </Button>
          </Stack>
        </ModalFooter>
      </Modal>

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
                    color={portfolio.isValid ? 'primary' : 'secondary'}
                    className={portfolio.isValid ? '' : 'text-error'}
                  >
                    {(portfolio.totalWeight * 100).toFixed(2)}%
                  </Text>
                  <Text 
                    size="xs" 
                    color={portfolio.isValid ? 'primary' : 'secondary'}
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
                      {portfolio.lines.map((line: PortfolioLine) => (
                        <tr key={line.id} className="border-b border-border">
                          <td className="p-3">
                            <Badge 
                              variant={line.targetType === 'assetClass' ? 'default' : 'success'}
                            >
                              {line.targetType === 'assetClass' ? 'Clase' : 'Instrumento'}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div>
                              <Text weight="medium">
                                {line.targetType === 'assetClass' ? line.assetClassName : line.instrumentName}
                              </Text>
                              {line.targetType === 'instrument' && line.instrumentSymbol && (
                                <Text size="sm" color="secondary">
                                  {line.instrumentSymbol}
                                </Text>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <Badge variant="default">
                              {(Number(line.targetWeight) * 100).toFixed(2)}%
                            </Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              onClick={() => handleDeleteLine(line.id)}
                              variant="ghost"
                              size="sm"
                              className="text-error-500 hover:text-error-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
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
        onOpenChange={(open: boolean) => setToast(prev => ({ ...prev, show: open }))}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, open }))}
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
