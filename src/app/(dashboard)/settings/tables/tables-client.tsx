"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createTable, updateTable, deleteTable } from "@/lib/actions/table-actions";
import { toast } from "sonner";
import { FloorMapView } from "./floor-map-view";

type Table = {
  id: string;
  name: string;
  capacity: number;
  floor: string | null;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";
  positionX: number | null;
  positionY: number | null;
  createdAt: Date;
};

type Props = {
  tables: Table[];
};

const STATUS_STYLES: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  OCCUPIED: "bg-primary/10 text-primary",
  RESERVED: "bg-tertiary/10 text-tertiary",
  MAINTENANCE: "bg-stone-100 text-stone-600",
};

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  OCCUPIED: "Occupied",
  RESERVED: "Reserved",
  MAINTENANCE: "Maintenance",
};

export function TablesClient({ tables }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Table | null>(null);
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"grid" | "map">("grid");
  const [form, setForm] = useState({
    name: "",
    capacity: 4,
    floor: "",
  });

  // Group tables by floor
  const grouped = tables.reduce<Record<string, Table[]>>((acc, table) => {
    const floor = table.floor || "Main Floor";
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(table);
    return acc;
  }, {});

  const floorNames = Object.keys(grouped).sort();

  function openCreate(defaultFloor?: string) {
    setEditing(null);
    setForm({ name: "", capacity: 4, floor: defaultFloor ?? "" });
    setDialogOpen(true);
  }

  function openEdit(table: Table) {
    setEditing(table);
    setForm({
      name: table.name,
      capacity: table.capacity,
      floor: table.floor || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const payload = {
          name: form.name,
          capacity: form.capacity,
          floor: form.floor || undefined,
        };
        if (editing) {
          await updateTable(editing.id, payload);
          toast.success("Table updated successfully");
        } else {
          await createTable(payload);
          toast.success("Table created successfully");
        }
        setDialogOpen(false);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save table");
      }
    });
  }

  function handleDelete(table: Table) {
    if (!confirm(`Delete table "${table.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteTable(table.id);
        toast.success("Table deleted successfully");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete table");
      }
    });
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Table Management
          </h2>
          <p className="text-secondary mt-1">
            Configure your floor plan, tables, and seating capacity
          </p>
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-shadow"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Add Table
        </button>
      </div>

      {/* View Toggle */}
      <div className="inline-flex items-center gap-1 bg-surface-container p-1 rounded-xl mb-6">
        <button
          onClick={() => setView("grid")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            view === "grid" ? "bg-white shadow text-on-surface" : "text-secondary hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">view_module</span>
          Grid
        </button>
        <button
          onClick={() => setView("map")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            view === "map" ? "bg-white shadow text-on-surface" : "text-secondary hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-base">map</span>
          Floor Map
        </button>
      </div>

      {view === "map" ? (
        <FloorMapView tables={tables} onEditTable={openEdit} onAddTable={(floor) => openCreate(floor)} />
      ) : tables.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
          <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">
            table_restaurant
          </span>
          <p className="font-headline font-bold text-on-surface text-lg">No tables yet</p>
          <p className="text-secondary text-sm mt-2">
            Add your first table to get started with table management.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {floorNames.map((floor) => (
            <div key={floor}>
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-primary">layers</span>
                <h3 className="font-headline font-extrabold text-lg text-on-surface">{floor}</h3>
                <span className="text-xs font-bold text-secondary bg-surface-container px-2 py-0.5 rounded-full">
                  {grouped[floor].length} {grouped[floor].length === 1 ? "table" : "tables"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {grouped[floor].map((table) => (
                  <div
                    key={table.id}
                    className="bg-surface-container-lowest rounded-xl shadow-sm p-5 hover:shadow-md transition-shadow relative group"
                  >
                    {/* Actions */}
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEdit(table)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-sm text-secondary">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(table)}
                        disabled={isPending}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-sm text-error">delete</span>
                      </button>
                    </div>

                    {/* Table Icon */}
                    <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center mb-3">
                      <span className="material-symbols-outlined text-primary text-xl">
                        table_restaurant
                      </span>
                    </div>

                    {/* Name */}
                    <p className="font-headline font-bold text-on-surface text-base">{table.name}</p>

                    {/* Capacity */}
                    <div className="flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-xs text-secondary">group</span>
                      <span className="text-xs text-secondary font-medium">
                        {table.capacity} {table.capacity === 1 ? "seat" : "seats"}
                      </span>
                    </div>

                    {/* Floor */}
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-outlined text-xs text-secondary">layers</span>
                      <span className="text-xs text-secondary font-medium">{table.floor || "Main Floor"}</span>
                    </div>

                    {/* Status Badge */}
                    <div className="mt-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          STATUS_STYLES[table.status] || STATUS_STYLES.AVAILABLE
                        }`}
                      >
                        {STATUS_LABELS[table.status] || table.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Table" : "Add Table"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Table Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., Table 1, Booth A"
                required
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label>Capacity</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={form.capacity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacity: parseInt(e.target.value) || 1 }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Floor</Label>
              <Input
                value={form.floor}
                onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                placeholder="e.g., Ground Floor, Rooftop"
                maxLength={50}
              />
            </div>
            <DialogFooter>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 text-sm font-bold rounded-lg primary-gradient text-white disabled:opacity-50 transition-opacity"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                    Saving...
                  </span>
                ) : editing ? (
                  "Update Table"
                ) : (
                  "Create Table"
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
