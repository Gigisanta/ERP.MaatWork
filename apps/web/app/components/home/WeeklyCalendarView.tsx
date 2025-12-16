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
} from '@cactus/ui';
import type { CalendarEvent, WeekDay, TimeSlot, CreateEventRequest } from '@/types/calendar';
import { EventDetailsModal } from './EventDetailsModal';
import { CalendarEventForm } from './CalendarEventForm';
import { ChevronLeft, ChevronRight, RefreshCw, Plus } from 'lucide-react';
import { createEvent, updateEvent, deleteEvent } from '@/lib/api/calendar';

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

  // Generate time slots (8:00 - 00:00)
  const timeSlots: TimeSlot[] = useMemo(() => {
    const slots: TimeSlot[] = [];
    // From 8 AM to 12 AM (24h)
    for (let hour = 8; hour <= 24; hour++) {
      slots.push({
        hour,
        label: hour === 24 ? '00:00' : `${hour.toString().padStart(2, '0')}:00`,
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
      console.error('Error saving event:', error);
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
      console.error('Error deleting event:', error);
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

  return (
    <>
      {hideHeader ? (
        <CardContent className="p-0 sm:p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop view */}
              <div className="hidden md:block">
                {/* Scrollable container with fixed height */}
                <div
                  ref={scrollContainerRef}
                  className="max-h-[400px] overflow-y-auto border border-border rounded-lg relative scroll-smooth"
                >
                  <div className="grid grid-cols-8 gap-px bg-border min-w-[800px] relative">
                    {/* Header row - Sticky */}
                    <div className="sticky top-0 z-20 bg-background p-2 border-b border-border shadow-sm"></div>
                    {weekDays.map((day) => (
                      <div
                        key={day.date.toISOString()}
                        className={`sticky top-0 z-20 bg-background p-2 text-center border-b border-border shadow-sm ${day.isToday ? 'bg-primary/5' : ''}`}
                      >
                        <Text size="xs" color="secondary" className="uppercase">
                          {day.dayName}
                        </Text>
                        <Text weight="medium" className={day.isToday ? 'text-primary' : ''}>
                          {day.dayNumber}
                        </Text>
                      </div>
                    ))}

                    {/* Time Indicator Line */}
                    {showTimeIndicator && (
                      <div
                        className="col-span-full pointer-events-none z-30"
                        style={{
                          gridRow: timeIndicatorRow,
                          height: '100%',
                          position: 'relative',
                          marginTop: '-1px', // Align with grid lines
                        }}
                      >
                        <div
                          className="absolute w-full border-t-2 border-error flex items-center"
                          style={{ top: `${timeIndicatorOffset}%` }}
                        >
                          <div className="absolute -left-1 w-2 h-2 rounded-full bg-error" />
                        </div>
                      </div>
                    )}

                    {/* Time slots */}
                    {timeSlots.map((slot) => (
                      <React.Fragment key={slot.hour}>
                        <div
                          className="bg-background p-2 text-right border-t border-border"
                          style={{
                            gridRow: slot.hour - 8 + 2,
                            gridColumn: 1, // Explicitly place in first column
                          }}
                        >
                          <Text size="xs" color="secondary">
                            {slot.label}
                          </Text>
                        </div>
                        {weekDays.map((day, index) => (
                          <div
                            key={`${day.date.toISOString()}-${slot.hour}`}
                            className={`bg-background p-1 border-t border-border min-h-[60px] relative group ${day.isToday ? 'bg-primary/5' : ''}`}
                            style={{
                              gridRow: slot.hour - 8 + 2,
                              gridColumn: index + 2, // Explicitly place in day columns (2-8)
                            }}
                            onClick={() => {
                              if (readOnly) return;
                              // Create event on this slot
                              const slotDate = new Date(day.date);
                              slotDate.setHours(slot.hour, 0, 0, 0);
                              handleOpenCreateForm(slotDate);
                            }}
                          >
                            {/* Hover effect for slot creation */}
                            {!readOnly && (
                              <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors cursor-pointer" />
                            )}

                            {/* Render events for this time slot */}
                            {day.events.map((event) => {
                              const position = getEventPosition(event);
                              if (!position || position.gridRow !== slot.hour - 8 + 2) return null;

                              const duration = getEventDuration(event);

                              return (
                                <button
                                  key={event.id}
                                  onClick={(e) => {
                                    e.stopPropagation(); // Prevent slot click
                                    if (readOnly) return; // Or show read-only details if preferred
                                    setSelectedEvent(event);
                                  }}
                                  className={`absolute left-1 right-1 bg-primary/10 border-l-2 border-primary rounded px-2 py-1 text-left ${!readOnly ? 'hover:bg-primary/20 cursor-pointer' : 'cursor-default'} transition-colors z-10`}
                                  style={{
                                    top: `${position.minuteOffset}%`,
                                    height: `${duration * 60}px`,
                                  }}
                                >
                                  <Text size="xs" weight="medium" className="line-clamp-1">
                                    {event.summary || 'Sin título'}
                                  </Text>
                                  <Text size="xs" color="secondary" className="line-clamp-1">
                                    {event.start.dateTime &&
                                      new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })}
                                  </Text>
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
              <div className="md:hidden">
                <Stack direction="column" gap="md">
                  {weekDays.map((day) => (
                    <div key={day.date.toISOString()}>
                      <div
                        className={`flex items-center gap-2 mb-2 ${day.isToday ? 'text-primary' : ''}`}
                      >
                        <Text weight="medium" className="capitalize">
                          {day.dayName} {day.dayNumber}
                        </Text>
                        {day.isToday && (
                          <Badge variant="primary" size="sm">
                            Hoy
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mb-2 border border-dashed border-border text-muted"
                        onClick={() => {
                          if (readOnly) return;
                          const d = new Date(day.date);
                          d.setHours(9, 0, 0, 0); // Default to 9am for mobile quick add
                          handleOpenCreateForm(d);
                        }}
                        disabled={readOnly}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Añadir evento
                      </Button>
                      {day.events.length > 0 ? (
                        <Stack direction="column" gap="xs">
                          {day.events.map((event) => (
                            <button
                              key={event.id}
                              onClick={() => !readOnly && setSelectedEvent(event)}
                              className={`w-full text-left p-3 border border-border rounded-lg ${!readOnly ? 'hover:bg-surface' : ''} transition-colors`}
                            >
                              <Text weight="medium" size="sm">
                                {event.summary || 'Sin título'}
                              </Text>
                              <Text size="xs" color="secondary">
                                {event.start.dateTime
                                  ? new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })
                                  : 'Todo el día'}
                              </Text>
                            </button>
                          ))}
                        </Stack>
                      ) : (
                        <Text size="sm" color="secondary">
                          Sin eventos
                        </Text>
                      )}
                    </div>
                  ))}
                </Stack>
              </div>
            </div>
          )}
        </CardContent>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Mi Calendario</CardTitle>
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
                <Button variant="ghost" size="sm" onClick={onRefresh} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Spinner size="md" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                {/* Desktop view */}
                <div className="hidden md:block">
                  {/* Scrollable container with fixed height */}
                  <div
                    ref={scrollContainerRef}
                    className="max-h-[400px] overflow-y-auto border border-border rounded-lg relative scroll-smooth"
                  >
                    <div className="grid grid-cols-8 gap-px bg-border min-w-[800px] relative">
                      {/* Header row - Sticky */}
                      <div className="sticky top-0 z-20 bg-background p-2 border-b border-border shadow-sm"></div>
                      {weekDays.map((day) => (
                        <div
                          key={day.date.toISOString()}
                          className={`sticky top-0 z-20 bg-background p-2 text-center border-b border-border shadow-sm ${day.isToday ? 'bg-primary/5' : ''}`}
                        >
                          <Text size="xs" color="secondary" className="uppercase">
                            {day.dayName}
                          </Text>
                          <Text weight="medium" className={day.isToday ? 'text-primary' : ''}>
                            {day.dayNumber}
                          </Text>
                        </div>
                      ))}

                      {/* Time Indicator Line */}
                      {showTimeIndicator && (
                        <div
                          className="col-span-full pointer-events-none z-30"
                          style={{
                            gridRow: timeIndicatorRow,
                            height: '100%',
                            position: 'relative',
                            marginTop: '-1px', // Align with grid lines
                          }}
                        >
                          <div
                            className="absolute w-full border-t-2 border-error flex items-center"
                            style={{ top: `${timeIndicatorOffset}%` }}
                          >
                            <div className="absolute -left-1 w-2 h-2 rounded-full bg-error" />
                          </div>
                        </div>
                      )}

                      {/* Time slots */}
                      {timeSlots.map((slot) => (
                        <React.Fragment key={slot.hour}>
                          <div
                            className="bg-background p-2 text-right border-t border-border"
                            style={{
                              gridRow: slot.hour - 8 + 2,
                              gridColumn: 1, // Explicitly place in first column
                            }}
                          >
                            <Text size="xs" color="secondary">
                              {slot.label}
                            </Text>
                          </div>
                          {weekDays.map((day, index) => (
                            <div
                              key={`${day.date.toISOString()}-${slot.hour}`}
                              className={`bg-background p-1 border-t border-border min-h-[60px] relative group ${day.isToday ? 'bg-primary/5' : ''}`}
                              style={{
                                gridRow: slot.hour - 8 + 2,
                                gridColumn: index + 2, // Explicitly place in day columns (2-8)
                              }}
                              onClick={() => {
                                if (readOnly) return;
                                // Create event on this slot
                                const slotDate = new Date(day.date);
                                slotDate.setHours(slot.hour, 0, 0, 0);
                                handleOpenCreateForm(slotDate);
                              }}
                            >
                              {/* Hover effect for slot creation */}
                              {!readOnly && (
                                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors cursor-pointer" />
                              )}

                              {/* Render events for this time slot */}
                              {day.events.map((event) => {
                                const position = getEventPosition(event);
                                if (!position || position.gridRow !== slot.hour - 8 + 2)
                                  return null;

                                const duration = getEventDuration(event);

                                return (
                                  <button
                                    key={event.id}
                                    onClick={(e) => {
                                      e.stopPropagation(); // Prevent slot click
                                      if (readOnly) return; // Or show read-only details if preferred
                                      setSelectedEvent(event);
                                    }}
                                    className={`absolute left-1 right-1 bg-primary/10 border-l-2 border-primary rounded px-2 py-1 text-left ${!readOnly ? 'hover:bg-primary/20 cursor-pointer' : 'cursor-default'} transition-colors z-10`}
                                    style={{
                                      top: `${position.minuteOffset}%`,
                                      height: `${duration * 60}px`,
                                    }}
                                  >
                                    <Text size="xs" weight="medium" className="line-clamp-1">
                                      {event.summary || 'Sin título'}
                                    </Text>
                                    <Text size="xs" color="secondary" className="line-clamp-1">
                                      {event.start.dateTime &&
                                        new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                    </Text>
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
                <div className="md:hidden">
                  <Stack direction="column" gap="md">
                    {weekDays.map((day) => (
                      <div key={day.date.toISOString()}>
                        <div
                          className={`flex items-center gap-2 mb-2 ${day.isToday ? 'text-primary' : ''}`}
                        >
                          <Text weight="medium" className="capitalize">
                            {day.dayName} {day.dayNumber}
                          </Text>
                          {day.isToday && (
                            <Badge variant="primary" size="sm">
                              Hoy
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mb-2 border border-dashed border-border text-muted"
                          onClick={() => {
                            if (readOnly) return;
                            const d = new Date(day.date);
                            d.setHours(9, 0, 0, 0); // Default to 9am for mobile quick add
                            handleOpenCreateForm(d);
                          }}
                          disabled={readOnly}
                        >
                          <Plus className="w-4 h-4 mr-2" /> Añadir evento
                        </Button>
                        {day.events.length > 0 ? (
                          <Stack direction="column" gap="xs">
                            {day.events.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => !readOnly && setSelectedEvent(event)}
                                className={`w-full text-left p-3 border border-border rounded-lg ${!readOnly ? 'hover:bg-surface' : ''} transition-colors`}
                              >
                                <Text weight="medium" size="sm">
                                  {event.summary || 'Sin título'}
                                </Text>
                                <Text size="xs" color="secondary">
                                  {event.start.dateTime
                                    ? new Date(event.start.dateTime).toLocaleTimeString('es-ES', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                      })
                                    : 'Todo el día'}
                                </Text>
                              </button>
                            ))}
                          </Stack>
                        ) : (
                          <Text size="sm" color="secondary">
                            Sin eventos
                          </Text>
                        )}
                      </div>
                    ))}
                  </Stack>
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
