'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Input,
  Text,
  Label,
  Alert,
} from '@maatwork/ui';
import {
  Plus,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Users,
  AlignLeft,
  MapPin,
} from 'lucide-react';
import type { CalendarEvent, CreateEventRequest } from '@/types';

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
        setAttendees(
          initialData.attendees?.map((a: { email: string }) => ({ email: a.email })) || []
        );
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
      ...(formData.description ? { description: formData.description } : {}),
      ...(formData.location ? { location: formData.location } : {}),
      ...(attendees.some((a) => a.email) ? { attendees: attendees.filter((a) => a.email) } : {}),
    };

    await onSubmit(requestData);
  };

  return (
    <Modal open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <ModalContent className="max-w-lg p-0 overflow-hidden sm:rounded-xl">
        <form onSubmit={handleSubmit} className="flex flex-col w-full h-full sm:h-auto">
          <ModalHeader className="px-6 py-4 border-b border-border/40 bg-background sticky top-0 z-40">
            <ModalTitle>{initialData ? 'Editar evento' : 'Nuevo evento'}</ModalTitle>
          </ModalHeader>

          <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[70vh]">
            {(error || validationError) && (
              <Alert
                variant="error"
                className="py-2 px-3 rounded-lg animate-in slide-in-from-top-2"
              >
                <Text size="sm" weight="medium">
                  {error || validationError}
                </Text>
              </Alert>
            )}

            <div className="space-y-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="summary">Título del evento</Label>
                <Input
                  id="summary"
                  placeholder="Ej: Reunión de estrategia"
                  value={formData.summary}
                  onChange={handleChange}
                  autoFocus
                  className="text-lg font-medium h-12"
                />
              </div>

              {/* Date & Time Group */}
              <div className="bg-surface/30 p-4 rounded-xl border border-border/50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      <CalendarIcon size={12} /> Inicio
                    </Label>
                    <div className="space-y-2">
                      <Input
                        id="startDate"
                        type="date"
                        value={formData.startDate}
                        onChange={handleChange}
                        className="bg-background"
                      />
                      <Input
                        id="startTime"
                        type="time"
                        value={formData.startTime}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      <Clock size={12} /> Fin
                    </Label>
                    <div className="space-y-2">
                      <Input
                        id="endDate"
                        type="date"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="bg-background"
                      />
                      <Input
                        id="endTime"
                        type="time"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin size={16} /> Ubicación
                </Label>
                <Input
                  id="location"
                  placeholder="Ej: Sala de Juntas o Google Meet"
                  value={formData.location}
                  onChange={handleChange}
                />
              </div>

              {/* Attendees */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Users size={16} /> Invitados
                  </Label>
                </div>

                <div className="space-y-2">
                  {attendees.map((attendee, index) => (
                    <div
                      key={index}
                      className="flex gap-2 animate-in fade-in slide-in-from-left-2 duration-200"
                    >
                      <Input
                        placeholder="email@ejemplo.com"
                        value={attendee.email}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleAttendeeChange(index, e.target.value)}
                        className="h-9"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttendee(index)}
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-error hover:bg-error/5"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAttendee}
                    className="w-full h-9 border-dashed text-muted-foreground hover:text-primary hover:border-primary/40"
                  >
                    <Plus size={14} className="mr-1.5" /> Añadir invitado
                  </Button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label htmlFor="description" className="flex items-center gap-2">
                  <AlignLeft size={16} /> Descripción
                </Label>
                <textarea
                  id="description"
                  placeholder="Añade una descripción..."
                  rows={3}
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                />
              </div>
            </div>
          </div>

          <ModalFooter className="px-6 py-4 border-t border-border/40 bg-background/50">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[100px]"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
