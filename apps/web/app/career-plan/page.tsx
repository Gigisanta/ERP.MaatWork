'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRequireAuth } from '../auth/useRequireAuth';
import {
  getCareerPlanLevels,
  createCareerPlanLevel,
  updateCareerPlanLevel,
  deleteCareerPlanLevel,
} from '@/lib/api/career-plan';
import type {
  CareerPlanLevel,
  CareerPlanLevelCreateRequest,
  CareerPlanLevelUpdateRequest,
} from '@/types';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Heading,
  Text,
  Stack,
  Input,
  DataTable,
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Alert,
  Spinner,
  Icon,
  type Column,
  Badge,
  Switch,
} from '@maatwork/ui';
import { ConfirmDialog } from '@maatwork/ui';
import { useToast } from '../../lib/hooks/useToast';
import { formatAnnualGoal, formatLevelPercentage } from '@/lib/utils/career-plan';
import { usePageTitle } from '../components/PageTitleContext';
import { logger, toLogContext } from '../../lib/logger';
import { isAdmin } from '@/lib/auth-helpers';

export default function PlanDeCarreraPage() {
  const { user, loading } = useRequireAuth();
  const { showToast } = useToast();

  usePageTitle('Plan de Carrera');

  const [levels, setLevels] = useState<CareerPlanLevel[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<CareerPlanLevel | null>(null);
  const [formData, setFormData] = useState<CareerPlanLevelCreateRequest>({
    category: '',
    level: '',
    levelNumber: 1,
    index: '1.0',
    percentage: '0',
    annualGoalUsd: 0,
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    onConfirm: () => void;
    variant?: 'danger' | 'default';
  }>({
    open: false,
    title: '',
    onConfirm: () => {},
  });

  const canEdit = isAdmin(user);

  // Cargar niveles para todos los usuarios (solo visualización)
  useEffect(() => {
    if (!loading && user) {
      void loadLevels();
    }
  }, [user, loading]);

  const loadLevels = async () => {
    try {
      setDataLoading(true);
      setError(null);
      const response = await getCareerPlanLevels();
      if (response.success && response.data) {
        setLevels(response.data);
      } else {
        setError('Error al cargar los niveles del plan de carrera');
      }
    } catch (err) {
      logger.error(toLogContext({ err }), 'Error loading career plan levels');
      setError('Error al cargar los niveles del plan de carrera');
    } finally {
      setDataLoading(false);
    }
  };

  const handleOpenCreate = () => {
    if (!canEdit) {
      showToast('Acceso denegado', 'Solo los administradores pueden crear niveles', 'error');
      return;
    }
    setEditingLevel(null);
    setFormData({
      category: '',
      level: '',
      levelNumber: levels.length > 0 ? Math.max(...levels.map((l) => l.levelNumber)) + 1 : 1,
      index: '1.0',
      percentage: '0',
      annualGoalUsd: 0,
      isActive: true,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleOpenEdit = (level: CareerPlanLevel) => {
    if (!canEdit) {
      showToast('Acceso denegado', 'Solo los administradores pueden editar niveles', 'error');
      return;
    }
    setEditingLevel(level);
    setFormData({
      category: level.category,
      level: level.level,
      levelNumber: level.levelNumber,
      index: level.index,
      percentage: level.percentage,
      annualGoalUsd: level.annualGoalUsd,
      isActive: level.isActive,
    });
    setFormErrors({});
    setShowFormModal(true);
  };

  const handleDelete = (level: CareerPlanLevel) => {
    if (!canEdit) {
      showToast('Acceso denegado', 'Solo los administradores pueden eliminar niveles', 'error');
      return;
    }
    setConfirmDialog({
      open: true,
      title: 'Eliminar nivel',
      description: `¿Estás seguro de que deseas eliminar el nivel "${level.level}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteCareerPlanLevel(level.id);
          showToast('Nivel eliminado', undefined, 'success');
          await loadLevels();
        } catch (_err) {
          showToast('Error', 'No se pudo eliminar el nivel', 'error');
        }
      },
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.category.trim()) {
      errors.category = 'La categoría es requerida';
    }
    if (!formData.level.trim()) {
      errors.level = 'El nivel es requerido';
    }
    if (formData.levelNumber < 1) {
      errors.levelNumber = 'El número de nivel debe ser mayor a 0';
    }
    if (!formData.index || parseFloat(formData.index.toString()) <= 0) {
      errors.index = 'El índice debe ser mayor a 0';
    }
    if (
      !formData.percentage ||
      parseFloat(formData.percentage.toString()) < 0 ||
      parseFloat(formData.percentage.toString()) > 100
    ) {
      errors.percentage = 'El porcentaje debe estar entre 0 y 100';
    }
    if (formData.annualGoalUsd < 0) {
      errors.annualGoalUsd = 'El objetivo anual debe ser mayor o igual a 0';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!canEdit) {
      showToast('Acceso denegado', 'Solo los administradores pueden modificar niveles', 'error');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSaving(true);
    try {
      if (editingLevel) {
        const updateData: CareerPlanLevelUpdateRequest = {
          category: formData.category,
          level: formData.level,
          levelNumber: formData.levelNumber,
          index: typeof formData.index === 'string' ? formData.index : formData.index.toString(),
          percentage:
            typeof formData.percentage === 'string'
              ? formData.percentage
              : formData.percentage.toString(),
          annualGoalUsd: formData.annualGoalUsd,
          ...(formData.isActive !== undefined && { isActive: formData.isActive }),
        };
        await updateCareerPlanLevel(editingLevel.id, updateData);
        showToast('Nivel actualizado', undefined, 'success');
      } else {
        await createCareerPlanLevel(formData);
        showToast('Nivel creado', undefined, 'success');
      }
      setShowFormModal(false);
      await loadLevels();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar el nivel';
      showToast('Error', errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<CareerPlanLevel>[] = useMemo(() => {
    const baseColumns: Column<CareerPlanLevel>[] = [
      {
        key: 'levelNumber',
        header: 'N°',
        sortable: true,
        width: '60px',
      },
      {
        key: 'category',
        header: 'Categoría',
        sortable: true,
      },
      {
        key: 'level',
        header: 'Nivel',
        sortable: true,
      },
      {
        key: 'index',
        header: 'Índice',
        sortable: true,
        render: (level) => <Text size="sm">{level.index}</Text>,
      },
      {
        key: 'percentage',
        header: 'Porcentaje',
        sortable: true,
        render: (level) => <Text size="sm">{formatLevelPercentage(level.percentage)}</Text>,
      },
      {
        key: 'annualGoalUsd',
        header: 'Objetivo Anual (USD)',
        sortable: true,
        render: (level) => <Text size="sm">{formatAnnualGoal(level.annualGoalUsd)}</Text>,
      },
      {
        key: 'isActive',
        header: 'Estado',
        render: (level) => (
          <Badge variant={level.isActive ? 'success' : 'error'}>
            {level.isActive ? 'Activo' : 'Inactivo'}
          </Badge>
        ),
      },
    ];

    // Solo agregar columna de acciones si el usuario es admin
    if (canEdit) {
      baseColumns.push({
        key: 'actions',
        header: 'Acciones',
        width: '120px',
        align: 'right',
        render: (level) => (
          <div className="flex gap-2 justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleOpenEdit(level)}
              className="px-2"
            >
              <Icon name="edit" size={14} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDelete(level)}
              className="px-2 text-error hover:bg-error/10 hover:border-error"
            >
              <Icon name="trash-2" size={14} />
            </Button>
          </div>
        ),
      });
    }

    return baseColumns;
  }, [levels, canEdit]);

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Stack direction="column" gap="md">
        <div className="flex justify-between items-start">
          <div>
            <Heading level={2}>Plan de Carrera Comercial</Heading>
            <Text size="sm" color="secondary">
              {canEdit
                ? 'Configura los niveles del plan de carrera por objetivos'
                : 'Visualiza los niveles del plan de carrera por objetivos'}
            </Text>
          </div>
          {canEdit && (
            <Button onClick={handleOpenCreate}>
              <Icon name="plus" size={16} className="mr-2" />
              Agregar Nivel
            </Button>
          )}
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Card>
          <CardHeader>
            <CardTitle>Niveles del Plan</CardTitle>
          </CardHeader>
          <CardContent>
            {dataLoading ? (
              <div className="flex justify-center py-8">
                <Spinner />
              </div>
            ) : levels.length === 0 ? (
              <div className="text-center py-8">
                <Text color="secondary">No hay niveles configurados</Text>
                {canEdit && (
                  <Button onClick={handleOpenCreate} className="mt-4">
                    Crear Primer Nivel
                  </Button>
                )}
              </div>
            ) : (
              <DataTable
                data={levels as unknown as Record<string, unknown>[]}
                columns={columns as unknown as Column<Record<string, unknown>>[]}
                keyField="id"
              />
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Modal de formulario */}
      <Modal
        open={showFormModal}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setShowFormModal(false);
            setEditingLevel(null);
            setFormErrors({});
          }
        }}
      >
        <ModalHeader>
          <ModalTitle>{editingLevel ? 'Editar Nivel' : 'Nuevo Nivel'}</ModalTitle>
          <ModalDescription>
            {editingLevel
              ? 'Modifica los datos del nivel del plan de carrera'
              : 'Completa los datos para crear un nuevo nivel'}
          </ModalDescription>
        </ModalHeader>
        <ModalContent>
          <Stack direction="column" gap="md">
            <Input
              label="Categoría"
              value={formData.category}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, category: e.target.value });
                setFormErrors({ ...formErrors, category: '' });
              }}
              placeholder="Ej: AGENTE F. JUNIOR"
              required
              error={formErrors.category}
            />

            <Input
              label="Nivel"
              value={formData.level}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, level: e.target.value });
                setFormErrors({ ...formErrors, level: '' });
              }}
              placeholder="Ej: Nivel 1 Junior"
              required
              error={formErrors.level}
            />

            <Input
              label="Número de Nivel"
              type="number"
              value={formData.levelNumber.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  setFormData({ ...formData, levelNumber: num });
                  setFormErrors({ ...formErrors, levelNumber: '' });
                }
              }}
              required
              min="1"
              error={formErrors.levelNumber}
            />

            <Input
              label="Índice"
              type="number"
              step="0.01"
              value={formData.index.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, index: e.target.value });
                setFormErrors({ ...formErrors, index: '' });
              }}
              placeholder="Ej: 1.5"
              required
              error={formErrors.index}
            />

            <Input
              label="Porcentaje"
              type="number"
              step="0.01"
              value={formData.percentage.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setFormData({ ...formData, percentage: e.target.value });
                setFormErrors({ ...formErrors, percentage: '' });
              }}
              placeholder="Ej: 37.5"
              required
              min="0"
              max="100"
              error={formErrors.percentage}
            />

            <Input
              label="Objetivo Anual (USD)"
              type="number"
              value={formData.annualGoalUsd.toString()}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const num = parseInt(e.target.value, 10);
                if (!isNaN(num)) {
                  setFormData({ ...formData, annualGoalUsd: num });
                  setFormErrors({ ...formErrors, annualGoalUsd: '' });
                }
              }}
              placeholder="Ej: 30000"
              required
              min="0"
              error={formErrors.annualGoalUsd}
            />

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.isActive ?? true}
                onCheckedChange={(checked: boolean) => {
                  setFormData({ ...formData, isActive: checked });
                }}
              />
              <Text size="sm">Activo</Text>
            </div>
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowFormModal(false);
              setEditingLevel(null);
              setFormErrors({});
            }}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Guardando...
              </>
            ) : editingLevel ? (
              'Actualizar'
            ) : (
              'Crear'
            )}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open: boolean) => setConfirmDialog((prev) => ({ ...prev, open }))}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant || 'default'}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />
    </div>
  );
}
