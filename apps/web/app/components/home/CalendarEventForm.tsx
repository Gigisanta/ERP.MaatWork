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
  Badge,
} from '@maatwork/ui';
import { Plus, Trash2 } from 'lucide-react';
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
        setAttendees(initialData.attendees?.map((a: { email: string }) => ({ email: a.email })) || []);
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
    <Modal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      className="max-w-[560px] p-0 border-none bg-background shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] overflow-hidden rounded-[42px] w-[95vw] sm:w-full flex flex-col max-h-[92vh]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col relative w-full max-h-[92vh] overflow-hidden">
        <ModalHeader className="px-10 pt-8 pb-5 border-b border-border/10 bg-surface/30 sticky top-0 z-40 backdrop-blur-md w-full text-left flex flex-col items-start">
          <ModalTitle className="flex flex-col gap-0.5 w-full pr-14 text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 ml-1">
              {initialData ? 'Editar detalles' : 'Programar evento'}
            </span>
            <Input
              id="summary"
              placeholder="¿Cómo se llama el evento?"
              value={formData.summary}
              onChange={handleChange}
              className="text-3xl font-display font-black border-none focus:ring-0 p-0 h-auto bg-transparent w-full placeholder:text-text-muted/15 shadow-none transition-all tracking-tight"
              autoFocus
            />
          </ModalTitle>
        </ModalHeader>

        <div className="flex-1 p-10 space-y-10 overflow-y-auto custom-scrollbar w-full min-h-0">
          {(error || validationError) && (
            <Alert variant="error" className="py-3 px-4 animate-in fade-in slide-in-from-top-2 duration-300 rounded-xl">
              <Text size="sm" weight="medium">{error || validationError}</Text>
            </Alert>
          )}

          {/* Date and Time Selection */}
          <div className="space-y-6 bg-surface/40 p-8 rounded-[36px] border border-border/60 shadow-inner w-full">
            <div className="space-y-4 w-full">
              <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2.5 ml-1">
                <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_12px_rgba(var(--color-primary-rgb),0.5)]" /> Inicio del evento
              </Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange}
                  className="w-full sm:flex-1 bg-background h-14 px-5 rounded-[22px] border-border/50 focus:ring-primary/20 shadow-sm text-base font-medium"
                />
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full sm:w-36 bg-background h-14 px-5 text-center rounded-[22px] border-border/50 focus:ring-primary/20 shadow-sm text-base font-medium"
                />
              </div>
            </div>

            <div className="space-y-4 w-full">
              <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary flex items-center gap-2.5 ml-1">
                <div className="w-2.5 h-2.5 rounded-full bg-joy shadow-[0_0_12px_rgba(var(--color-joy-rgb),0.5)]" /> Fin del evento
              </Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleChange}
                  className="w-full sm:flex-1 bg-background h-14 px-5 rounded-[22px] border-border/50 focus:ring-primary/20 shadow-sm text-base font-medium"
                />
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full sm:w-36 bg-background h-14 px-5 text-center rounded-[22px] border-border/50 focus:ring-primary/20 shadow-sm text-base font-medium"
                />
              </div>
            </div>
          </div>

          {/* Attendees */}
          <div className="space-y-5 w-full">
            <Label className="text-[11px] font-bold uppercase tracking-[0.2em] text-text-secondary ml-2 flex items-center justify-between">
              Lista de Invitados
              {attendees.length > 0 && (
                <Badge variant="primary" size="sm" className="rounded-full px-3 py-1 text-[10px] font-black shadow-lg shadow-primary/20">
                  {attendees.length} {attendees.length === 1 ? 'Persona' : 'Personas'}
                </Badge>
              )}
            </Label>
            <div className="space-y-3 w-full">
              {attendees.map((attendee, index) => (
                <div key={index} className="flex gap-3 group animate-in fade-in slide-in-from-right-3 duration-400 items-center w-full">
                  <Input
                    placeholder="ejemplo@correo.com"
                    value={attendee.email}
                    onChange={(e) => handleAttendeeChange(index, e.target.value)}
                    className="flex-1 bg-surface/30 h-14 px-6 rounded-[22px] border-border/50 focus:ring-primary/20 shadow-sm"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttendee(index)}
                    className="h-14 w-14 p-0 text-error/40 hover:text-error hover:bg-error/10 rounded-[22px] transition-all shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                className="w-full h-14 rounded-[24px] border-dashed border-2 border-primary/20 text-primary bg-primary/[0.01] hover:bg-primary/[0.03] hover:border-primary/40 transition-all flex items-center justify-center gap-3 group shrink-0"
                onClick={addAttendee}
              >
                <div className="p-1.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-[11px] font-black uppercase tracking-[0.2em]">Añadir Invitado</span>
              </Button>
            </div>
          </div>

          {/* Google Meet Info */}
          {!initialData && (
            <div className="bg-primary/5 border border-primary/10 rounded-[28px] p-6 flex items-start gap-5 animate-in fade-in zoom-in-95 duration-500 shadow-sm w-full">
              <div className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20 shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex flex-col gap-1.5 overflow-hidden">
                <Text size="sm" weight="bold" className="text-primary leading-none">Google Meet</Text>
                <Text size="xs" className="text-primary/70 leading-relaxed">Se generará un enlace de reunión automáticamente al guardar el evento.</Text>
              </div>
            </div>
          )}
          
          <div className="space-y-2 w-full">
            <Label htmlFor="description" className="text-[11px] font-bold uppercase tracking-[0.15em] text-text-secondary ml-1">
              Descripción
            </Label>
            <textarea
              id="description"
              placeholder="Añade detalles adicionales o notas importantes..."
              rows={2}
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-[24px] border border-border/50 bg-surface/20 px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none min-h-[90px] shadow-sm"
            />
          </div>
        </div>

        <ModalFooter className="px-10 py-8 bg-surface/30 border-t border-border/10 sticky bottom-0 z-40 flex flex-row items-center justify-end gap-4 backdrop-blur-md w-full">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onClose} 
              disabled={isSubmitting}
              className="text-text-secondary/60 hover:text-text font-bold uppercase tracking-[0.2em] text-[10px] px-8 h-14 rounded-2xl transition-all"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="min-w-[200px] h-14 shadow-2xl shadow-primary/30 active:scale-[0.98] transition-all rounded-[24px] font-black uppercase tracking-[0.2em] text-xs bg-primary hover:bg-primary/90 text-white"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando...</span>
                </div>
              ) : (
                'Guardar Evento'
              )}
            </Button>
          </ModalFooter>
      </form>
    </Modal>
  );
}
