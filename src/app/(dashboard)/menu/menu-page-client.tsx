"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { CategoryDialog } from "./category-dialog";
import { MenuItemDialog } from "./menu-item-dialog";
import { VariantAddOnDialog } from "./variant-addon-dialog";
import { MenuImportDialog } from "./menu-import-dialog";
import {
  deleteCategory,
  deleteMenuItem,
  toggleMenuItemAvailability,
} from "@/lib/actions/menu-actions";
import { toast } from "sonner";

type Props = {
  categories: Awaited<ReturnType<typeof import("@/lib/actions/menu-actions").getCategories>>;
  menuItems: Awaited<ReturnType<typeof import("@/lib/actions/menu-actions").getMenuItems>>;
};

export function MenuPageClient({ categories, menuItems }: Props) {
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<typeof categories[0] | null>(null);
  const [menuItemDialogOpen, setMenuItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<typeof menuItems[0] | null>(null);
  const [variantAddonDialogOpen, setVariantAddonDialogOpen] = useState(false);
  const [selectedItemForVA, setSelectedItemForVA] = useState<typeof menuItems[0] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    const base = activeCategory
      ? menuItems.filter((item) => item.categoryId === activeCategory)
      : menuItems;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((item) => {
      const name = item.name.toLowerCase();
      const code = (item.shortCode ?? "").toLowerCase();
      return name.includes(q) || code.includes(q);
    });
  }, [menuItems, activeCategory, search]);

  async function handleDeleteCategory(id: string) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await deleteCategory(id);
      toast.success("Category deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    try {
      await deleteMenuItem(id);
      toast.success("Menu item deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete item");
    }
  }

  async function handleToggleAvailability(id: string) {
    try {
      await toggleMenuItemAvailability(id);
      toast.success("Availability updated");
    } catch {
      toast.error("Failed to update availability");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-on-surface font-headline mb-2">
            Menu Management
          </h2>
          <p className="text-secondary font-medium">
            Curate your culinary offerings and track live inventory.
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setImportDialogOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-on-surface hover:bg-surface-container-highest transition-all"
          >
            <span className="material-symbols-outlined">upload_file</span>
            Import from Excel
          </button>
          <button
            onClick={() => {
              setEditingCategory(null);
              setCategoryDialogOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-surface-container-high rounded-xl font-bold text-on-surface hover:bg-surface-container-highest transition-all"
          >
            <span className="material-symbols-outlined">category</span>
            Manage Categories
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setMenuItemDialogOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl hover:shadow-primary/20 transition-all"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Add Menu Item
          </button>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar: Categories */}
        <div className="col-span-12 lg:col-span-3 space-y-8">
          <section className="bg-surface-container-low rounded-xl p-6">
            <h3 className="text-xs uppercase tracking-widest font-black text-on-surface-variant mb-6">
              Categories
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setActiveCategory(null)}
                className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all ${
                  !activeCategory
                    ? "bg-surface-container-lowest shadow-sm border-l-4 border-primary"
                    : "hover:bg-surface-container-highest"
                }`}
              >
                <span className={`font-bold ${!activeCategory ? "text-on-surface" : "text-secondary"}`}>
                  All Items
                </span>
                <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                  !activeCategory ? "bg-primary/10 text-primary" : "text-stone-400"
                }`}>
                  {menuItems.length}
                </span>
              </button>
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setActiveCategory(cat.id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setActiveCategory(cat.id); }}
                  className={`w-full flex justify-between items-center px-4 py-3 rounded-xl transition-all group cursor-pointer ${
                    activeCategory === cat.id
                      ? "bg-surface-container-lowest shadow-sm border-l-4 border-primary"
                      : "hover:bg-surface-container-highest"
                  }`}
                >
                  <span className={`font-bold ${activeCategory === cat.id ? "text-on-surface" : "text-secondary"}`}>
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                      activeCategory === cat.id ? "bg-primary/10 text-primary" : "text-stone-400"
                    }`}>
                      {cat._count.menuItems}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCategory(cat);
                          setCategoryDialogOpen(true);
                        }}
                        className="text-stone-400 hover:text-on-surface"
                      >
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCategory(cat.id);
                        }}
                        className="text-stone-400 hover:text-error"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Combo Creator */}
          <section className="bg-tertiary/5 rounded-xl p-6 border border-tertiary/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-tertiary">auto_awesome</span>
              <h3 className="text-sm font-black text-tertiary">Combo Meal Creator</h3>
            </div>
            <p className="text-xs text-secondary mb-6 leading-relaxed">
              Group items to create promotional value meals. Automatically syncs inventory across all components.
            </p>
            <button className="w-full py-3 bg-white border-2 border-dashed border-tertiary/30 rounded-xl text-tertiary text-sm font-bold hover:bg-tertiary/10 transition-all">
              Build New Combo
            </button>
          </section>
        </div>

        {/* Main: Item Grid */}
        <div className="col-span-12 lg:col-span-9">
          {/* Search bar */}
          <div className="mb-6 flex items-center gap-3 bg-surface-container-lowest rounded-xl px-4 py-3 shadow-sm border border-outline-variant/20 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            <span className="material-symbols-outlined text-secondary">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or short code (e.g. VMS)"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              autoComplete="off"
            />
            {search && (
              <>
                <span className="text-xs font-bold text-secondary">
                  {filteredItems.length} {filteredItems.length === 1 ? "match" : "matches"}
                </span>
                <button
                  onClick={() => setSearch("")}
                  className="text-secondary hover:text-on-surface"
                  title="Clear"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </>
            )}
          </div>

          {filteredItems.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl p-12 text-center shadow-sm">
              <span className="material-symbols-outlined text-5xl text-stone-300 mb-3">
                search_off
              </span>
              <p className="font-headline font-bold text-on-surface">No items found</p>
              <p className="text-secondary text-sm mt-1">
                {search ? `Nothing matches "${search}"` : "No items in this category yet"}
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 flex flex-col ${
                  !item.isAvailable ? "opacity-80" : ""
                }`}
              >
                {/* Image Area */}
                <div className="relative h-48 overflow-hidden bg-stone-100">
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-stone-300">
                      {item.isVeg ? "eco" : "restaurant"}
                    </span>
                  </div>
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      item.isAvailable
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                        : "bg-stone-400"
                    }`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider ${
                      item.isAvailable ? "text-emerald-700" : "text-stone-600"
                    }`}>
                      {item.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  {item.isVeg && (
                    <div className="absolute top-4 right-4 w-6 h-6 border-2 border-green-600 flex items-center justify-center rounded-sm">
                      <div className="w-3 h-3 rounded-full bg-green-600" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-headline text-xl font-bold text-on-surface truncate">
                        {item.name}
                      </h4>
                      {item.shortCode && (
                        <span className="inline-block mt-1 text-[10px] font-mono font-bold text-secondary bg-surface-container px-1.5 py-0.5 rounded">
                          {item.shortCode}
                        </span>
                      )}
                    </div>
                    <span className="text-primary font-black text-lg shrink-0">
                      {formatCurrency(item.basePrice.toString())}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-xs text-secondary mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  <div className="text-xs text-stone-400 mb-3">
                    {item.category.name}
                    {item.preparationTime && ` · ${item.preparationTime} min`}
                  </div>

                  {/* Variants */}
                  {item.variants.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {item.variants.map((v) => (
                        <span
                          key={v.id}
                          className="px-2 py-1 bg-stone-100 rounded text-[10px] font-bold text-stone-500 uppercase tracking-tighter"
                        >
                          {v.name} ({formatCurrency(v.price.toString())})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add-ons */}
                  {item.addOns.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {item.addOns.map((a) => (
                        <span
                          key={a.id}
                          className="px-2 py-1 bg-primary/5 rounded text-[10px] font-bold text-primary uppercase tracking-tighter"
                        >
                          + {a.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setMenuItemDialogOpen(true);
                      }}
                      className="flex-1 py-2 bg-surface-container-high rounded-lg text-sm font-bold text-on-surface hover:bg-surface-container-highest transition-all"
                    >
                      Edit Item
                    </button>
                    <button
                      onClick={() => {
                        setSelectedItemForVA(item);
                        setVariantAddonDialogOpen(true);
                      }}
                      className="px-3 py-2 bg-stone-100 rounded-lg text-stone-400 hover:text-tertiary transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">tune</span>
                    </button>
                    <button
                      onClick={() => handleToggleAvailability(item.id)}
                      className="px-3 py-2 bg-stone-100 rounded-lg text-stone-400 hover:text-orange-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {item.isAvailable ? "visibility" : "visibility_off"}
                      </span>
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="px-3 py-2 bg-stone-100 rounded-lg text-stone-400 hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Add Card */}
            <button
              onClick={() => {
                setEditingItem(null);
                setMenuItemDialogOpen(true);
              }}
              className="col-span-1 bg-white border-4 border-dashed border-stone-100 rounded-xl flex flex-col items-center justify-center p-8 text-center group cursor-pointer hover:border-primary/20 hover:bg-primary/5 transition-all min-h-[300px]"
            >
              <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <span className="material-symbols-outlined text-3xl text-stone-300 group-hover:text-primary transition-colors">
                  add_circle
                </span>
              </div>
              <p className="font-headline font-bold text-stone-400 group-hover:text-primary">
                Create New Item
              </p>
              <p className="text-xs text-stone-300 group-hover:text-primary/60">
                Click to add a menu item
              </p>
            </button>
          </div>
          )}
        </div>
      </div>

      <CategoryDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />
      <MenuItemDialog
        open={menuItemDialogOpen}
        onOpenChange={setMenuItemDialogOpen}
        menuItem={editingItem}
        categories={categories}
      />
      <VariantAddOnDialog
        open={variantAddonDialogOpen}
        onOpenChange={setVariantAddonDialogOpen}
        menuItem={selectedItemForVA}
      />
      <MenuImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
    </div>
  );
}
