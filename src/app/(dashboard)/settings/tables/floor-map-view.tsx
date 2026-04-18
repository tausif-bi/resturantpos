"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { updateTablePositions } from "@/lib/actions/table-actions";

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

type Position = { x: number; y: number };

type Props = {
  tables: Table[];
  onEditTable: (table: Table) => void;
  onAddTable: (floor?: string) => void;
};

const GRID_SIZE = 20;
const CANVAS_PADDING = 16;
const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 560;

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  AVAILABLE: {
    bg: "bg-green-50",
    border: "border-green-400",
    text: "text-green-900",
    dot: "bg-green-500",
  },
  OCCUPIED: {
    bg: "bg-primary/10",
    border: "border-primary",
    text: "text-primary",
    dot: "bg-primary",
  },
  RESERVED: {
    bg: "bg-tertiary/10",
    border: "border-tertiary",
    text: "text-tertiary",
    dot: "bg-tertiary",
  },
  MAINTENANCE: {
    bg: "bg-stone-100",
    border: "border-stone-400",
    text: "text-stone-600",
    dot: "bg-stone-400",
  },
};

function tableSize(capacity: number) {
  if (capacity <= 2) return { w: 72, h: 72, rounded: "rounded-2xl" };
  if (capacity <= 4) return { w: 96, h: 96, rounded: "rounded-2xl" };
  if (capacity <= 6) return { w: 128, h: 88, rounded: "rounded-xl" };
  return { w: 152, h: 96, rounded: "rounded-xl" };
}

function snap(value: number, enabled: boolean) {
  return enabled ? Math.round(value / GRID_SIZE) * GRID_SIZE : Math.round(value);
}

function defaultPositions(tables: Table[]) {
  const out: Record<string, Position> = {};
  const cursor: Record<string, Position> = {};
  for (const t of tables) {
    const floor = t.floor || "Main Floor";
    if (t.positionX != null && t.positionY != null) {
      out[t.id] = { x: t.positionX, y: t.positionY };
      continue;
    }
    const c = cursor[floor] || { x: CANVAS_PADDING, y: CANVAS_PADDING };
    const { w } = tableSize(t.capacity);
    out[t.id] = { x: c.x, y: c.y };
    let nextX = c.x + w + 24;
    let nextY = c.y;
    if (nextX + w > DEFAULT_CANVAS_WIDTH - CANVAS_PADDING) {
      nextX = CANVAS_PADDING;
      nextY = c.y + 120;
    }
    cursor[floor] = { x: nextX, y: nextY };
  }
  return out;
}

export function FloorMapView({ tables, onEditTable, onAddTable }: Props) {
  const floors = useMemo(() => {
    const set = new Set<string>();
    for (const t of tables) set.add(t.floor || "Main Floor");
    const list = Array.from(set);
    list.sort();
    return list.length ? list : ["Main Floor"];
  }, [tables]);

  const [activeFloor, setActiveFloor] = useState(floors[0]);
  useEffect(() => {
    if (!floors.includes(activeFloor)) setActiveFloor(floors[0]);
  }, [floors, activeFloor]);

  const [positions, setPositions] = useState<Record<string, Position>>(() => defaultPositions(tables));
  const [initialPositions, setInitialPositions] = useState(positions);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [movedDuringDrag, setMovedDuringDrag] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Reset local positions when the server-provided tables change (e.g. after save/revalidate).
  useEffect(() => {
    const fresh = defaultPositions(tables);
    setPositions(fresh);
    setInitialPositions(fresh);
  }, [tables]);

  const dragState = useRef<{
    id: string;
    offsetX: number;
    offsetY: number;
    startX: number;
    startY: number;
  } | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const dirty = useMemo(() => {
    for (const [id, p] of Object.entries(positions)) {
      const init = initialPositions[id];
      if (!init) return true;
      if (init.x !== p.x || init.y !== p.y) return true;
    }
    return false;
  }, [positions, initialPositions]);

  const tablesOnFloor = tables.filter((t) => (t.floor || "Main Floor") === activeFloor);

  function handlePointerDown(e: React.PointerEvent, t: Table) {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const current = positions[t.id] ?? { x: 0, y: 0 };
    dragState.current = {
      id: t.id,
      offsetX: e.clientX - rect.left - current.x,
      offsetY: e.clientY - rect.top - current.y,
      startX: e.clientX,
      startY: e.clientY,
    };
    setDragId(t.id);
    setMovedDuringDrag(false);
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  function handlePointerMove(e: React.PointerEvent) {
    const state = dragState.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left - state.offsetX;
    const rawY = e.clientY - rect.top - state.offsetY;

    const target = tables.find((t) => t.id === state.id);
    const size = target ? tableSize(target.capacity) : { w: 96, h: 96 };
    const maxX = Math.max(0, rect.width - size.w);
    const maxY = Math.max(0, rect.height - size.h);

    const x = Math.min(maxX, Math.max(0, rawX));
    const y = Math.min(maxY, Math.max(0, rawY));

    if (Math.abs(e.clientX - state.startX) > 3 || Math.abs(e.clientY - state.startY) > 3) {
      setMovedDuringDrag(true);
    }

    setPositions((prev) => ({
      ...prev,
      [state.id]: { x: snap(x, snapToGrid), y: snap(y, snapToGrid) },
    }));
  }

  function handlePointerUp(e: React.PointerEvent, t: Table) {
    const state = dragState.current;
    dragState.current = null;
    setDragId(null);
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    if (state && !movedDuringDrag) onEditTable(t);
    setMovedDuringDrag(false);
  }

  function handleSave() {
    const payload = Object.entries(positions).map(([id, p]) => ({
      id,
      positionX: Math.round(p.x),
      positionY: Math.round(p.y),
    }));
    startTransition(async () => {
      try {
        await updateTablePositions(payload);
        setInitialPositions(positions);
        toast.success("Floor layout saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save layout");
      }
    });
  }

  function handleReset() {
    setPositions(initialPositions);
  }

  function handleAutoArrange() {
    const arranged: Record<string, Position> = { ...positions };
    const cols = Math.max(1, Math.floor((DEFAULT_CANVAS_WIDTH - CANVAS_PADDING * 2) / 140));
    tablesOnFloor.forEach((t, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      arranged[t.id] = {
        x: CANVAS_PADDING + col * 140,
        y: CANVAS_PADDING + row * 120,
      };
    });
    setPositions(arranged);
  }

  const gridBackground = snapToGrid
    ? {
        backgroundImage:
          "radial-gradient(circle, rgba(15, 23, 42, 0.08) 1px, transparent 1px)",
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }
    : undefined;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest rounded-xl shadow-sm p-3">
        <div className="flex items-center gap-1 overflow-x-auto">
          {floors.map((floor) => {
            const count = tables.filter((t) => (t.floor || "Main Floor") === floor).length;
            const active = floor === activeFloor;
            return (
              <button
                key={floor}
                onClick={() => setActiveFloor(floor)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${
                  active
                    ? "primary-gradient text-white shadow"
                    : "text-on-surface hover:bg-surface-container"
                }`}
              >
                <span className="material-symbols-outlined text-base">layers</span>
                {floor}
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    active ? "bg-white/20" : "bg-surface-container text-secondary"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <label className="flex items-center gap-2 text-xs font-bold text-on-surface cursor-pointer select-none">
          <input
            type="checkbox"
            checked={snapToGrid}
            onChange={(e) => setSnapToGrid(e.target.checked)}
            className="accent-primary w-4 h-4"
          />
          Snap to grid
        </label>

        <button
          onClick={handleAutoArrange}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container transition-colors"
          title="Auto-arrange tables on this floor"
        >
          <span className="material-symbols-outlined text-base">grid_view</span>
          Auto-arrange
        </button>

        <button
          onClick={handleReset}
          disabled={!dirty || isPending}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-on-surface hover:bg-surface-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">undo</span>
          Reset
        </button>

        <button
          onClick={() => onAddTable(activeFloor)}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold text-tertiary hover:bg-tertiary/10 transition-colors"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          Add to floor
        </button>

        <button
          onClick={handleSave}
          disabled={!dirty || isPending}
          className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-bold primary-gradient text-white shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">
            {isPending ? "progress_activity" : "save"}
          </span>
          {isPending ? "Saving..." : dirty ? "Save layout" : "Saved"}
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-secondary px-1">
        {Object.entries(STATUS_STYLES).map(([status, s]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <span className="font-medium">{status[0] + status.slice(1).toLowerCase()}</span>
          </div>
        ))}
        <span className="ml-auto italic">
          Drag to reposition • Click a table to edit • {tablesOnFloor.length} tables on {activeFloor}
        </span>
      </div>

      {/* Canvas */}
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-4">
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          className="relative overflow-auto rounded-lg border-2 border-dashed border-outline-variant/40"
          style={{
            width: "100%",
            height: DEFAULT_CANVAS_HEIGHT,
            minWidth: DEFAULT_CANVAS_WIDTH,
            ...gridBackground,
          }}
        >
          {tablesOnFloor.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="material-symbols-outlined text-5xl text-stone-300 mb-3">
                table_restaurant
              </span>
              <p className="font-headline font-bold text-on-surface">No tables on this floor</p>
              <p className="text-xs text-secondary mt-1">
                Click &quot;Add to floor&quot; to create one.
              </p>
            </div>
          )}

          {tablesOnFloor.map((t) => {
            const pos = positions[t.id] ?? { x: CANVAS_PADDING, y: CANVAS_PADDING };
            const size = tableSize(t.capacity);
            const style = STATUS_STYLES[t.status] || STATUS_STYLES.AVAILABLE;
            const isDragging = dragId === t.id;
            return (
              <div
                key={t.id}
                onPointerDown={(e) => handlePointerDown(e, t)}
                onPointerUp={(e) => handlePointerUp(e, t)}
                className={`absolute flex flex-col items-center justify-center border-2 ${size.rounded} ${style.bg} ${style.border} ${style.text} shadow-sm transition-shadow select-none ${
                  isDragging
                    ? "shadow-2xl scale-105 cursor-grabbing z-20"
                    : "cursor-grab hover:shadow-md z-10"
                }`}
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: size.w,
                  height: size.h,
                  touchAction: "none",
                }}
                title={`${t.name} • ${t.capacity} seats • ${t.status.toLowerCase()}`}
              >
                <span className={`w-2 h-2 rounded-full absolute top-2 right-2 ${style.dot}`} />
                <span className="material-symbols-outlined text-xl opacity-70">
                  table_restaurant
                </span>
                <span className="font-headline font-extrabold text-sm mt-1 leading-tight text-center px-1">
                  {t.name}
                </span>
                <span className="text-[10px] font-bold opacity-70 flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[10px]">group</span>
                  {t.capacity}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
