"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createMenuItem, updateMenuItem, getTaxConfigs } from "@/lib/actions/menu-actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

type Category = {
  id: string;
  name: string;
};

type MenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: { toString(): string };
  isVeg: boolean;
  isAvailable: boolean;
  preparationTime: number | null;
  sortOrder: number;
  taxes: { taxConfig: { id: string } }[];
};

type TaxConfig = {
  id: string;
  name: string;
  percentage: { toString(): string };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  categories: Category[];
};

export function MenuItemDialog({
  open,
  onOpenChange,
  menuItem,
  categories,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [taxConfigs, setTaxConfigs] = useState<TaxConfig[]>([]);
  const [form, setForm] = useState({
    categoryId: "",
    name: "",
    description: "",
    basePrice: 0,
    isVeg: false,
    isAvailable: true,
    preparationTime: undefined as number | undefined,
    sortOrder: 0,
    taxConfigIds: [] as string[],
  });

  const isEditing = !!menuItem;

  useEffect(() => {
    if (open) {
      getTaxConfigs().then(setTaxConfigs).catch(console.error);
    }
  }, [open]);

  useEffect(() => {
    if (menuItem) {
      setForm({
        categoryId: menuItem.categoryId,
        name: menuItem.name,
        description: menuItem.description || "",
        basePrice: parseFloat(menuItem.basePrice.toString()),
        isVeg: menuItem.isVeg,
        isAvailable: menuItem.isAvailable,
        preparationTime: menuItem.preparationTime ?? undefined,
        sortOrder: menuItem.sortOrder,
        taxConfigIds: menuItem.taxes.map((t) => t.taxConfig.id),
      });
    } else {
      setForm({
        categoryId: categories[0]?.id || "",
        name: "",
        description: "",
        basePrice: 0,
        isVeg: false,
        isAvailable: true,
        preparationTime: undefined,
        sortOrder: 0,
        taxConfigIds: [],
      });
    }
  }, [menuItem, open, categories]);

  function updateForm(field: string, value: unknown) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleTax(taxId: string) {
    setForm((prev) => ({
      ...prev,
      taxConfigIds: prev.taxConfigIds.includes(taxId)
        ? prev.taxConfigIds.filter((id) => id !== taxId)
        : [...prev.taxConfigIds, taxId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isEditing) {
        await updateMenuItem(menuItem.id, form);
        toast.success("Menu item updated");
      } else {
        await createMenuItem(form);
        toast.success("Menu item created");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save item");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Menu Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={form.categoryId} onValueChange={(v) => updateForm("categoryId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={form.name}
              onChange={(e) => updateForm("name", e.target.value)}
              placeholder="e.g., Butter Chicken"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              value={form.description}
              onChange={(e) => updateForm("description", e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-price">Base Price (₹)</Label>
              <Input
                id="item-price"
                type="number"
                min={0}
                step={0.01}
                value={form.basePrice}
                onChange={(e) => updateForm("basePrice", parseFloat(e.target.value) || 0)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-prep">Prep Time (min)</Label>
              <Input
                id="item-prep"
                type="number"
                min={0}
                value={form.preparationTime ?? ""}
                onChange={(e) =>
                  updateForm("preparationTime", e.target.value ? parseInt(e.target.value) : undefined)
                }
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isVeg}
                onCheckedChange={(v) => updateForm("isVeg", v)}
              />
              <Label>Vegetarian</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.isAvailable}
                onCheckedChange={(v) => updateForm("isAvailable", v)}
              />
              <Label>Available</Label>
            </div>
          </div>

          {taxConfigs.length > 0 && (
            <div className="space-y-2">
              <Label>Tax Rules</Label>
              <div className="space-y-2">
                {taxConfigs.map((tax) => (
                  <div key={tax.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={form.taxConfigIds.includes(tax.id)}
                      onCheckedChange={() => toggleTax(tax.id)}
                    />
                    <span className="text-sm">
                      {tax.name} ({tax.percentage.toString()}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
