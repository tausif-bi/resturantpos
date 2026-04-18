"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import {
  getActiveKOTs,
  updateKOTStatus,
} from "@/lib/actions/kot-actions";

type KOTList = Awaited<ReturnType<typeof getActiveKOTs>>;
type KOT = KOTList[number];

function formatElapsed(createdAt: Date | string): string {
  const diff = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
  );
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function elapsedMinutes(createdAt: Date | string): number {
  return Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000 / 60
  );
}

export function KitchenClient({ initialKOTs }: { initialKOTs: KOTList }) {
  const [kots, setKots] = useState<KOTList>(initialKOTs);
  const [stationFilter, setStationFilter] = useState("ALL");
  const [, setTick] = useState(0);
  const [isPending, startTransition] = useTransition();

  // Polling: refresh KOTs every 10 seconds
  useEffect(() => {
    const id = setInterval(() => {
      startTransition(async () => {
        try {
          const fresh = await getActiveKOTs(
            stationFilter === "ALL" ? undefined : stationFilter
          );
          setKots(fresh);
        } catch {
          // silently ignore polling errors
        }
      });
    }, 10_000);
    return () => clearInterval(id);
  }, [stationFilter]);

  // Timer: force re-render every second for elapsed time display
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Re-fetch when station filter changes
  useEffect(() => {
    startTransition(async () => {
      try {
        const fresh = await getActiveKOTs(
          stationFilter === "ALL" ? undefined : stationFilter
        );
        setKots(fresh);
      } catch {
        // ignore
      }
    });
  }, [stationFilter]);

  // Extract unique station (category) names
  const stations = Array.from(
    new Set(
      kots.flatMap((kot) =>
        kot.items.map((item) => item.menuItem.category.name)
      )
    )
  ).sort();

  // Compute average elapsed time
  const avgMinutes =
    kots.length > 0
      ? Math.round(
          kots.reduce((sum, k) => sum + elapsedMinutes(k.createdAt), 0) /
            kots.length
        )
      : 0;

  const handleStatusUpdate = useCallback(
    (kotId: string, status: "PREPARING" | "READY") => {
      startTransition(async () => {
        try {
          await updateKOTStatus(kotId, status);
          const fresh = await getActiveKOTs(
            stationFilter === "ALL" ? undefined : stationFilter
          );
          setKots(fresh);
        } catch {
          // ignore
        }
      });
    },
    [stationFilter]
  );

  function getKOTStyle(kot: KOT) {
    const isLate =
      kot.status === "PENDING" && elapsedMinutes(kot.createdAt) > 15;
    if (isLate) return { border: "border-error", color: "error" } as const;
    if (kot.status === "PREPARING")
      return { border: "border-tertiary", color: "tertiary" } as const;
    return { border: "border-primary", color: "primary" } as const;
  }

  return (
    <div className="flex flex-col h-full -m-8 -mt-6">
      {/* ── Sub-header Bar ── */}
      <div className="bg-surface-container-low px-8 py-4 flex items-center justify-between border-b border-outline-variant/20">
        {/* Station Filters */}
        <div className="flex gap-2">
          {["ALL", ...stations].map((station) => (
            <button
              key={station}
              onClick={() => setStationFilter(station)}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                stationFilter === station
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-dim"
              }`}
            >
              {station === "ALL" ? "ALL STATIONS" : station}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-6 text-sm font-semibold text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-base">
              receipt_long
            </span>
            Active Orders:{" "}
            <span className="text-on-surface font-black">{kots.length}</span>
          </span>
          <span className="w-px h-5 bg-outline-variant/40" />
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary text-base">
              avg_pace
            </span>
            Avg Time:{" "}
            <span className="text-on-surface font-black">{avgMinutes}m</span>
          </span>
        </div>
      </div>

      {/* ── Main Scrollable Area ── */}
      <div className="flex-1 overflow-x-auto p-8 bg-surface">
        <div className="flex gap-6 h-full min-w-max">
          {kots.length === 0 && (
            <div className="flex items-center justify-center w-full text-on-surface-variant font-semibold text-lg">
              <span className="material-symbols-outlined text-4xl mr-3 opacity-40">
                restaurant
              </span>
              No active orders
            </div>
          )}

          {kots.map((kot) => {
            const style = getKOTStyle(kot);
            const isLate =
              kot.status === "PENDING" && elapsedMinutes(kot.createdAt) > 15;
            const isPreparing = kot.status === "PREPARING";

            return (
              <div
                key={kot.id}
                className={`w-[380px] h-full flex flex-col border-l-[6px] ${style.border} bg-surface-container-lowest rounded-xl shadow-lg`}
              >
                {/* Header */}
                <div
                  className={`px-5 pt-5 pb-4 border-b border-outline-variant/20 ${
                    isLate ? "bg-error/5 rounded-tr-xl" : ""
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3
                        className={`font-headline text-3xl font-extrabold ${
                          isLate ? "text-error" : "text-on-surface"
                        }`}
                      >
                        {kot.order.table?.name ?? "No Table"}
                      </h3>
                      <p className="text-xs font-semibold text-on-surface-variant mt-0.5">
                        Order #{kot.kotNumber}
                      </p>
                    </div>
                    <div
                      className={`flex items-center gap-1.5 bg-${style.color}/10 text-${style.color} px-3 py-1.5 rounded-lg`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        timer
                      </span>
                      <span
                        className={`text-sm font-black tracking-wide ${
                          isLate ? "order-timer-critical" : ""
                        }`}
                      >
                        {formatElapsed(kot.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="flex-1 px-5 py-4 space-y-4 overflow-y-auto">
                  {kot.items.map((item) => {
                    const itemMinutes = elapsedMinutes(item.createdAt);
                    const itemTimerClass =
                      itemMinutes > 15
                        ? "bg-error/10 text-error"
                        : itemMinutes > 8
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-surface-container text-secondary";
                    return (
                      <div key={item.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-black text-${style.color} bg-${style.color}/10 w-7 h-7 rounded-lg flex items-center justify-center shrink-0`}
                          >
                            {item.quantity}x
                          </span>
                          <span className="font-bold text-on-surface flex-1 min-w-0 truncate">
                            {item.menuItem.name}
                            {item.variant ? ` (${item.variant.name})` : ""}
                          </span>
                          <span
                            className={`text-[10px] font-black tabular-nums px-1.5 py-0.5 rounded ${itemTimerClass}`}
                            title={`Added ${formatElapsed(item.createdAt)} ago`}
                          >
                            {formatElapsed(item.createdAt)}
                          </span>
                        </div>
                        <div className="ml-9 space-y-0.5">
                          {item.notes && (
                            <p className="text-xs font-semibold text-primary flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">
                                local_fire_department
                              </span>
                              {item.notes}
                            </p>
                          )}
                          {item.addOns.map((ao) => (
                            <p
                              key={ao.id}
                              className="text-xs font-semibold text-tertiary flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-xs">
                                add_circle
                              </span>
                              {ao.addOn.name}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-outline-variant/20 flex items-center justify-between">
                  {/* Status indicator */}
                  {isLate ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                      <span className="material-symbols-outlined text-error text-sm">
                        warning
                      </span>
                      Status: <span className="text-error">LATE</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                      <span className="relative flex h-2.5 w-2.5">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                            isPreparing ? "bg-tertiary" : "bg-green-500"
                          } opacity-75`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                            isPreparing ? "bg-tertiary" : "bg-green-500"
                          }`}
                        />
                      </span>
                      Status:{" "}
                      <span className={`text-${style.color}`}>
                        {isPreparing ? "PREPARING" : "NEW"}
                      </span>
                    </div>
                  )}

                  {/* Action button */}
                  {isPreparing ? (
                    <button
                      disabled={isPending}
                      onClick={() => handleStatusUpdate(kot.id, "READY")}
                      className="bg-tertiary text-on-tertiary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      MARK AS READY
                    </button>
                  ) : isLate ? (
                    <div className="flex items-center gap-2">
                      <button className="bg-surface-container-highest text-on-surface-variant p-2.5 rounded-xl hover:bg-surface-dim transition-all">
                        <span className="material-symbols-outlined text-sm">
                          help
                        </span>
                      </button>
                      <button
                        disabled={isPending}
                        onClick={() =>
                          handleStatusUpdate(kot.id, "PREPARING")
                        }
                        className="bg-error text-on-error px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                      >
                        START PREPARING
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        handleStatusUpdate(kot.id, "PREPARING")
                      }
                      className="bg-gradient-to-r from-primary to-primary/80 text-on-primary px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                    >
                      START PREPARING
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Footer Status Bar ── */}
      <div className="h-14 bg-surface-container-highest px-8 flex items-center justify-between border-t border-outline-variant/20">
        <div className="flex items-center gap-6 text-xs font-semibold text-on-surface-variant">
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="material-symbols-outlined text-sm">print</span>
            Printer Online
          </span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="material-symbols-outlined text-sm">sync</span>
            POS Sync Active
          </span>
          <span className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className="material-symbols-outlined text-sm">wifi</span>
            Network 12ms
          </span>
        </div>
        <p className="text-[10px] text-on-surface-variant/60 font-medium">
          Kitchen Display System v1.0
        </p>
      </div>
    </div>
  );
}
