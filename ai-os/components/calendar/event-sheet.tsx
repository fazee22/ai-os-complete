"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  reminderMins: number | null;
  color: string;
};

const COLORS = [
  { value: "primary", label: "Violet" },
  { value: "success", label: "Green" },
  { value: "warning", label: "Amber" },
  { value: "destructive", label: "Rose" },
];

const REMINDER_OPTIONS = [
  { value: "none", label: "No reminder" },
  { value: "10", label: "10 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "1440", label: "1 day before" },
];

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EventSheet({
  event,
  defaultDate,
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  event: CalendarEvent | null;
  defaultDate: Date | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (event: CalendarEvent) => void;
  onUpdated: (event: CalendarEvent) => void;
  onDeleted: (id: string) => void;
}) {
  const isEditing = !!event;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState("primary");
  const [reminder, setReminder] = useState("none");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setStartAt(toLocalInput(event.startAt));
      setEndAt(toLocalInput(event.endAt));
      setAllDay(event.allDay);
      setColor(event.color);
      setReminder(event.reminderMins != null ? String(event.reminderMins) : "none");
    } else {
      const base = defaultDate ?? new Date();
      const start = new Date(base);
      start.setHours(9, 0, 0, 0);
      const end = new Date(base);
      end.setHours(10, 0, 0, 0);
      setTitle("");
      setDescription("");
      setStartAt(format(start, "yyyy-MM-dd'T'HH:mm"));
      setEndAt(format(end, "yyyy-MM-dd'T'HH:mm"));
      setAllDay(false);
      setColor("primary");
      setReminder("none");
    }
  }, [event, defaultDate, open]);

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Give the event a title");
      return;
    }
    if (new Date(endAt) < new Date(startAt)) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving(true);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      allDay,
      color,
      reminderMins: reminder === "none" ? null : Number(reminder),
    };

    const res = await fetch(isEditing ? `/api/events/${event!.id}` : "/api/events", {
      method: isEditing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(json.error ?? "Could not save event");
      return;
    }

    isEditing ? onUpdated(json.event) : onCreated(json.event);
    onOpenChange(false);
  }

  async function handleDelete() {
    if (!event) return;
    const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete event");
      return;
    }
    onDeleted(event.id);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md overflow-y-auto scrollbar-thin">
        <h2 className="mb-4 font-display text-lg font-semibold">
          {isEditing ? "Edit event" : "New event"}
        </h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-desc">Description</Label>
            <textarea
              id="event-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-input bg-background p-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <Label htmlFor="all-day" className="cursor-pointer">All-day event</Label>
            <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="event-start">Starts</Label>
              <Input
                id="event-start"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startAt.slice(0, 10) : startAt}
                onChange={(e) =>
                  setStartAt(allDay ? `${e.target.value}T00:00` : e.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-end">Ends</Label>
              <Input
                id="event-end"
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? endAt.slice(0, 10) : endAt}
                onChange={(e) =>
                  setEndAt(allDay ? `${e.target.value}T23:59` : e.target.value)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Color</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reminder</Label>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create event"}
          </Button>

          {isEditing && (
            <Button variant="ghost" onClick={handleDelete} className="w-full text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4" /> Delete event
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
