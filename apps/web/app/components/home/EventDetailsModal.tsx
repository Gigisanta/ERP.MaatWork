'use client';

import React from 'react';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Text,
  Stack,
  Badge,
} from '@maatwork/ui';
import type { CalendarEvent, CalendarEventAttendee } from '@/types';
import {
  ExternalLink,
  MapPin,
  Users,
  Video,
  Edit2,
  Trash2,
  Calendar as CalendarIcon,
  Clock,
  Mail,
} from 'lucide-react';

/**
 * Event Details Modal
 *
 * AI_DECISION: Modal para mostrar detalles completos de eventos de calendario
 * Justificación: Mejor UX que mostrar todo en el grid, permite ver más información
 * Impacto: Usuario puede ver descripción, asistentes, links sin salir de la app
 */

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
  isDeleting?: boolean;
}

export function EventDetailsModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  isDeleting = false,
}: EventDetailsModalProps) {
  if (!event) return null;

  // Parse dates
  const startDate = event.start.dateTime
    ? new Date(event.start.dateTime)
    : event.start.date
      ? new Date(event.start.date)
      : null;

  const endDate = event.end.dateTime
    ? new Date(event.end.dateTime)
    : event.end.date
      ? new Date(event.end.date)
      : null;

  const isAllDay = !event.start.dateTime && event.start.date;

  // Format date and time
  const dateString = startDate?.toLocaleDateString('es-ES', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const timeString = isAllDay
    ? 'Todo el día'
    : `${startDate?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} - ${endDate?.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <Badge variant="success" size="sm">
            Confirmado
          </Badge>
        );
      case 'tentative':
        return (
          <Badge variant="warning" size="sm">
            Tentativo
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="error" size="sm">
            Cancelado
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <ModalContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <ModalHeader className="px-6 py-5 border-b border-border bg-surface/30 sticky top-0 z-10">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {getStatusBadge(event.status)}
              <Text size="xs" color="secondary" className="font-bold tracking-widest uppercase">Detalle del Evento</Text>
            </div>
            <ModalTitle className="text-2xl font-display font-bold text-text leading-tight">{event.summary || 'Sin título'}</ModalTitle>
          </div>
        </ModalHeader>
        <div className="p-0">
          <div className="p-6 space-y-8">
            {/* Date and Time Section */}
            <div className="flex items-start gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
              <div className="mt-0.5 bg-primary text-primary-foreground p-2.5 rounded-xl shadow-primary-sm">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <Text weight="bold" size="lg" className="capitalize text-primary">
                  {dateString}
                </Text>
                <div className="flex items-center gap-2 text-text-secondary mt-1">
                  <Clock className="w-4 h-4 opacity-60" />
                  <Text weight="medium">{timeString}</Text>
                </div>
              </div>
            </div>

            <Stack direction="column" gap="lg" className="px-1">
              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 bg-surface p-2.5 rounded-xl text-text-secondary border border-border">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <Text weight="bold" size="sm" className="uppercase tracking-wider text-text-secondary mb-1">
                      Ubicación
                    </Text>
                    <Text className="text-text leading-relaxed">{event.location}</Text>
                  </div>
                </div>
              )}

              {/* Video Link */}
              {event.hangoutLink && (
                <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/30">
                  <div className="mt-0.5 bg-blue-500 text-white p-2.5 rounded-xl shadow-lg shadow-blue-500/20">
                    <Video className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <Text weight="bold" className="text-blue-700 dark:text-blue-400">Google Meet</Text>
                      <Text size="xs" className="text-blue-600/70 dark:text-blue-400/70">Videollamada disponible</Text>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => window.open(event.hangoutLink!, '_blank')}
                      className="bg-blue-600 hover:bg-blue-700 shadow-blue-500/30"
                    >
                      Unirse ahora
                    </Button>
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <div className="flex flex-col gap-3">
                  <Text weight="bold" size="sm" className="uppercase tracking-wider text-text-secondary flex items-center gap-2">
                    <div className="w-1 h-4 bg-border rounded-full" /> Descripción
                  </Text>
                  <div className="bg-surface/50 p-5 rounded-2xl border border-border/50">
                    <div
                      className="prose prose-sm max-w-none text-text-secondary leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: event.description }}
                    />
                  </div>
                </div>
              )}

              {/* People Section */}
              {(event.organizer || (event.attendees && event.attendees.length > 0)) && (
                <div className="space-y-4">
                  <Text weight="bold" size="sm" className="uppercase tracking-wider text-text-secondary flex items-center gap-2">
                    <Users className="w-4 h-4" /> Personas
                  </Text>
                  
                  <div className="grid grid-cols-1 gap-2">
                    {/* Organizer */}
                    {event.organizer && (
                      <div className="flex items-center gap-3 bg-surface/40 p-3 rounded-xl border border-border/50 group">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold ring-2 ring-background group-hover:scale-110 transition-transform">
                          {event.organizer.displayName?.[0] || event.organizer.email?.[0] || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Text weight="bold" size="sm" className="truncate">{event.organizer.displayName || 'Organizador'}</Text>
                            <Badge size="sm" variant="outline" className="text-[10px] uppercase h-4 px-1">Org</Badge>
                          </div>
                          <Text size="xs" color="secondary" className="truncate">
                            {event.organizer.email}
                          </Text>
                        </div>
                        {event.organizer.self && (
                          <Badge size="sm" variant="secondary" className="rounded-full">Tú</Badge>
                        )}
                      </div>
                    )}

                    {/* Attendees */}
                    {event.attendees?.map((attendee: CalendarEventAttendee, index: number) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 p-3 bg-surface/20 hover:bg-surface/40 rounded-xl transition-all border border-transparent hover:border-border/50"
                      >
                        <div className="w-10 h-10 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary border border-border">
                          <Mail className="w-4 h-4 opacity-40" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <Text weight="medium" size="sm" className="truncate">
                            {attendee.displayName || attendee.email}
                          </Text>
                          {attendee.displayName && (
                            <Text size="xs" color="secondary" className="truncate opacity-60">
                              {attendee.email}
                            </Text>
                          )}
                        </div>
                        {attendee.responseStatus && (
                          <div className="shrink-0">
                            {attendee.responseStatus === 'accepted' ? (
                              <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600" title="Aceptado">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            ) : attendee.responseStatus === 'declined' ? (
                              <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center text-red-600" title="Rechazado">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                              </div>
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-600" title="Pendiente">
                                <Clock className="w-3.5 h-3.5" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Stack>
          </div>
        </div>
        <ModalFooter className="px-6 py-4 bg-surface/50 border-t border-border sticky bottom-0 z-10">
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
            <Button
              variant="outline"
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
              className="w-full sm:w-auto text-error border-error/20 hover:bg-error/5 hover:border-error transition-all order-2 sm:order-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button 
                variant="ghost" 
                onClick={onClose}
                className="order-3 sm:order-1"
              >
                Cerrar
              </Button>
              {event.htmlLink && (
                <Button 
                  variant="outline" 
                  onClick={() => window.open(event.htmlLink!, '_blank')}
                  className="order-2 sm:order-2"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Calendar
                </Button>
              )}
              <Button 
                variant="primary" 
                onClick={() => onEdit(event)}
                className="shadow-primary-lg order-1 sm:order-3"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Editar Evento
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
