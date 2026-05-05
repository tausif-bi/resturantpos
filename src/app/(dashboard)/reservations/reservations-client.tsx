"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatPhone } from "@/lib/validators/customer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createReservation,
  deleteReservation,
  setReservationStatus,
  updateReservation,
  getReservations,
} from "@/lib/actions/reservation-actions";
import type { ReservationStatus } from "@prisma/client";

type Reservation = Awaited<ReturnType<typeof getReservations>>[number];
type Table = { id: string; name: string; capacity: number };

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  SEATED: "Seated",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};

const STATUS_STYLES: Record<ReservationStatus, string> = {
  PENDING: "bg-amber-50 text-amber-800 border-amber-300",
  CONFIRMED: "bg-blue-50 text-blue-800 border-blue-300",
  SEATED: "bg-green-50 text-green-800 border-green-300",
  COMPLETED: "bg-stone-100 text-stone-700 border-stone-300",
  NO_SHOW: "bg-rose-50 text-rose-700 border-rose-300",
  CANCELLED: "bg-stone-100 text-stone-500 border-stone-300 line-through",
};

const STATUS_FILTERS: Array<{ value: ReservationStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SEATED", label: "Seated" },
  { value: "COMPLETED", label: "Completed" },
  { value: "NO_SHOW", label: "No-show" },
  { value: "CANCELLED", label: "Cancelled" },
];

function dayKey(d: Date | string): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDayLabel(d: Date | string): string {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: target.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Build a value suitable for <input type="datetime-local"> in local time
function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReservationsClient({
  initialReservations,
  tables,
}: {
  initialReservations: Reservation[];
  tables: Table[];
}) {
  const [reservations, setReservations] = useState<Reservation[]>(initialReservations);
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "ALL">("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refresh() {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const horizon = new Date(startOfToday);
    horizon.setDate(horizon.getDate() + 30);
    try {
      const fresh = await getReservations({ from: startOfToday, to: horizon });
      setReservations(fresh);
    } catch {
      // ignore
    }
  }

  const filtered = useMemo(
    () =>
      statusFilter === "ALL"
        ? reservations
        : reservations.filter((r) => r.status === statusFilter),
    [reservations, statusFilter]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    for (const r of filtered) {
      const key = dayKey(r.scheduledFor);
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({
        key,
        label: formatDayLabel(items[0].scheduledFor),
        items: items.sort(
          (a, b) =>
            new Date(a.scheduledFor).getTime() -
            new Date(b.scheduledFor).getTime()
        ),
      }));
  }, [filtered]);

  function handleStatusChange(id: string, status: ReservationStatus) {
    // optimistic
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r))
    );
    startTransition(async () => {
      try {
        await setReservationStatus(id, status);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to update");
        await refresh();
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this reservation? This cannot be undone.")) return;
    startTransition(async () => {
      try {
        await deleteReservation(id);
        setReservations((prev) => prev.filter((r) => r.id !== id));
        toast.success("Reservation deleted");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to delete");
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Reservations
          </h2>
          <p className="text-secondary mt-1 text-sm">
            Today + the next 30 days · {filtered.length}{" "}
            {filtered.length === 1 ? "booking" : "bookings"}
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="primary-gradient text-white font-bold text-sm px-5 py-2.5 rounded-lg shadow hover:shadow-md transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add</span>
          New reservation
        </button>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-colors ${
              statusFilter === f.value
                ? "bg-primary text-on-primary border-primary"
                : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:bg-surface-container"
            }`}
          >
            {f.label}
            {f.value !== "ALL" && (
              <span className="ml-1.5 opacity-70">
                {reservations.filter((r) => r.status === f.value).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {grouped.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-300 mb-2">
            event_available
          </span>
          <p className="font-headline font-bold text-on-surface text-lg">
            No reservations
          </p>
          <p className="text-secondary text-sm mt-1">
            Add a booking with the button above.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((day) => (
            <section key={day.key}>
              <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant/70 mb-2 px-1">
                {day.label}
              </h3>
              <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
                {day.items.map((r, idx) => (
                  <ReservationRow
                    key={r.id}
                    reservation={r}
                    isLast={idx === day.items.length - 1}
                    isPending={isPending}
                    onEdit={() => {
                      setEditing(r);
                      setDialogOpen(true);
                    }}
                    onStatusChange={(s) => handleStatusChange(r.id, s)}
                    onDelete={() => handleDelete(r.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <ReservationDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        tables={tables}
        onSaved={async () => {
          setDialogOpen(false);
          setEditing(null);
          await refresh();
        }}
      />
    </div>
  );
}

function ReservationRow({
  reservation: r,
  isLast,
  isPending,
  onEdit,
  onStatusChange,
  onDelete,
}: {
  reservation: Reservation;
  isLast: boolean;
  isPending: boolean;
  onEdit: () => void;
  onStatusChange: (s: ReservationStatus) => void;
  onDelete: () => void;
}) {
  const isFinal =
    r.status === "COMPLETED" || r.status === "CANCELLED" || r.status === "NO_SHOW";

  return (
    <div
      className={`flex flex-wrap items-center gap-4 px-5 py-4 ${
        isLast ? "" : "border-b border-outline-variant/15"
      }`}
    >
      {/* Time */}
      <div className="w-20 text-on-surface">
        <p className="text-lg font-black tabular-nums">
          {formatTime(r.scheduledFor)}
        </p>
      </div>

      {/* Person */}
      <div className="flex-1 min-w-[200px]">
        <p className="text-sm font-bold text-on-surface">{r.customerName}</p>
        <p className="text-xs text-on-surface-variant">
          {formatPhone(r.phone)} · Party of {r.partySize}
          {r.table && (
            <>
              {" "}
              ·{" "}
              <span className="font-semibold text-tertiary">
                Table {r.table.name}
              </span>
            </>
          )}
        </p>
        {r.notes && (
          <p className="text-xs text-secondary italic mt-1 truncate max-w-md">
            “{r.notes}”
          </p>
        )}
      </div>

      {/* Status pill */}
      <span
        className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border ${STATUS_STYLES[r.status]}`}
      >
        {STATUS_LABEL[r.status]}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1">
        {r.status === "PENDING" && (
          <button
            disabled={isPending}
            onClick={() => onStatusChange("CONFIRMED")}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50"
          >
            Confirm
          </button>
        )}
        {!isFinal && r.status !== "SEATED" && (
          <button
            disabled={isPending}
            onClick={() => onStatusChange("SEATED")}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 disabled:opacity-50"
          >
            Seat
          </button>
        )}
        {r.status === "SEATED" && (
          <button
            disabled={isPending}
            onClick={() => onStatusChange("COMPLETED")}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-700 border border-stone-300 hover:bg-stone-200 disabled:opacity-50"
          >
            Complete
          </button>
        )}
        {!isFinal && (
          <button
            disabled={isPending}
            onClick={() => onStatusChange("NO_SHOW")}
            className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 disabled:opacity-50"
            title="Mark as no-show"
          >
            No-show
          </button>
        )}
        {!isFinal && (
          <button
            disabled={isPending}
            onClick={() => onStatusChange("CANCELLED")}
            className="px-2.5 py-1 rounded-md text-xs font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          disabled={isPending}
          onClick={onEdit}
          className="p-1.5 rounded-md text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
          title="Edit"
          aria-label="Edit reservation"
        >
          <span className="material-symbols-outlined text-base">edit</span>
        </button>
        <button
          disabled={isPending}
          onClick={onDelete}
          className="p-1.5 rounded-md text-on-surface-variant hover:bg-error/10 hover:text-error disabled:opacity-50"
          title="Delete"
          aria-label="Delete reservation"
        >
          <span className="material-symbols-outlined text-base">delete</span>
        </button>
      </div>
    </div>
  );
}

function ReservationDialog({
  open,
  onOpenChange,
  editing,
  tables,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Reservation | null;
  tables: Table[];
  onSaved: () => void;
}) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [scheduledFor, setScheduledFor] = useState("");
  const [tableId, setTableId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // Hydrate form whenever the dialog opens
  useEffect(() => {
    if (!open) return;
    if (editing) {
      setCustomerName(editing.customerName);
      setPhone(editing.phone);
      setPartySize(String(editing.partySize));
      setScheduledFor(toDatetimeLocalValue(new Date(editing.scheduledFor)));
      setTableId(editing.tableId ?? "");
      setNotes(editing.notes ?? "");
    } else {
      const defaultDate = new Date();
      defaultDate.setMinutes(0, 0, 0);
      defaultDate.setHours(defaultDate.getHours() + 1);
      setCustomerName("");
      setPhone("");
      setPartySize("2");
      setScheduledFor(toDatetimeLocalValue(defaultDate));
      setTableId("");
      setNotes("");
    }
    setErrors({});
  }, [open, editing]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = "Name is required";
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "10-digit Indian mobile";
    const party = parseInt(partySize, 10);
    if (!Number.isFinite(party) || party < 1 || party > 50)
      e.partySize = "1–50 guests";
    if (!scheduledFor) e.scheduledFor = "Pick a date and time";
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    const payload = {
      customerName: customerName.trim(),
      phone,
      partySize: parseInt(partySize, 10),
      scheduledFor: new Date(scheduledFor),
      tableId: tableId || null,
      notes: notes.trim() || null,
    };

    startTransition(async () => {
      try {
        if (editing) {
          await updateReservation(editing.id, payload);
          toast.success("Reservation updated");
        } else {
          await createReservation(payload);
          toast.success("Reservation booked");
        }
        onSaved();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Save failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit reservation" : "New reservation"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the booking details below."
              : "Book a table for a guest. They'll show up on the day's list."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <Field label="Guest name" error={errors.customerName}>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Aarav Mehta"
              className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone" error={errors.phone}>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                inputMode="numeric"
                className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
            <Field label="Party size" error={errors.partySize}>
              <input
                type="number"
                min={1}
                max={50}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </Field>
          </div>

          <Field label="Date & time" error={errors.scheduledFor}>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="Table (optional)">
            <select
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">No table assigned</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.name} (seats {t.capacity})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Allergies, occasion, seating preference…"
              rows={2}
              maxLength={300}
              className="w-full bg-surface-container border border-outline-variant/40 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="px-4 py-2 rounded-lg text-sm font-bold text-on-surface-variant hover:bg-surface-container disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="primary-gradient text-white font-bold text-sm px-5 py-2 rounded-lg shadow hover:shadow-md transition-all disabled:opacity-50"
            >
              {editing ? "Save changes" : "Book reservation"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
        {label}
      </span>
      {children}
      {error && <span className="block text-xs text-error mt-1">{error}</span>}
    </label>
  );
}
