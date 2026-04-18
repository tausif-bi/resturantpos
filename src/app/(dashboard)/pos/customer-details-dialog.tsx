"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createOrderWithCustomer,
  lookupCustomerByPhone,
} from "@/lib/actions/customer-actions";

type Props = {
  open: boolean;
  orderType: "TAKEAWAY" | "DELIVERY";
  onOpenChange: (v: boolean) => void;
  onCreated: (orderId: string) => void;
};

export function CustomerDetailsDialog({ open, orderType, onOpenChange, onCreated }: Props) {
  const isDelivery = orderType === "DELIVERY";
  const label = isDelivery ? "Delivery" : "Pick Up";

  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [notes, setNotes] = useState("");
  const [lookupState, setLookupState] = useState<"idle" | "searching" | "found" | "new">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setPhone("");
      setName("");
      setAddress("");
      setLocality("");
      setNotes("");
      setErrors({});
      setLookupState("idle");
    }
  }, [open]);

  // Debounced lookup once the phone is exactly 10 digits.
  useEffect(() => {
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setLookupState("idle");
      return;
    }
    let cancelled = false;
    setLookupState("searching");
    const timer = setTimeout(async () => {
      try {
        const c = await lookupCustomerByPhone(phone);
        if (cancelled) return;
        if (c) {
          setName((prev) => prev || c.name);
          setAddress((prev) => prev || c.address || "");
          setLocality((prev) => prev || c.locality || "");
          setNotes((prev) => prev || c.notes || "");
          setLookupState("found");
        } else {
          setLookupState("new");
        }
      } catch {
        if (!cancelled) setLookupState("new");
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [phone]);

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!/^[6-9]\d{9}$/.test(phone)) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (!name.trim()) e.name = "Name is required";
    if (isDelivery) {
      if (!address.trim()) e.address = "Address is required for delivery";
      if (!locality.trim()) e.locality = "Locality is required for delivery";
    }
    return e;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    startTransition(async () => {
      try {
        const order = await createOrderWithCustomer({
          orderType,
          phone,
          name: name.trim(),
          address: address.trim() || null,
          locality: locality.trim() || null,
          notes: notes.trim() || null,
        });
        toast.success(`${label} order created — ${order.orderNumber}`);
        onCreated(order.id);
        onOpenChange(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to create order");
      }
    });
  }

  function handlePhoneChange(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 10);
    setPhone(digits);
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              {isDelivery ? "delivery_dining" : "takeout_dining"}
            </span>
            New {label} Order
          </DialogTitle>
          <DialogDescription>
            Enter customer details. {isDelivery ? "Address and locality are required." : "Address is optional."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Phone with +91 prefix */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
              Mobile number <span className="text-error">*</span>
            </label>
            <div
              className={`flex items-center rounded-lg border bg-surface-container-lowest overflow-hidden focus-within:ring-2 focus-within:ring-primary/30 ${
                errors.phone ? "border-error" : "border-outline-variant/40"
              }`}
            >
              <span className="px-3 py-2 text-sm font-bold text-secondary bg-surface-container border-r border-outline-variant/30 shrink-0">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="9876543210"
                className="flex-1 px-3 py-2 bg-transparent text-sm outline-none font-mono"
                autoFocus
                disabled={isPending}
              />
              <span className="pr-3 text-xs font-bold shrink-0">
                {lookupState === "searching" && (
                  <span className="text-secondary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                  </span>
                )}
                {lookupState === "found" && (
                  <span className="text-green-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Returning
                  </span>
                )}
                {lookupState === "new" && (
                  <span className="text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">person_add</span>
                    New
                  </span>
                )}
              </span>
            </div>
            {errors.phone && <p className="text-xs text-error">{errors.phone}</p>}
          </div>

          {/* Name */}
          <Field label="Customer name" required error={errors.name}>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
              }}
              placeholder="Full name"
              maxLength={80}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={isPending}
            />
          </Field>

          {/* Address */}
          <Field
            label="Address"
            required={isDelivery}
            error={errors.address}
            hint={isDelivery ? "Flat / house no., building, street" : "Optional"}
          >
            <textarea
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((prev) => ({ ...prev, address: "" }));
              }}
              placeholder={isDelivery ? "12/A Sunrise Apts, MG Road" : "(optional)"}
              rows={2}
              maxLength={300}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              disabled={isPending}
            />
          </Field>

          {/* Locality */}
          <Field
            label="Locality"
            required={isDelivery}
            error={errors.locality}
            hint={isDelivery ? "e.g. Bandra West, Koramangala 4th Block" : "Optional"}
          >
            <input
              value={locality}
              onChange={(e) => {
                setLocality(e.target.value);
                if (errors.locality) setErrors((prev) => ({ ...prev, locality: "" }));
              }}
              placeholder={isDelivery ? "Bandra West" : "(optional)"}
              maxLength={80}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={isPending}
            />
          </Field>

          {/* Notes */}
          <Field label="Notes" hint="Landmark, gate code, etc. (optional)">
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Gate 3 · ring bell · no eggs"
              maxLength={300}
              className="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant/40 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              disabled={isPending}
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 text-sm font-bold rounded-lg primary-gradient text-white shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  Create {label} order
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-xs font-bold text-on-surface uppercase tracking-wide">
          {label}
          {required && <span className="text-error"> *</span>}
        </label>
        {hint && !error && <span className="text-[10px] text-secondary italic">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}
