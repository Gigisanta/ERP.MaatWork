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

/**
 * Weekly Calendar View
 *
 * AI_DECISION: Vista semanal con timeline de horarios (8:00 - 00:00)
 * Justificación: Mejor visualización que lista simple, permite ver distribución de eventos
 * Impacto: UX mejorada, fácil ver qué días/horas están ocupados. Scrollable y centrado en hora actual.
 */

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

  // State for Time Indicator
  const [currentTime, setCurrentTime] = useState(new Date());

  // State for CRUD operations
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [initialFormDate, setInitialFormDate] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Generate time slots (8:00 - 22:00)
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    // From 8 AM to 10 PM
    for (let hour = 8; hour <= 22; hour++) {
      slots.push({
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`,
      });
    }
    return slots;
  }, []);

  // Auto-scroll to current time on mount or week change
  useEffect(() => {
    if (scrollContainerRef.current && !isLoading) {
      const now = new Date();
      const currentHour = now.getHours();

      // Calculate scroll position
      // Each hour is approx 60px height + padding/border
      // We want to center the view around current time
      // Start hour is 8

      // If before 8am, scroll to top
      if (currentHour < 8) {
        scrollContainerRef.current.scrollTop = 0;
        return;
      }

      const hourHeight = 69; // Approximate height of an hour row (min-h-[60px] + p-2 + border)
      const hoursFromStart = currentHour - 8;

      // Target position is the current hour row
      const targetScroll = hoursFromStart * hourHeight;

      // Center it: subtract half of container height (400px / 2 = 200px)
      // And add some offset for the sticky header (approx 50px)
      const centeredScroll = targetScroll - 150;

      scrollContainerRef.current.scrollTo({
        top: Math.max(0, centeredScroll),
        behavior: 'smooth',
      });
    }
  }, [isLoading, weekOffset]);

  // Generate week days
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

      // Filter events for this day
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

  // Get event position in grid
  const getEventPosition = (event: CalendarEvent) => {
    const startDate = event.start.dateTime ? new Date(event.start.dateTime) : null;

    if (!startDate) return null;

    const hour = startDate.getHours();
    const minutes = startDate.getMinutes();

    // Only show events within 8:00 - 24:00
    // Events before 8:00 are not shown in this view
    if (hour < 8) return null;
    // Events after 24:00 (next day) are handled by next day logic usually,
    // but here we just cap at 24:00 for the grid
    if (hour > 24) return null;

    // Grid row calculation:
    // Row 1 is header
    // Row 2 starts at 8:00
    // So for 8:00, we need row 2.
    // Logic: hour - 8 + 2
    const gridRow = hour - 8 + 2;
    const minuteOffset = (minutes / 60) * 100; // percentage of hour

    return {
      gridRow,
      minuteOffset,
    };
  };

  // Calculate event duration in grid rows
  const getEventDuration = (event: CalendarEvent) => {
    const startDate = event.start.dateTime ? new Date(event.start.dateTime) : null;
    const endDate = event.end.dateTime ? new Date(event.end.dateTime) : null;

    if (!startDate || !endDate) return 1;

    const durationMs = endDate.getTime() - startDate.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    return Math.max(durationHours, 0.5); // Minimum 30 minutes
  };

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1);
  const goToNextWeek = () => setWeekOffset(weekOffset + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  // CRUD Handlers
  const handleOpenCreateForm = (date?: Date) => {
    setEditingEvent(null);
    setInitialFormDate(date);
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleOpenEditForm = (event: CalendarEvent) => {
    setEditingEvent(event);
    setSelectedEvent(null); // Close details modal
    setIsFormOpen(true);
    setFormError(null);
  };

  const handleFormSubmit = async (data: CreateEventRequest) => {
    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingEvent) {
        await updateEvent(editingEvent.id, data);
        // Toast functionality removed
      } else {
        await createEvent(data);
      }
      setIsFormOpen(false);
      onRefresh(); // Refresh calendar events
    } catch (error) {
      logger.error('Error saving event', { error: toLogContextValue(error) });
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
      logger.error('Error deleting event', { error: toLogContextValue(error) });
      // Toast functionality removed
    } finally {
      setIsDeleting(false);
    }
  };

  // Calculate Time Indicator Position
  const currentHour = currentTime.getHours();
  const currentMinutes = currentTime.getMinutes();
  const showTimeIndicator = currentHour >= 8 && currentHour <= 24;
  const timeIndicatorRow = currentHour - 8 + 2;
  const timeIndicatorOffset = (currentMinutes / 60) * 100;

  // AI_DECISION: Encontrar el índice del día de hoy para mostrar la línea de tiempo solo ahí
  const todayIndex = useMemo(() => {
    return weekDays.findIndex(day => day.isToday);
  }, [weekDays]);

  return (
    <>
      {hideHeader ? (
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <Spinner size="lg" />
              <Text color="secondary" className="animate-pulse font-medium">Sincronizando calendario...</Text>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              {/* Desktop view */}
              <div className="hidden md:block">
                {/* Scrollable container with fixed height */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[480px] overflow-y-auto border border-border/60 rounded-xl relative scroll-smooth shadow-inner bg-surface/10"
                >
                  <div className="grid grid-cols-8 gap-px bg-border/20 min-w-[900px] relative border-b border-border/20">
                    {/* Header row - Sticky */}
                    <div className="sticky top-0 left-0 z-40 bg-background/80 backdrop-blur-3xl p-4 border-b border-border/80 shadow-sm flex items-end justify-end">
                       <Text size="xs" color="secondary" className="font-bold tracking-tighter opacity-50">GMT-3</Text>
                    </div>
                    {weekDays.map((day) => (
                      <div
                        key={day.date.toISOString()}
                        className={cn(
                          "sticky top-0 z-30 bg-background/80 backdrop-blur-3xl p-4 text-center border-b border-border/80 shadow-sm transition-colors",
                          day.isToday ? 'relative bg-primary/[0.03]' : ''
                        )}
                      >
                        {day.isToday && (
                          <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-full mx-8" />
                        )}
                        <Text size="xs" color="secondary" className={cn(
                          "uppercase font-bold tracking-widest mb-1",
                          day.isToday ? 'text-primary' : 'opacity-60'
                        )}>
                          {day.dayName}
                        </Text>
                        <div className={cn(
                          "inline-flex items-center justify-center w-9 h-9 rounded-full transition-all",
                          day.isToday ? 'bg-primary text-primary-foreground shadow-primary' : 'text-text hover:bg-surface'
                        )}>
                          <Text weight="bold" size="lg">
                            {day.dayNumber}
                          </Text>
                        </div>
                      </div>
                    ))}

                    {/* Time Indicator Line - AI_DECISION: Solo mostrar en la columna de hoy */}
                    {showTimeIndicator && todayIndex !== -1 && (
                      <div
                        className="pointer-events-none z-30"
                        style={{
                          gridRow: timeIndicatorRow,
                          gridColumn: todayIndex + 2, // 1 for time labels + today's index
                          height: '100%',
                          position: 'relative',
                          marginTop: '-1px',
                        }}
                      >
                        <div
                          className="absolute w-full border-t-2 border-primary flex items-center"
                          style={{ top: `${timeIndicatorOffset}%` }}
                        >
                          <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-primary shadow-glow ring-2 ring-background" />
                          <div className="h-0.5 flex-1 bg-primary opacity-30" />
                        </div>
                      </div>
                    )}

                    {/* Time slots */}
                    {timeSlots.map((slot) => (
                      <React.Fragment key={slot.hour}>
                        <div
                          className="bg-background/80 backdrop-blur-3xl p-3 text-right border-t border-r border-border/30 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
                          style={{
                            gridRow: slot.hour - 8 + 2,
                            gridColumn: 1,
                          }}
                        >
                          <Text size="xs" color="secondary" weight="medium" className="opacity-70">
                            {slot.label}
                          </Text>
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={`${day.date.toISOString()}-${slot.hour}`}
                            className={cn(
                              "bg-background/20 p-1 border-t border-l border-border/10 min-h-[70px] relative group transition-colors",
                              day.isToday ? 'bg-primary/[0.01]' : ''
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
                              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.04] transition-colors cursor-pointer flex items-center justify-center">
                                <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-30 transition-opacity" />
                              </div>
                            )}

                            {/* Render events for this time slot */}
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
                                    "absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all z-10 shadow-sm ring-1 ring-inset overflow-hidden group/event",
                                    isPersonal 
                                      ? "bg-primary/10 border-l-4 border-primary ring-primary/20 hover:bg-primary/15" 
                                      : "bg-joy/10 border-l-4 border-joy ring-joy/20 hover:bg-joy/15",
                                    readOnly ? "cursor-default" : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                                  )}
                                  style={{
                                    top: `${position.minuteOffset}%`,
                                    height: `${duration * 70}px`,
                                    minHeight: '24px'
                                  }}
                                >
                                  <div className="flex flex-col h-full justify-start overflow-hidden">
                                    <Text size="xs" weight="bold" className={cn(
                                      "line-clamp-1 leading-tight mb-0.5",
                                      isPersonal ? "text-primary" : "text-joy"
                                    )}>
                                      {event.summary || 'Sin título'}
                                    </Text>
                                    {duration >= 0.75 && (
                                      <Text size="xs" color="secondary" className="line-clamp-1 opacity-80 flex items-center gap-1">
                                        <Clock className="w-2.5 h-2.5" />
                                        {event.start.dateTime &&
                                          new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })}
                                      </Text>
                                    )}
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

              {/* Mobile view - List of events by day */}
              <div className="md:hidden space-y-8 p-1">
                {weekDays.map((day) => (
                  <div key={day.date.toISOString()} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div
                      className={`flex items-center justify-between mb-4 pb-2 border-b ${day.isToday ? 'border-primary' : 'border-border'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                          day.isToday ? "bg-primary text-white shadow-primary" : "bg-surface text-text"
                        )}>
                          {day.dayNumber}
                        </div>
                        <div className="flex flex-col">
                          <Text weight="bold" className="capitalize text-sm tracking-wide">
                            {day.dayName}
                          </Text>
                          <Text size="xs" color="secondary">
                            {day.date.toLocaleDateString('es-ES', { month: 'long' })}
                          </Text>
                        </div>
                      </div>
                      {day.isToday && (
                        <Badge variant="primary" size="sm" className="rounded-full px-3">
                          Hoy
                        </Badge>
                      )}
                    </div>

                    {!readOnly && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mb-4 border border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl py-6"
                        onClick={() => {
                          const d = new Date(day.date);
                          d.setHours(9, 0, 0, 0);
                          handleOpenCreateForm(d);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Nuevo evento
                      </Button>
                    )}

                    {day.events.length > 0 ? (
                      <Stack direction="column" gap="sm">
                        {day.events.map((event: CalendarEvent) => {
                          const isPersonal = !event.id.startsWith('team_');
                          return (
                            <button
                              key={event.id}
                              onClick={() => setSelectedEvent(event)}
                              className={cn(
                                "w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] flex items-center gap-4",
                                isPersonal 
                                  ? "bg-background border-border hover:border-primary/50 hover:shadow-sm" 
                                  : "bg-background border-border hover:border-joy/50 hover:shadow-sm"
                              )}
                            >
                              <div className={cn(
                                "w-1.5 h-12 rounded-full shrink-0",
                                isPersonal ? "bg-primary" : "bg-joy"
                              )} />
                              <div className="flex-1 min-w-0">
                                <Text weight="bold" size="sm" className="truncate mb-1">
                                  {event.summary || 'Sin título'}
                                </Text>
                                <div className="flex items-center gap-3">
                                  <Text size="xs" color="secondary" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {event.start.dateTime
                                      ? new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : 'Todo el día'}
                                  </Text>
                                  {event.location && (
                                    <Text size="xs" color="secondary" className="flex items-center gap-1 truncate max-w-[150px]">
                                      <MapPin className="w-3 h-3" />
                                      {event.location}
                                    </Text>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-text-secondary opacity-30" />
                            </button>
                          );
                        })}
                      </Stack>
                    ) : (
                      <div className="py-8 text-center bg-surface/20 rounded-xl border border-dashed border-border/50">
                        <Text size="sm" color="secondary" className="italic opacity-50">
                          No hay eventos para este día
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
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>AGENDA_TEST_HEADER</CardTitle>
              <div className="flex items-center gap-2">
                {!readOnly && (
                  <Button variant="outline" size="sm" onClick={() => handleOpenCreateForm()}>
                    <Plus className="w-4 h-4 mr-1" />
                    Nuevo
                  </Button>
                )}
                {!readOnly && <div className="h-6 w-px bg-border mx-1"></div>}
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
          <CardContent className="p-0 sm:p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <Spinner size="lg" />
                <Text color="secondary" className="animate-pulse font-medium">Sincronizando calendario...</Text>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                {/* Desktop view */}
                <div className="hidden md:block">
                  {/* Scrollable container with fixed height */}
                  <div
                    ref={scrollContainerRef}
                    className="max-h-[480px] overflow-y-auto border border-border/60 rounded-xl relative scroll-smooth shadow-inner bg-surface/10"
                  >
                    <div className="grid grid-cols-8 gap-px bg-border/20 min-w-[900px] relative border-b border-border/20">
                      {/* Header row - Sticky */}
                      <div className="sticky top-0 left-0 z-40 bg-background/80 backdrop-blur-3xl p-4 border-b border-border/80 shadow-sm flex items-end justify-end">
                         <Text size="xs" color="secondary" className="font-bold tracking-tighter opacity-50">GMT-3</Text>
                      </div>
                      {weekDays.map((day) => (
                        <div
                          key={day.date.toISOString()}
                          className={cn(
                            "sticky top-0 z-30 bg-background/80 backdrop-blur-3xl p-4 text-center border-b border-border/80 shadow-sm transition-colors",
                            day.isToday ? 'relative bg-primary/[0.03]' : ''
                          )}
                        >
                          {day.isToday && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-full mx-8" />
                          )}
                          <Text size="xs" color="secondary" className={cn(
                            "uppercase font-bold tracking-widest mb-1",
                            day.isToday ? 'text-primary' : 'opacity-60'
                          )}>
                            {day.dayName}
                          </Text>
                          <div className={cn(
                            "inline-flex items-center justify-center w-9 h-9 rounded-full transition-all",
                            day.isToday ? 'bg-primary text-primary-foreground shadow-primary' : 'text-text hover:bg-surface'
                          )}>
                            <Text weight="bold" size="lg">
                              {day.dayNumber}
                            </Text>
                          </div>
                        </div>
                      ))}

                      {/* Time Indicator Line - AI_DECISION: Solo mostrar en la columna de hoy */}
                      {showTimeIndicator && todayIndex !== -1 && (
                        <div
                          className="pointer-events-none z-30"
                          style={{
                            gridRow: timeIndicatorRow,
                            gridColumn: todayIndex + 2, // 1 for time labels + today's index
                            height: '100%',
                            position: 'relative',
                            marginTop: '-1px',
                          }}
                        >
                          <div
                            className="absolute w-full border-t-2 border-primary flex items-center"
                            style={{ top: `${timeIndicatorOffset}%` }}
                          >
                            <div className="absolute -left-1 w-2.5 h-2.5 rounded-full bg-primary shadow-glow ring-2 ring-background" />
                            <div className="h-0.5 flex-1 bg-primary opacity-30" />
                          </div>
                        </div>
                      )}

                      {/* Time slots */}
                      {timeSlots.map((slot) => (
                        <React.Fragment key={slot.hour}>
                          <div
                            className="bg-background/80 backdrop-blur-3xl p-3 text-right border-t border-r border-border/30 sticky left-0 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]"
                            style={{
                              gridRow: slot.hour - 8 + 2,
                              gridColumn: 1,
                            }}
                          >
                            <Text size="xs" color="secondary" weight="medium" className="opacity-70">
                              {slot.label}
                            </Text>
                          </div>
                          {weekDays.map((day, index) => (
                            <div
                              key={`${day.date.toISOString()}-${slot.hour}`}
                              className={cn(
                                "bg-background/20 p-1 border-t border-l border-border/10 min-h-[70px] relative group transition-colors",
                                day.isToday ? 'bg-primary/[0.01]' : ''
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
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/[0.04] transition-colors cursor-pointer flex items-center justify-center">
                                  <Plus className="w-5 h-5 text-primary opacity-0 group-hover:opacity-30 transition-opacity" />
                                </div>
                              )}

                              {/* Render events for this time slot */}
                              {day.events.map((event: CalendarEvent) => {
                                const position = getEventPosition(event);
                                if (!position || position.gridRow !== slot.hour - 8 + 2)
                                  return null;

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
                                      "absolute left-1 right-1 rounded-lg px-2 py-1.5 text-left transition-all z-10 shadow-sm ring-1 ring-inset overflow-hidden group/event",
                                      isPersonal 
                                        ? "bg-primary/10 border-l-4 border-primary ring-primary/20 hover:bg-primary/15" 
                                        : "bg-joy/10 border-l-4 border-joy ring-joy/20 hover:bg-joy/15",
                                      readOnly ? "cursor-default" : "cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                                    )}
                                    style={{
                                      top: `${position.minuteOffset}%`,
                                      height: `${duration * 70}px`,
                                      minHeight: '24px'
                                    }}
                                  >
                                    <div className="flex flex-col h-full justify-start overflow-hidden">
                                      <Text size="xs" weight="bold" className={cn(
                                        "line-clamp-1 leading-tight mb-0.5",
                                        isPersonal ? "text-primary" : "text-joy"
                                      )}>
                                        {event.summary || 'Sin título'}
                                      </Text>
                                      {duration >= 0.75 && (
                                        <Text size="xs" color="secondary" className="line-clamp-1 opacity-80 flex items-center gap-1">
                                          <Clock className="w-2.5 h-2.5" />
                                          {event.start.dateTime &&
                                            new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                            })}
                                        </Text>
                                      )}
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

                {/* Mobile view - List of events by day */}
                <div className="md:hidden space-y-8 p-1">
                  {weekDays.map((day) => (
                    <div key={day.date.toISOString()} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div
                        className={`flex items-center justify-between mb-4 pb-2 border-b ${day.isToday ? 'border-primary' : 'border-border'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg",
                            day.isToday ? "bg-primary text-white shadow-primary" : "bg-surface text-text"
                          )}>
                            {day.dayNumber}
                          </div>
                          <div className="flex flex-col">
                            <Text weight="bold" className="capitalize text-sm tracking-wide">
                              {day.dayName}
                            </Text>
                            <Text size="xs" color="secondary">
                              {day.date.toLocaleDateString('es-ES', { month: 'long' })}
                            </Text>
                          </div>
                        </div>
                        {day.isToday && (
                          <Badge variant="primary" size="sm" className="rounded-full px-3">
                            Hoy
                          </Badge>
                        )}
                      </div>

                      {!readOnly && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mb-4 border border-dashed border-primary/30 text-primary bg-primary/5 hover:bg-primary/10 rounded-xl py-6"
                          onClick={() => {
                            const d = new Date(day.date);
                            d.setHours(9, 0, 0, 0);
                            handleOpenCreateForm(d);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Nuevo evento
                        </Button>
                      )}

                      {day.events.length > 0 ? (
                        <Stack direction="column" gap="sm">
                          {day.events.map((event: CalendarEvent) => {
                            const isPersonal = !event.id.startsWith('team_');
                            return (
                              <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={cn(
                                  "w-full text-left p-4 rounded-xl border transition-all active:scale-[0.98] flex items-center gap-4",
                                  isPersonal 
                                    ? "bg-background border-border hover:border-primary/50 hover:shadow-sm" 
                                    : "bg-background border-border hover:border-joy/50 hover:shadow-sm"
                                )}
                              >
                                <div className={cn(
                                  "w-1.5 h-12 rounded-full shrink-0",
                                  isPersonal ? "bg-primary" : "bg-joy"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <Text weight="bold" size="sm" className="truncate mb-1">
                                    {event.summary || 'Sin título'}
                                  </Text>
                                  <div className="flex items-center gap-3">
                                    <Text size="xs" color="secondary" className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {event.start.dateTime
                                        ? new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                          })
                                        : 'Todo el día'}
                                    </Text>
                                    {event.location && (
                                      <Text size="xs" color="secondary" className="flex items-center gap-1 truncate max-w-[150px]">
                                        <MapPin className="w-3 h-3" />
                                        {event.location}
                                      </Text>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-text-secondary opacity-30" />
                              </button>
                            );
                          })}
                        </Stack>
                      ) : (
                        <div className="py-8 text-center bg-surface/20 rounded-xl border border-dashed border-border/50">
                          <Text size="sm" color="secondary" className="italic opacity-50">
                            No hay eventos para este día
                          </Text>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onEdit={handleOpenEditForm}
        onDelete={handleDeleteEvent}
        isDeleting={isDeleting}
      />

      {/* Create/Edit Form Modal */}
      <CalendarEventForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingEvent ?? undefined} // Fix for exactOptionalPropertyTypes
        initialStartDate={initialFormDate}
        isSubmitting={isSubmitting}
        error={formError}
      />
    </>
  );
}
