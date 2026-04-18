"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  createVariant,
  deleteVariant,
  createAddOn,
  deleteAddOn,
} from "@/lib/actions/menu-actions";
import { toast } from "sonner";

type MenuItem = {
  id: string;
  name: string;
  variants: { id: string; name: string; price: { toString(): string }; sortOrder: number }[];
  addOns: { id: string; name: string; price: { toString(): string } }[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
};

export function VariantAddOnDialog({ open, onOpenChange, menuItem }: Props) {
  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState(0);
  const [addOnName, setAddOnName] = useState("");
  const [addOnPrice, setAddOnPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  if (!menuItem) return null;

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!menuItem) return;
    setLoading(true);
    try {
      await createVariant({
        menuItemId: menuItem.id,
        name: variantName,
        price: variantPrice,
        isAvailable: true,
        sortOrder: menuItem.variants.length,
      });
      setVariantName("");
      setVariantPrice(0);
      toast.success("Variant added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add variant");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteVariant(id: string) {
    try {
      await deleteVariant(id);
      toast.success("Variant deleted");
    } catch {
      toast.error("Failed to delete variant");
    }
  }

  async function handleAddAddOn(e: React.FormEvent) {
    e.preventDefault();
    if (!menuItem) return;
    setLoading(true);
    try {
      await createAddOn({
        menuItemId: menuItem.id,
        name: addOnName,
        price: addOnPrice,
        isAvailable: true,
      });
      setAddOnName("");
      setAddOnPrice(0);
      toast.success("Add-on added");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add add-on");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteAddOn(id: string) {
    try {
      await deleteAddOn(id);
      toast.success("Add-on deleted");
    } catch {
      toast.error("Failed to delete add-on");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Variants & Add-ons: {menuItem.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="variants">
          <TabsList className="w-full">
            <TabsTrigger value="variants" className="flex-1">
              Variants ({menuItem.variants.length})
            </TabsTrigger>
            <TabsTrigger value="addons" className="flex-1">
              Add-ons ({menuItem.addOns.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="variants" className="space-y-4">
            {menuItem.variants.length > 0 && (
              <div className="space-y-2">
                {menuItem.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <span className="font-medium">{v.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        {formatCurrency(v.price.toString())}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteVariant(v.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddVariant} className="flex gap-2">
              <Input
                placeholder="Variant name (e.g., Half)"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Price"
                value={variantPrice || ""}
                onChange={(e) => setVariantPrice(parseFloat(e.target.value) || 0)}
                required
                className="w-24"
              />
              <Button type="submit" size="icon" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="addons" className="space-y-4">
            {menuItem.addOns.length > 0 && (
              <div className="space-y-2">
                {menuItem.addOns.map((a) => (
                  <div key={a.id} className="flex items-center justify-between rounded-md border p-2">
                    <div>
                      <span className="font-medium">{a.name}</span>
                      <Badge variant="secondary" className="ml-2">
                        +{formatCurrency(a.price.toString())}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteAddOn(a.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleAddAddOn} className="flex gap-2">
              <Input
                placeholder="Add-on name (e.g., Extra Cheese)"
                value={addOnName}
                onChange={(e) => setAddOnName(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                step={0.01}
                placeholder="Price"
                value={addOnPrice || ""}
                onChange={(e) => setAddOnPrice(parseFloat(e.target.value) || 0)}
                required
                className="w-24"
              />
              <Button type="submit" size="icon" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
