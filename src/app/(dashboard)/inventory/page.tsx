export default function InventoryPage() {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Inventory
          </h2>
          <p className="text-secondary mt-1">
            Manage stock, recipes, and purchase orders
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl">
          <span className="material-symbols-outlined">add_circle</span>
          Add Stock Item
        </button>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">inventory_2</span>
        <p className="font-headline font-bold text-on-surface text-lg">Inventory Management</p>
        <p className="text-secondary text-sm mt-2">
          Stock tracking, recipes, and purchase orders coming in Phase 3.
        </p>
      </div>
    </div>
  );
}
