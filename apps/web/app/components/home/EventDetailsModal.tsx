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
  AlignLeft,
} from 'lucide-react';

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
    <Modal open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <ModalContent className="max-w-lg p-0 overflow-hidden sm:rounded-xl">
        <ModalHeader className="px-6 py-4 border-b border-border/40 bg-background sticky top-0 z-40">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">{getStatusBadge(event.status)}</div>
            </div>
            <ModalTitle className="text-xl font-bold leading-tight">
              {event.summary || 'Sin título'}
            </ModalTitle>
          </div>
        </ModalHeader>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Date/Time */}
          <div className="flex items-start gap-3">
            <div className="mt-1 p-2 bg-primary/10 rounded-lg text-primary">
              <CalendarIcon size={18} />
            </div>
            <div>
              <Text weight="medium" className="capitalize text-base text-foreground">
                {dateString}
              </Text>
              <Text size="sm" className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Clock size={14} /> {timeString}
              </Text>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-secondary/10 rounded-lg text-secondary-foreground">
                <MapPin size={18} />
              </div>
              <div>
                <Text weight="medium" className="text-base text-foreground">
                  Ubicación
                </Text>
                <Text size="sm" className="text-muted-foreground mt-0.5">
                  {event.location}
                </Text>
              </div>
            </div>
          )}

          {/* Google Meet */}
          {event.hangoutLink && (
            <div className="flex items-start gap-3">
              <div className="mt-1 p-2 bg-blue-500/10 rounded-lg text-blue-600">
                <Video size={18} />
              </div>
              <div className="flex-1">
                <Text weight="medium" className="text-base text-foreground">
                  Google Meet
                </Text>
                <Button
                  variant="ghost"
                  className="h-auto p-0 text-blue-600 hover:text-blue-700 text-sm mt-0.5"
                  onClick={() => window.open(event.hangoutLink!, '_blank')}
                >
                  Unirse a la videollamada
                </Button>
              </div>
            </div>
          )}

          {/* Attendees */}
          {(event.organizer || (event.attendees && event.attendees.length > 0)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users size={16} /> Invitados
              </div>
              <div className="space-y-2 pl-1">
                {event.organizer && (
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                      {event.organizer.displayName?.[0] || event.organizer.email?.[0] || '?'}
                    </div>
                    <span className="flex-1 truncate">
                      {event.organizer.displayName || event.organizer.email}
                      <span className="text-muted-foreground ml-1 text-xs">(Organizador)</span>
                    </span>
                  </div>
                )}
                {event.attendees?.map((attendee, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-6 h-6 rounded-full bg-secondary/20 flex items-center justify-center text-secondary-foreground text-xs font-bold">
                      <Mail size={12} />
                    </div>
                    <span className="flex-1 truncate text-muted-foreground">
                      {attendee.displayName || attendee.email}
                    </span>
                    {attendee.responseStatus && (
                      <span className="text-xs capitalize px-1.5 py-0.5 rounded bg-secondary/10 text-muted-foreground">
                        {attendee.responseStatus}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <AlignLeft size={16} /> Descripción
              </div>
              <div
                className="text-sm text-foreground/80 leading-relaxed pl-1"
                dangerouslySetInnerHTML={{ __html: event.description }}
              />
            </div>
          )}
        </div>

        <ModalFooter className="px-6 py-4 border-t border-border/40 bg-background/50">
          <div className="flex justify-between w-full">
            <Button
              variant="ghost"
              className="text-error hover:text-error hover:bg-error/10"
              onClick={() => onDelete(event.id)}
              disabled={isDeleting}
            >
              <Trash2 size={16} className="mr-2" /> Eliminar
            </Button>

            <div className="flex gap-2">
              {event.htmlLink && (
                <Button variant="outline" onClick={() => window.open(event.htmlLink!, '_blank')}>
                  <ExternalLink size={16} className="mr-2" /> Google
                </Button>
              )}
              <Button onClick={() => onEdit(event)}>
                <Edit2 size={16} className="mr-2" /> Editar
              </Button>
            </div>
          </div>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
