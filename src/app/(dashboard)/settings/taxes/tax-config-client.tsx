"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { createTaxConfig, updateTaxConfig, deleteTaxConfig } from "@/lib/actions/menu-actions";
import { toast } from "sonner";

type TaxConfig = {
  id: string;
  name: string;
  percentage: { toString(): string };
  isInclusive: boolean;
  isActive: boolean;
};

type Props = {
  taxConfigs: TaxConfig[];
};

export function TaxConfigClient({ taxConfigs }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<TaxConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    percentage: 0,
    isInclusive: false,
    isActive: true,
  });

  function openCreate() {
    setEditing(null);
    setForm({ name: "", percentage: 0, isInclusive: false, isActive: true });
    setDialogOpen(true);
  }

  function openEdit(config: TaxConfig) {
    setEditing(config);
    setForm({
      name: config.name,
      percentage: parseFloat(config.percentage.toString()),
      isInclusive: config.isInclusive,
      isActive: config.isActive,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editing) {
        await updateTaxConfig(editing.id, form);
        toast.success("Tax config updated");
      } else {
        await createTaxConfig(form);
        toast.success("Tax config created");
      }
      setDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this tax configuration?")) return;
    try {
      await deleteTaxConfig(id);
      toast.success("Tax config deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tax Configuration</h1>
          <p className="text-muted-foreground">
            Manage GST rates and tax rules for your menu items
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tax Rule
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {taxConfigs.map((config) => (
          <Card key={config.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{config.name}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(config)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(config.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{config.percentage.toString()}%</p>
              <div className="flex gap-2 mt-2">
                {config.isInclusive && (
                  <Badge variant="secondary">Inclusive</Badge>
                )}
                <Badge variant={config.isActive ? "default" : "secondary"}>
                  {config.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Tax Rule" : "Add Tax Rule"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g., GST 5%"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Percentage</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={form.percentage}
                onChange={(e) => setForm((f) => ({ ...f, percentage: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isInclusive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isInclusive: v }))}
                />
                <Label>Tax Inclusive</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
