'use client';

import { useState, useEffect } from 'react';
import type { Capacitacion, CreateCapacitacionRequest } from '@/types';
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  Button,
  Input,
  Stack,
  Alert,
} from '@cactus/ui';

interface CapacitacionFormProps {
  capacitacion?: Capacitacion | undefined;
  onClose: () => void;
  onSubmit: (data: CreateCapacitacionRequest) => Promise<void>;
}

export default function CapacitacionForm({
  capacitacion,
  onClose,
  onSubmit,
}: CapacitacionFormProps) {
  const [formData, setFormData] = useState<CreateCapacitacionRequest>({
    titulo: '',
    tema: '',
    link: '',
    fecha: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (capacitacion) {
      setFormData({
        titulo: capacitacion.titulo,
        tema: capacitacion.tema,
        link: capacitacion.link,
        fecha: capacitacion.fecha ? capacitacion.fecha.split('T')[0] : null,
      });
    }
  }, [capacitacion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validación básica
    if (!formData.titulo.trim()) {
      setError('El título es requerido');
      return;
    }
    if (!formData.tema.trim()) {
      setError('El tema es requerido');
      return;
    }
    if (!formData.link.trim()) {
      setError('El link es requerido');
      return;
    }

    // Validar URL
    try {
      new URL(formData.link);
    } catch {
      setError('El link debe ser una URL válida');
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar la capacitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onOpenChange={onClose}>
      <ModalHeader>
        <ModalTitle>{capacitacion ? 'Editar capacitación' : 'Nueva capacitación'}</ModalTitle>
        <ModalDescription>
          {capacitacion
            ? 'Modifica los datos de la capacitación'
            : 'Completa los datos para crear una nueva capacitación'}
        </ModalDescription>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalContent>
          <Stack direction="column" gap="md">
            {error && <Alert variant="error">{error}</Alert>}

            <Input
              label="Título"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Vender por telefono - Bryan Tracy"
              required
            />

            <Input
              label="Tema"
              value={formData.tema}
              onChange={(e) => setFormData({ ...formData, tema: e.target.value })}
              placeholder="Ej: Podcast, Libros, TED, Administración..."
              required
            />

            <Input
              label="Link"
              type="url"
              value={formData.link}
              onChange={(e) => setFormData({ ...formData, link: e.target.value })}
              placeholder="https://..."
              required
            />

            <Input
              label="Fecha (opcional)"
              type="date"
              value={formData.fecha || ''}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value || null })}
            />
          </Stack>
        </ModalContent>
        <ModalFooter>
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : capacitacion ? 'Actualizar' : 'Crear'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
