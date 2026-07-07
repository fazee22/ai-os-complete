"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  Bell,
} from "lucide-react";
import {
  addDays,
  addMonths,
  addWeeks,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EventSheet, type CalendarEvent } from "@/components/calendar/event-sheet";

type ViewMode = "month" | "week" | "day";

const COLOR_CLASSES: Record<string, string> = {
  primary: "bg-primary/15 text-primary border-primary/30",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning-foreground border-warning/40",
  destructive: "bg-destructive/15 text-destructive border-destructive/30",
};

export function CalendarWorkspace() {
  const [view, setView] = useState<ViewMode>("month");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | null>(null);

  const range = useMemo(() => {
    if (view === "month") {
      return {
        from: startOfWeek(startOfMonth(anchorDate)),
        to: endOfWeek(endOfMonth(anchorDate)),
      };
    }
    if (view === "week") {
      return { from: startOfWeek(anchorDate), to: endOfWeek(anchorDate) };
    }
    return { from: anchorDate, to: anchorDate };
  }, [view, anchorDate]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    });
    const res = await fetch(`/api/events?${params}`);
    const json = await res.json();
    setEvents(json.events ?? []);
    setLoading(false);
  }, [range.from, range.to]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function goPrev() {
    setAnchorDate((d) =>
      view === "month" ? subMonths(d, 1) : view === "week" ? subWeeks(d, 1) : addDays(d, -1)
    );
  }
  function goNext() {
    setAnchorDate((d) =>
      view === "month" ? addMonths(d, 1) : view === "week" ? addWeeks(d, 1) : addDays(d, 1)
    );
  }
  function goToday() {
    setAnchorDate(new Date());
  }

  function openCreate(date: Date) {
    setActiveEvent(null);
    setDefaultDate(date);
    setSheetOpen(true);
  }
  function openEdit(event: CalendarEvent) {
    setActiveEvent(event);
    setDefaultDate(null);
    setSheetOpen(true);
  }

  function handleCreated(event: CalendarEvent) {
    setEvents((prev) => [...prev, event]);
  }
  function handleUpdated(event: CalendarEvent) {
    setEvents((prev) => prev.map((e) => (e.id === event.id ? event : e)));
  }
  function handleDeleted(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleDrop(eventId: string, targetDay: Date) {
    const original = events.find((e) => e.id === eventId);
    if (!original) return;

    const start = new Date(original.startAt);
    const end = new Date(original.endAt);
    const durationMs = end.getTime() - start.getTime();

    const newStart = new Date(targetDay);
    newStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (isSameDay(newStart, start)) return;

    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, startAt: newStart.toISOString(), endAt: newEnd.toISOString() }
          : e
      )
    );

    const res = await fetch(`/api/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startAt: newStart.toISOString(),
        endAt: newEnd.toISOString(),
      }),
    });
    if (!res.ok) {
      toast.error("Could not reschedule event");
      loadEvents();
    }
  }

  const monthDays = useMemo(() => {
    const days: Date[] = [];
    let d = range.from;
    while (d <= range.to) {
      days.push(d);
      d = addDays(d, 1);
    }
    return days;
  }, [range]);

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    let d = startOfWeek(anchorDate);
    for (let i = 0; i < 7; i++) days.push(addDays(d, i));
    return days;
  }, [anchorDate]);

  const eventsForDay = useCallback(
    (day: Date) => events.filter((e) => isSameDay(new Date(e.startAt), day)),
    [events]
  );

  const headerLabel =
    view === "month"
      ? format(anchorDate, "MMMM yyyy")
      : view === "week"
      ? `${format(startOfWeek(anchorDate), "MMM d")} – ${format(endOfWeek(anchorDate), "MMM d, yyyy")}`
      : format(anchorDate, "EEEE, MMMM d, yyyy");

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">{headerLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm capitalize transition-colors",
                  view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                )}
              >
                {v}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={goPrev}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={goToday}>Today</Button>
          <Button variant="outline" size="icon" onClick={goNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button onClick={() => openCreate(anchorDate)}>
            <Plus className="h-4 w-4" /> New event
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : view === "month" ? (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-xs font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const dayEvents = eventsForDay(day);
              const inMonth = isSameMonth(day, anchorDate);
              return (
                <div
                  key={day.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const eventId = e.dataTransfer.getData("text/event-id");
                    if (eventId) handleDrop(eventId, day);
                  }}
                  onClick={() => openCreate(day)}
                  className={cn(
                    "min-h-[100px] cursor-pointer border-b border-r border-border p-1.5 transition-colors hover:bg-accent/40",
                    !inMonth && "bg-muted/20 text-muted-foreground"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <div
                        key={event.id}
                        draggable
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/event-id", event.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(event);
                        }}
                        className={cn(
                          "cursor-grab truncate rounded-md border px-1.5 py-0.5 text-[11px] active:cursor-grabbing",
                          COLOR_CLASSES[event.color] ?? COLOR_CLASSES.primary
                        )}
                        title={event.title}
                      >
                        {!event.allDay && format(new Date(event.startAt), "HH:mm")} {event.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <p className="px-1 text-[10px] text-muted-foreground">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-7">
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="rounded-xl border border-border p-2">
              <div className="mb-2 flex items-center justify-between">
                <p className={cn("text-sm font-medium", isToday(day) && "text-primary")}>
                  {format(day, "EEE d")}
                </p>
                <button
                  onClick={() => openCreate(day)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-1.5">
                {eventsForDay(day).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => openEdit(event)}
                    className={cn(
                      "block w-full truncate rounded-md border px-2 py-1 text-left text-xs",
                      COLOR_CLASSES[event.color] ?? COLOR_CLASSES.primary
                    )}
                  >
                    {!event.allDay && `${format(new Date(event.startAt), "HH:mm")} · `}
                    {event.title}
                  </button>
                ))}
                {eventsForDay(day).length === 0 && (
                  <p className="text-center text-[11px] text-muted-foreground">No events</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          {eventsForDay(anchorDate).length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No events on this day.
            </p>
          )}
          {eventsForDay(anchorDate)
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
            .map((event) => (
              <button
                key={event.id}
                onClick={() => openEdit(event)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors hover:opacity-80",
                  COLOR_CLASSES[event.color] ?? COLOR_CLASSES.primary
                )}
              >
                <div>
                  <p className="text-sm font-medium">{event.title}</p>
                  {event.description && (
                    <p className="mt-0.5 text-xs opacity-80">{event.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs">
                  {event.reminderMins != null && <Bell className="h-3.5 w-3.5" />}
                  <span>
                    {event.allDay
                      ? "All day"
                      : `${format(new Date(event.startAt), "HH:mm")} – ${format(new Date(event.endAt), "HH:mm")}`}
                  </span>
                </div>
              </button>
            ))}
        </div>
      )}

      <EventSheet
        event={activeEvent}
        defaultDate={defaultDate}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onCreated={handleCreated}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
