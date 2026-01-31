'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Text,
  Stack,
  Badge,
  Spinner,
  cn,
} from '@maatwork/ui';
import type { CalendarEvent, CreateEventRequest } from '@/types';
import { EventDetailsModal } from './EventDetailsModal';
import { CalendarEventForm } from './CalendarEventForm';
import { ChevronLeft, ChevronRight, RefreshCw, Plus, Clock, MapPin } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '@/lib/api/calendar';
import { logger, toLogContextValue } from '@/lib/logger';

interface WeekDay {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  events: CalendarEvent[];
}

interface TimeSlot {
  hour: number;
  label: string;
}

interface WeeklyCalendarViewProps {
  events: CalendarEvent[];
  isLoading: boolean;
  onRefresh: () => void;
  readOnly?: boolean;
  hideHeader?: boolean;
}

export function WeeklyCalendarView({
  events,
  isLoading,
  onRefresh,
  readOnly = false,
  hideHeader = false,
}: WeeklyCalendarViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [initialFormDate, setInitialFormDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    for (let hour = 8; hour <= 22; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
      });
    }
    return slots;
  }, []);

  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      const now = new Date();
      const currentHour = now.getHours();

      if (currentHour < 8) {
        scrollContainerRef.current.scrollTop = 0;
        return;
      }

      const hourHeight = 60;
      const hoursFromStart = currentHour - 8;
      const targetScroll = hoursFromStart * hourHeight;
      const centeredScroll = targetScroll - 150;

      scrollContainerRef.current.scrollTo({
        top: Math.max(0, centeredScroll),
        behavior: 'smooth',
      });
    }
  }, [isLoading, weekOffset]);

  const weekDays: WeekDay[] = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + weekOffset * 7);

    const days: WeekDay[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);

      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();

      const dayEvents = events.filter((event) => {
        const eventDate = event.start.dateTime
          ? new Date(event.start.dateTime)
          : event.start.date
            ? new Date(event.start.date)
            : null;

        if (!eventDate) return false;

        return (
          eventDate.getDate() === date.getDate() &&
          eventDate.getMonth() === date.getMonth() &&
          eventDate.getFullYear() === date.getFullYear()
        );
      });

      days.push({
        date,
        dayName: date.toLocaleDateString('es-ES', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday,
        events: dayEvents,
      });
    }
    return days;
  }, [events, weekOffset]);

  const getEventPosition = (event: CalendarEvent) => {
    const startDate = event.start.dateTime ? new Date(event.start.dateTime) : null;

    if (!startDate) return null;

    const hour = startDate.getHours();
    const minutes = startDate.getMinutes();

    if (hour < 8) return null;
    if (hour > 24) return null;

    const gridRow = hour - 8 + 2;
    const minuteOffset = (minutes / 60) * 100;

    return {
      gridRow,
      minuteOffset,
    };
  };

  const getEventDuration = (event: CalendarEvent) => {
    const startDate = event.start.dateTime ? new Date(event.start.dateTime) : null;
    const endDate = event.end.dateTime ? new Date(event.end.dateTime) : null;

    if (!startDate || !endDate) return 1;

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    return Math.max(durationHours, 0.5);
  };

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1);
  const goToNextWeek = () => setWeekOffset(weekOffset + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  const handleOpenCreateForm = (date?: Date) => {
    setEditingEvent(null);
    setInitialFormDate(date);
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleOpenEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedEvent(null);
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleFormSubmit = async (data: CreateEventRequest) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
      } else {
        await createEvent(data);
      }
      setIsFormOpen(false);
      onRefresh();
    } catch (error) {
      logger.error({ error: toLogContextValue(error) }, 'Error saving event');
      setFormError('Error al guardar el evento. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este evento?')) return;

    setIsDeleting(true);
    try {
      await deleteEvent(eventId);
      setSelectedEvent(null);
      onRefresh();
    } catch (error) {
      logger.error({ error: toLogContextValue(error) }, 'Error deleting event');
    } finally {
      setIsDeleting(false);
    }
  };

  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const showTimeIndicator = currentHour >= 8 && currentHour <= 24;
  const timeIndicatorRow = currentHour - 8 + 2;
  const timeIndicatorOffset = (currentMinutes / 60) * 100;

  const todayIndex = useMemo(() => {
    return weekDays.findIndex((day) => day.isToday);
  }, [weekDays]);

  return (
    <>
      {hideHeader ? (
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner size="lg" />
              <Text color="secondary" className="animate-pulse font-medium">
                Sincronizando calendario...
              </Text>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <div className="hidden md:block">
                <div
                  ref={scrollContainerRef}
                  className="max-h-[600px] overflow-y-auto border border-border/40 rounded-lg relative scroll-smooth bg-background"
                >
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border/10 min-w-[800px] relative">
                    <div className="sticky top-0 left-0 z-40 bg-background border-b border-border/40 p-2 flex items-end justify-end"></div>
                    {weekDays.map((day) => (
                      <div
                        key={day.date.toISOString()}
                        className={cn(
                          'sticky top-0 z-30 bg-background py-3 px-1 text-center border-b border-border/40 transition-colors flex flex-col items-center justify-center gap-1',
                          day.isToday ? 'bg-primary/5' : ''
                        )}
                      >
                        <Text
                          size="xs"
                          color="secondary"
                          className={cn(
                            'uppercase font-semibold tracking-wide text-[10px]',
                            day.isToday ? 'text-primary' : 'text-text-secondary'
                          )}
                        >
                          {day.dayName}
                        </Text>
                        <div
                          className={cn(
                            'w-8 h-8 flex items-center justify-center rounded-full transition-all',
                            day.isToday
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'text-text'
                          )}
                        >
                          <Text
                            weight={day.isToday ? 'bold' : 'medium'}
                            size="lg"
                            className={day.isToday ? 'text-white' : 'text-text'}
                          >
                            {day.dayNumber}
                          </Text>
                        </div>
                      </div>
                    ))}

                    {showTimeIndicator && todayIndex !== -1 && (
                      <div
                        className="pointer-events-none z-30"
                        style={{
                          gridRow: timeIndicatorRow,
                          gridColumn: todayIndex + 2,
                          height: '100%',
                          position: 'relative',
                          marginTop: '-1px',
                        }}
                      >
                        <div
                          className="absolute w-full border-t border-primary flex items-center"
                          style={{ top: `${timeIndicatorOffset}%` }}
                        >
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-primary" />
                        </div>
                      </div>
                    )}

                    {timeSlots.map((slot) => (
                      <React.Fragment key={slot.hour}>
                        <div
                          className="bg-background py-2 pr-2 pl-1 text-right border-r border-border/20 sticky left-0 z-20 flex items-start justify-end -mt-[1px]"
                          style={{
                            gridRow: slot.hour - 8 + 2,
                            gridColumn: 1,
                          }}
                        >
                          <Text
                            size="xs"
                            color="secondary"
                            className="font-mono opacity-50 text-[10px] leading-none -translate-y-1/2 bg-background px-1"
                          >
                            {slot.label}
                          </Text>
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={`${day.date.toISOString()}-${slot.hour}`}
                            className={cn(
                              'bg-background border-b border-r border-border/20 min-h-[60px] relative group transition-colors',
                              day.isToday ? 'bg-primary/[0.02]' : ''
                            )}
                            style={{
                              gridRow: slot.hour - 8 + 2,
                              gridColumn: index + 2,
                            }}
                            onClick={() => {
                              if (readOnly) return;
                              const slotDate = new Date(day.date);
                              slotDate.setHours(slot.hour, 0, 0, 0);
                              handleOpenCreateForm(slotDate);
                            }}
                          >
                            {!readOnly && (
                              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.03] transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 z-0">
                                <Plus className="w-4 h-4 text-primary opacity-50" />
                              </div>
                            )}

                            {day.events.map((event: CalendarEvent) => {
                              const position = getEventPosition(event);
                              if (!position || position.gridRow !== slot.hour - 8 + 2) return null;

                              const duration = getEventDuration(event);
                              const isPersonal = !event.id.startsWith('team_');

                              return (
                                <button
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                  className={cn(
                                    'absolute left-[2px] right-[2px] rounded-md px-2 py-1 text-left transition-all z-10 overflow-hidden hover:brightness-95 shadow-sm border',
                                    isPersonal
                                      ? 'bg-primary/10 border-primary/20 text-primary-dark'
                                      : 'bg-joy/10 border-joy/20 text-joy-dark',
                                    readOnly
                                      ? 'cursor-default'
                                      : 'cursor-pointer hover:shadow-md hover:scale-[1.01]'
                                  )}
                                  style={{
                                    top: `${position.minuteOffset}%`,
                                    height: `${duration * 60}px`,
                                    minHeight: '26px',
                                  }}
                                >
                                  <div className="flex flex-col h-full justify-start overflow-hidden">
                                    <div
                                      className={cn(
                                        'absolute left-0 top-0 bottom-0 w-1',
                                        isPersonal ? 'bg-primary' : 'bg-joy'
                                      )}
                                    />
                                    <div className="pl-2">
                                      <Text
                                        size="xs"
                                        weight="bold"
                                        className="line-clamp-1 leading-tight mb-0.5 truncate text-[11px]"
                                      >
                                        {event.summary || 'Sin título'}
                                      </Text>
                                      {duration >= 0.75 && (
                                        <Text
                                          size="xs"
                                          className="line-clamp-1 opacity-80 flex items-center gap-1 text-[10px]"
                                        >
                                          {event.start.dateTime &&
                                            new Date(event.start.dateTime).toLocaleTimeString(
                                              'es-ES',
                                              {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              }
                                            )}
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:hidden space-y-6 p-1">
                {weekDays.map((day) => (
                  <div
                    key={day.date.toISOString()}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300"
                  >
                    <div
                      className={`flex items-center justify-between mb-3 pb-2 border-b ${day.isToday ? 'border-primary' : 'border-border/40'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            day.isToday ? 'bg-primary text-white' : 'bg-surface text-text'
                          )}
                        >
                          {day.dayNumber}
                        </div>
                        <div className="flex flex-col">
                          <Text weight="bold" className="capitalize text-sm">
                            {day.dayName}
                          </Text>
                        </div>
                      </div>
                      {day.isToday && (
                        <Badge
                          variant="primary"
                          size="sm"
                          className="rounded-full px-2 text-[10px]"
                        >
                          Hoy
                        </Badge>
                      )}
                    </div>

                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mb-3 border border-dashed border-border text-text-secondary hover:text-primary hover:border-primary/30 hover:bg-primary/5 rounded-lg h-10"
                        onClick={() => {
                          const d = new Date(day.date);
                          d.setHours(9, 0, 0, 0);
                          handleOpenCreateForm(d);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Agregar evento
                      </Button>
                    )}

                    {day.events.length > 0 ? (
                      <Stack direction="column" gap="xs">
                        {day.events.map((event: CalendarEvent) => {
                          const isPersonal = !event.id.startsWith('team_');
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={cn(
                                'w-full text-left p-3 rounded-lg border transition-all active:scale-[0.99] flex items-center gap-3',
                                isPersonal
                                  ? 'bg-background border-border hover:border-primary/40'
                                  : 'bg-background border-border hover:border-joy/40'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-1 h-8 rounded-full shrink-0',
                                  isPersonal ? 'bg-primary' : 'bg-joy'
                                )}
                              />
                              <div className="flex-1 min-w-0">
                                <Text weight="medium" size="sm" className="truncate mb-0.5">
                                  {event.summary || 'Sin título'}
                                </Text>
                                <div className="flex items-center gap-2">
                                  <Text
                                    size="xs"
                                    color="secondary"
                                    className="flex items-center gap-1"
                                  >
                                    <Clock className="w-3 h-3" />
                                    {event.start.dateTime
                                      ? new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : 'Todo el día'}
                                  </Text>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-secondary opacity-30" />
                            </button>
                          );
                        })}
                      </Stack>
                    ) : (
                      <div className="py-4 text-center">
                        <Text size="sm" color="secondary" className="italic opacity-50">
                          Sin eventos
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <Card>
          <CardHeader className="border-b border-border/40 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle>Mi Agenda</CardTitle>
              <div className="flex items-center gap-1">
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={() => handleOpenCreateForm()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo
                  </Button>
                )}
                {!readOnly && <div className="h-6 w-px bg-border/40 mx-2"></div>}
                <Button variant="ghost" size="sm" onClick={goToPreviousWeek} disabled={isLoading}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={goToCurrentWeek}
                  disabled={isLoading || weekOffset === 0}
                >
                  Hoy
                </Button>
                <Button variant="ghost" size="sm" onClick={goToNextWeek} disabled={isLoading}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRefresh}
                  disabled={isLoading}
                  aria-label="Actualizar"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar">
              <div className="hidden md:block">
                <div
                  ref={scrollContainerRef}
                  className="max-h-[600px] overflow-y-auto border-none relative scroll-smooth bg-background"
                >
                  <div className="grid grid-cols-[60px_repeat(7,1fr)] gap-px bg-border/10 min-w-[800px] relative">
                    <div className="sticky top-0 left-0 z-40 bg-background border-b border-border/40 p-4 flex items-end justify-end"></div>
                    {weekDays.map((day) => (
                      <div
                        key={day.date.toISOString()}
                        className={cn(
                          'sticky top-0 z-30 bg-background py-3 px-1 text-center border-b border-border/40 transition-colors flex flex-col items-center justify-center gap-1',
                          day.isToday ? 'bg-primary/5' : ''
                        )}
                      >
                        <Text
                          size="xs"
                          color="secondary"
                          className={cn(
                            'uppercase font-semibold tracking-wide text-[10px]',
                            day.isToday ? 'text-primary' : 'text-text-secondary'
                          )}
                        >
                          {day.dayName}
                        </Text>
                        <div
                          className={cn(
                            'w-8 h-8 flex items-center justify-center rounded-full transition-all',
                            day.isToday
                              ? 'bg-primary text-white shadow-md shadow-primary/20'
                              : 'text-text'
                          )}
                        >
                          <Text
                            weight={day.isToday ? 'bold' : 'medium'}
                            size="lg"
                            className={day.isToday ? 'text-white' : 'text-text'}
                          >
                            {day.dayNumber}
                          </Text>
                        </div>
                      </div>
                    ))}

                    {showTimeIndicator && todayIndex !== -1 && (
                      <div
                        className="pointer-events-none z-30"
                        style={{
                          gridRow: timeIndicatorRow,
                          gridColumn: todayIndex + 2,
                          height: '100%',
                          position: 'relative',
                          marginTop: '-1px',
                        }}
                      >
                        <div
                          className="absolute w-full border-t border-primary flex items-center"
                          style={{ top: `${timeIndicatorOffset}%` }}
                        >
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-primary" />
                        </div>
                      </div>
                    )}

                    {timeSlots.map((slot) => (
                      <React.Fragment key={slot.hour}>
                        <div
                          className="bg-background py-2 pr-2 pl-1 text-right border-r border-border/20 sticky left-0 z-20 flex items-start justify-end -mt-[1px]"
                          style={{
                            gridRow: slot.hour - 8 + 2,
                            gridColumn: 1,
                          }}
                        >
                          <Text
                            size="xs"
                            color="secondary"
                            className="font-mono opacity-50 text-[10px] leading-none -translate-y-1/2 bg-background px-1"
                          >
                            {slot.label}
                          </Text>
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={`${day.date.toISOString()}-${slot.hour}`}
                            className={cn(
                              'bg-background border-b border-r border-border/20 min-h-[60px] relative group transition-colors',
                              day.isToday ? 'bg-primary/[0.02]' : ''
                            )}
                            style={{
                              gridRow: slot.hour - 8 + 2,
                              gridColumn: index + 2,
                            }}
                            onClick={() => {
                              if (readOnly) return;
                              const slotDate = new Date(day.date);
                              slotDate.setHours(slot.hour, 0, 0, 0);
                              handleOpenCreateForm(slotDate);
                            }}
                          >
                            {!readOnly && (
                              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.03] transition-colors cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 z-0">
                                <Plus className="w-4 h-4 text-primary opacity-50" />
                              </div>
                            )}

                            {day.events.map((event: CalendarEvent) => {
                              const position = getEventPosition(event);
                              if (!position || position.gridRow !== slot.hour - 8 + 2) return null;

                              const duration = getEventDuration(event);
                              const isPersonal = !event.id.startsWith('team_');

                              return (
                                <button
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvent(event);
                                  }}
                                  className={cn(
                                    'absolute left-[2px] right-[2px] rounded-md px-2 py-1 text-left transition-all z-10 overflow-hidden hover:brightness-95 shadow-sm border',
                                    isPersonal
                                      ? 'bg-primary/10 border-primary/20 text-primary-dark'
                                      : 'bg-joy/10 border-joy/20 text-joy-dark',
                                    readOnly
                                      ? 'cursor-default'
                                      : 'cursor-pointer hover:shadow-md hover:scale-[1.01]'
                                  )}
                                  style={{
                                    top: `${position.minuteOffset}%`,
                                    height: `${duration * 60}px`,
                                    minHeight: '26px',
                                  }}
                                >
                                  <div className="flex flex-col h-full justify-start overflow-hidden">
                                    <div
                                      className={cn(
                                        'absolute left-0 top-0 bottom-0 w-1',
                                        isPersonal ? 'bg-primary' : 'bg-joy'
                                      )}
                                    />
                                    <div className="pl-2">
                                      <Text
                                        size="xs"
                                        weight="bold"
                                        className="line-clamp-1 leading-tight mb-0.5 truncate text-[11px]"
                                      >
                                        {event.summary || 'Sin título'}
                                      </Text>
                                      {duration >= 0.75 && (
                                        <Text
                                          size="xs"
                                          className="line-clamp-1 opacity-80 flex items-center gap-1 text-[10px]"
                                        >
                                          {event.start.dateTime &&
                                            new Date(event.start.dateTime).toLocaleTimeString(
                                              'es-ES',
                                              {
                                                hour: '2-digit',
                                                minute: '2-digit',
                                              }
                                            )}
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={handleOpenEditForm}
        onDelete={handleDeleteEvent}
        isDeleting={isDeleting}
      />

      <CalendarEventForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingEvent ?? undefined}
        initialStartDate={initialFormDate}
        isSubmitting={isSubmitting}
        error={formError}
      />
    </>
  );
}
