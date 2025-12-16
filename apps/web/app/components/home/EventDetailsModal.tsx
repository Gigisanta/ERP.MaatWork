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
} from '@cactus/ui';
import type { CalendarEvent } from '@/types/calendar';
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
      <ModalContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <ModalHeader className="border-b border-border pb-4">
          <Stack direction="column" gap="xs">
            <ModalTitle className="text-xl">{event.summary || 'Sin título'}</ModalTitle>
            {getStatusBadge(event.status)}
          </Stack>
        </ModalHeader>
        <div className="p-6">
          <Stack direction="column" gap="lg">
            {/* Date and Time */}
            <div className="flex items-start gap-3">
              <div className="mt-1 bg-primary/10 p-2 rounded-lg text-primary">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <Text weight="medium" size="lg" className="capitalize mb-1">
                  {dateString}
                </Text>
                <Text color="secondary">{timeString}</Text>
              </div>
            </div>

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-surface-hover p-2 rounded-lg text-text-secondary">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <Text weight="medium" className="mb-1">
                    Ubicación
                  </Text>
                  <Text color="secondary">{event.location}</Text>
                </div>
              </div>
            )}

            {/* Video Link */}
            {event.hangoutLink && (
              <div className="flex items-start gap-3">
                <div className="mt-1 bg-blue-500/10 p-2 rounded-lg text-blue-500">
                  <Video className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <Text weight="medium" className="mb-2">
                    Google Meet
                  </Text>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => window.open(event.hangoutLink, '_blank')}
                    className="w-full sm:w-auto"
                  >
                    Unirse a la reunión
                  </Button>
                </div>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="bg-surface p-4 rounded-lg">
                <Text
                  weight="medium"
                  size="sm"
                  className="mb-2 text-text-secondary uppercase tracking-wide"
                >
                  Descripción
                </Text>
                <div
                  className="prose prose-sm max-w-none text-text-secondary"
                  dangerouslySetInnerHTML={{ __html: event.description }}
                />
              </div>
            )}

            {/* Organizer */}
            {event.organizer && (
              <div>
                <Text
                  weight="medium"
                  size="sm"
                  className="mb-3 text-text-secondary uppercase tracking-wide flex items-center gap-2"
                >
                  <CalendarIcon className="w-4 h-4" /> Organizador
                </Text>
                <div className="flex items-center gap-3 bg-surface p-3 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                    {event.organizer.displayName?.[0] || event.organizer.email?.[0] || '?'}
                  </div>
                  <div>
                    <Text weight="medium">{event.organizer.displayName || 'Organizador'}</Text>
                    <Text size="sm" color="secondary">
                      {event.organizer.email}
                    </Text>
                  </div>
                  {event.organizer.self && (
                    <Badge size="sm" variant="secondary" className="ml-auto">
                      Tú
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Attendees */}
            {event.attendees && event.attendees.length > 0 && (
              <div>
                <Text
                  weight="medium"
                  size="sm"
                  className="mb-3 text-text-secondary uppercase tracking-wide flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Asistentes ({event.attendees.length})
                </Text>
                <Stack direction="column" gap="xs">
                  {event.attendees.map((attendee, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-2 hover:bg-surface rounded-lg transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-secondary">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Text weight="medium" className="truncate">
                          {attendee.displayName || attendee.email}
                        </Text>
                        {attendee.displayName && (
                          <Text size="xs" color="secondary" className="truncate">
                            {attendee.email}
                          </Text>
                        )}
                      </div>
                      {attendee.responseStatus && (
                        <Badge
                          size="sm"
                          variant={
                            attendee.responseStatus === 'accepted'
                              ? 'success'
                              : attendee.responseStatus === 'declined'
                                ? 'error'
                                : 'secondary'
                          }
                        >
                          {attendee.responseStatus === 'accepted'
                            ? 'Aceptado'
                            : attendee.responseStatus === 'declined'
                              ? 'Rechazado'
                              : attendee.responseStatus === 'tentative'
                                ? 'Tentativo'
                                : 'Pendiente'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            )}
          </Stack>
        </div>
        <ModalFooter className="border-t border-border pt-4">
          <div className="flex justify-between w-full">
            <Button
              variant="outline"
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
              className="text-error border-error/30 hover:bg-error/5 hover:border-error"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Eliminar
            </Button>

            <div className="flex gap-2">
              {event.htmlLink && (
                <Button variant="ghost" onClick={() => window.open(event.htmlLink, '_blank')}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver en Google
                </Button>
              )}
              <Button variant="outline" onClick={() => onEdit(event)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button variant="primary" onClick={onClose}>
                Cerrar
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
