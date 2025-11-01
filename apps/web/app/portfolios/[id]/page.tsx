"use client";
import { useRequireAuth } from '../../auth/useRequireAuth';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  DataTable,
  type Column,
} from '@cactus/ui';
import ConfirmDialog from '../components/ConfirmDialog';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { getPortfolioLines, addPortfolioLine, deletePortfolioLine } from '@/lib/api';
import { logger } from '../../../lib/logger';
import type { AddPortfolioLineRequest } from '@/types';

interface PortfolioTemplate {
  id: string;
  name: string;
  description?: string;
  riskLevel?: string;
  createdAt: string;
}

interface TemplateLine {
  id: string;
  targetType: string;
  assetClass?: string | null;
  instrumentId?: string | null;
  targetWeight: number;
  instrumentName?: string;
  instrumentSymbol?: string;
  assetClassName?: string;
}

interface TemplateData {
  lines: TemplateLine[];
  totalWeight: number;
  isValid: boolean;
}

interface CreateLineData {
  targetType: string;
  assetClass?: string;
  instrumentId?: string;
  targetWeight: string;
}

export default function PortfolioDetailPage() {
  const { user, token, loading } = useRequireAuth();
  const params = useParams();
  const templateId = params.id as string;
  
  const [template, setTemplate] = useState<PortfolioTemplate | null>(null);
  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateLineModal, setShowCreateLineModal] = useState(false);
  const [createLineData, setCreateLineData] = useState<CreateLineData>({
    targetType: 'asset_class',
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

  // AI_DECISION: Usar cliente API centralizado en lugar de fetch directo
  // Justificación: Retry automático, refresh token, timeout configurable, error handling consistente
  // Impacto: Mejor resiliencia y mantenibilidad
  const fetchTemplate = async () => {
    if (!token || !templateId) return;
    
    try {
      setDataLoading(true);
      
      const response = await getPortfolioLines(templateId);
      
      if (response.success && response.data) {
        const lines = response.data.lines;
        const totalWeight = lines.reduce((sum, line) => sum + line.targetWeight, 0);
        const isValid = Math.abs(totalWeight - 1.0) < 0.01;
        setTemplateData({ lines, totalWeight, isValid });
      } else {
        throw new Error('Failed to fetch portfolio template');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDataLoading(false);
    }
  };

  const handleCreateLine = async () => {
    if (!token || !templateId) return;

    try {
      setIsCreating(true);
      
      const weight = parseFloat(createLineData.targetWeight);
      if (isNaN(weight) || weight <= 0 || weight > 1) {
        throw new Error('El peso debe estar entre 0 y 1');
      }

      const payload: AddPortfolioLineRequest = {
        targetType: createLineData.targetType as 'instrument' | 'assetClass',
        targetWeight: weight
      };

      if (createLineData.targetType === 'asset_class' && createLineData.assetClass) {
        payload.assetClass = createLineData.assetClass;
      } else if (createLineData.targetType === 'instrument' && createLineData.instrumentId) {
        payload.instrumentId = createLineData.instrumentId;
      }

      const response = await addPortfolioLine(templateId, payload);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to create template line');
      }
      
      // Actualizar la lista de líneas
      await fetchTemplate();
      
      // Reset form y cerrar modal
      setCreateLineData({ targetType: 'asset_class', targetWeight: '0' });
      setShowCreateLineModal(false);
      
    } catch (err) {
      const payload: AddPortfolioLineRequest = {
        targetType: createLineData.targetType as 'instrument' | 'assetClass',
        targetWeight: parseFloat(createLineData.targetWeight)
      };
      if (createLineData.targetType === 'asset_class' && createLineData.assetClass) {
        payload.assetClass = createLineData.assetClass;
      } else if (createLineData.targetType === 'instrument' && createLineData.instrumentId) {
        payload.instrumentId = createLineData.instrumentId;
      }
      logger.error('Error creating template line', { err, templateId, payload });
      showToast('Error al crear línea', err instanceof Error ? err.message : 'Error desconocido', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteLine = (lineId: string) => {
    if (!token || !templateId) return;
    
    setConfirmDialog({
      open: true,
      title: 'Eliminar línea',
      description: '¿Estás seguro de eliminar esta línea?',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePortfolioLine(templateId, lineId);

          // Actualizar la lista de líneas
          await fetchTemplate();
          
          showToast('Línea eliminada', 'La línea se eliminó exitosamente', 'success');
        } catch (err) {
          logger.error('Error deleting template line', { err, lineId, templateId });
          showToast('Error al eliminar línea', err instanceof Error ? err.message : 'Error desconocido', 'error');
        }
      }
    });
  };

  useEffect(() => {
    if (token) {
      fetchTemplate();
    }
  }, [token, templateId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  // Solo admin y managers pueden gestionar carteras
  if (user?.role !== 'admin' && user?.role !== 'manager') {
    return (
      <main style={{ padding: 16 }}>
        <p>No tienes permisos para gestionar carteras modelo.</p>
        <Link href="/" style={{ color: '#3b82f6' }}>← Volver al inicio</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: 16, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, fontWeight: 'bold', marginBottom: 8 }}>
          {template?.name || 'Cartera Modelo'}
        </h1>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link href="/portfolios" style={{ color: '#3b82f6' }}>← Volver a Carteras</Link>
          <span style={{ color: '#6b7280' }}>|</span>
          <button
            onClick={() => setShowCreateLineModal(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            + Agregar Componente
          </button>
        </div>
      </div>

      {/* Modal para agregar línea */}
      {showCreateLineModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: 24,
            borderRadius: 12,
            width: '100%',
            maxWidth: 500,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
              Agregar Componente a la Cartera
            </h3>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Tipo de Componente
              </label>
              <select
                value={createLineData.targetType}
                onChange={(e) => setCreateLineData(prev => ({ ...prev, targetType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontSize: 14
                }}
              >
                <option value="asset_class">Clase de Activo</option>
                <option value="instrument">Instrumento Específico</option>
              </select>
            </div>

            {createLineData.targetType === 'asset_class' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                  Clase de Activo
                </label>
                <select
                  value={createLineData.assetClass || ''}
                  onChange={(e) => setCreateLineData(prev => ({ ...prev, assetClass: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    backgroundColor: '#ffffff',
                    color: '#111827',
                    fontSize: 14
                  }}
                >
                  <option value="">Seleccionar clase...</option>
                  <option value="equity">Acciones</option>
                  <option value="fixed_income">Renta Fija</option>
                  <option value="commodities">Commodities</option>
                  <option value="cash">Efectivo</option>
                  <option value="alternatives">Alternativas</option>
                </select>
              </div>
            )}

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                Peso Objetivo (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={createLineData.targetWeight}
                onChange={(e) => setCreateLineData(prev => ({ ...prev, targetWeight: e.target.value }))}
                placeholder="Ej: 25.5"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 6,
                  border: '1px solid #d1d5db',
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  fontSize: 14
                }}
              />
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                Peso actual: {((templateData?.totalWeight || 0) * 100).toFixed(2)}%
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateLineModal(false)}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateLine}
                disabled={isCreating}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isCreating ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 14,
                  cursor: isCreating ? 'not-allowed' : 'pointer'
                }}
              >
                {isCreating ? 'Agregando...' : 'Agregar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p>Cargando composición de la cartera...</p>}
      {error && <p style={{ color: '#ef4444' }}>Error: {error}</p>}

      {!loading && !error && templateData && (
        <>
          {/* Resumen de la cartera */}
          <div style={{
            marginBottom: 24,
            padding: 16,
            backgroundColor: '#f8fafc',
            borderRadius: 8,
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                  Composición de la Cartera
                </h3>
                <p style={{ fontSize: 14, color: '#6b7280' }}>
                  {templateData.lines.length} componentes
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 24,
                  fontWeight: 'bold',
                  color: templateData.isValid ? '#10b981' : '#ef4444'
                }}>
                  {((templateData.totalWeight) * 100).toFixed(2)}%
                </div>
                <div style={{
                  fontSize: 12,
                  color: templateData.isValid ? '#10b981' : '#ef4444',
                  fontWeight: 500
                }}>
                  {templateData.isValid ? 'Composición válida' : 'Peso no suma 100%'}
                </div>
              </div>
            </div>
          </div>

          {/* Tabla de componentes */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: 8
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Tipo</th>
                  <th style={{ padding: 12, textAlign: 'left', fontWeight: 600 }}>Componente</th>
                  <th style={{ padding: 12, textAlign: 'right', fontWeight: 600 }}>Peso</th>
                  <th style={{ padding: 12, textAlign: 'center', fontWeight: 600 }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {templateData.lines.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: 24, textAlign: 'center', color: '#6b7280' }}>
                      No hay componentes en esta cartera
                    </td>
                  </tr>
                ) : (
                  templateData.lines.map((line) => (
                    <tr key={line.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: 12 }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 500,
                          backgroundColor: line.targetType === 'asset_class' ? '#dbeafe' : '#dcfce7',
                          color: line.targetType === 'asset_class' ? '#1e40af' : '#166534'
                        }}>
                          {line.targetType === 'asset_class' ? 'Clase' : 'Instrumento'}
                        </span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <div>
                          <div style={{ fontWeight: 500, marginBottom: 2 }}>
                            {line.targetType === 'asset_class' ? line.assetClassName : line.instrumentName}
                          </div>
                          {line.targetType === 'instrument' && line.instrumentSymbol && (
                            <div style={{ fontSize: 12, color: '#6b7280' }}>
                              {line.instrumentSymbol}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: 12, textAlign: 'right' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 6,
                          fontSize: 14,
                          fontWeight: 600,
                          backgroundColor: '#f3f4f6',
                          color: '#374151'
                        }}>
                          {(Number(line.targetWeight) * 100).toFixed(2)}%
                        </span>
                      </td>
                      <td style={{ padding: 12, textAlign: 'center' }}>
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: 4,
                            fontSize: 12,
                            cursor: 'pointer'
                          }}
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
    </main>
  );
}
