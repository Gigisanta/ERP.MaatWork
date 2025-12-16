'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Stack,
  Input,
  Text,
  Label,
  Alert,
} from '@cactus/ui';
import { Plus, Trash2 } from 'lucide-react';
import type { CalendarEvent, CreateEventRequest } from '@/types/calendar';

interface CalendarEventFormProps {
  initialData?: Partial<CalendarEvent> | undefined;
  initialStartDate?: Date | undefined;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEventRequest) => Promise<void>;
  isSubmitting: boolean;
  error?: string | null;
}

export function CalendarEventForm({
  initialData,
  initialStartDate,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  error,
}: CalendarEventFormProps) {
  // Helpers for date formatting
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const formatTime = (date: Date) => date.toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: '',
  });

  const [attendees, setAttendees] = useState<{ email: string }[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const start = initialData.start?.dateTime
          ? new Date(initialData.start.dateTime)
          : new Date();
        const end = initialData.end?.dateTime
          ? new Date(initialData.end.dateTime)
          : new Date(start.getTime() + 60 * 60 * 1000);

        setFormData({
          summary: initialData.summary || '',
          description: initialData.description || '',
          startDate: formatDate(start),
          startTime: formatTime(start),
          endDate: formatDate(end),
          endTime: formatTime(end),
          location: initialData.location || '',
        });
        setAttendees(initialData.attendees?.map((a) => ({ email: a.email })) || []);
      } else {
        const start = initialStartDate || new Date();
        if (!initialStartDate) {
          start.setMinutes(0, 0, 0);
          start.setHours(start.getHours() + 1);
        }
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        setFormData({
          summary: '',
          description: '',
          startDate: formatDate(start),
          startTime: formatTime(start),
          endDate: formatDate(end),
          endTime: formatTime(end),
          location: '',
        });
        setAttendees([]);
      }
      setValidationError(null);
    }
  }, [isOpen, initialData, initialStartDate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleAttendeeChange = (index: number, value: string) => {
    const newAttendees = [...attendees];
    newAttendees[index].email = value;
    setAttendees(newAttendees);
  };

  const addAttendee = () => {
    setAttendees([...attendees, { email: '' }]);
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!formData.summary) {
      setValidationError('El título es requerido');
      return;
    }
    if (!formData.startDate || !formData.startTime) {
      setValidationError('Fecha y hora de inicio requeridas');
      return;
    }
    if (!formData.endDate || !formData.endTime) {
      setValidationError('Fecha y hora de fin requeridas');
      return;
    }

    const startDateTime = new Date(`${formData.startDate}T${formData.startTime}:00`);
    const endDateTime = new Date(`${formData.endDate}T${formData.endTime}:00`);

    if (endDateTime <= startDateTime) {
      setValidationError('La fecha de fin debe ser posterior a la de inicio');
      return;
    }

    const requestData: CreateEventRequest = {
      summary: formData.summary,
      start: {
        dateTime: startDateTime.toISOString(),
      },
      end: {
        dateTime: endDateTime.toISOString(),
      },
      // Conditionally add optional fields to satisfy exactOptionalPropertyTypes
      ...(formData.description ? { description: formData.description } : {}),
      ...(formData.location ? { location: formData.location } : {}),
      ...(attendees.some((a) => a.email) ? { attendees: attendees.filter((a) => a.email) } : {}),
    };

    await onSubmit(requestData);
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <ModalHeader>
            <ModalTitle>{initialData ? 'Editar Evento' : 'Nuevo Evento'}</ModalTitle>
          </ModalHeader>

          <div className="p-6 space-y-4">
            {(error || validationError) && (
              <Alert variant="error">
                <Text>{error || validationError}</Text>
              </Alert>
            )}

            {/* Title */}
            <Stack direction="column" gap="xs">
              <Label htmlFor="summary">Título</Label>
              <Input
                id="summary"
                placeholder="Añade un título"
                value={formData.summary}
                onChange={handleChange}
              />
            </Stack>

            {/* Date and Time */}
            <div className="grid grid-cols-2 gap-4">
              <Stack direction="column" gap="xs">
                <Label>Inicio</Label>
                <div className="flex gap-2">
                  <Input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={handleChange}
                    className="w-24"
                  />
                </div>
              </Stack>
              <Stack direction="column" gap="xs">
                <Label>Fin</Label>
                <div className="flex gap-2">
                  <Input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="flex-1"
                  />
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={handleChange}
                    className="w-24"
                  />
                </div>
              </Stack>
            </div>

            {/* Location */}
            <Stack direction="column" gap="xs">
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                placeholder="Añade una ubicación"
                value={formData.location}
                onChange={handleChange}
              />
            </Stack>

            {/* Description - using textarea with style */}
            <Stack direction="column" gap="xs">
              <Label htmlFor="description">Descripción</Label>
              <textarea
                id="description"
                placeholder="Añade una descripción"
                rows={3}
                value={formData.description}
                onChange={handleChange}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </Stack>

            {/* Attendees */}
            <Stack direction="column" gap="xs">
              <Label>Invitados</Label>
              <Stack direction="column" gap="sm">
                {attendees.map((attendee, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="email@ejemplo.com"
                      value={attendee.email}
                      onChange={(e) => handleAttendeeChange(index, e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAttendee(index)}
                      aria-label="Eliminar invitado"
                    >
                      <Trash2 className="w-4 h-4 text-error" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={addAttendee}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Añadir invitados
                </Button>
              </Stack>
            </Stack>
          </div>

          <ModalFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
