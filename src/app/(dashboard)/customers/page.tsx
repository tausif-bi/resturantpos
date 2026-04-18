export default function CustomersPage() {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Customers
          </h2>
          <p className="text-secondary mt-1">
            Manage customer database and order history
          </p>
        </div>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">groups</span>
        <p className="font-headline font-bold text-on-surface text-lg">Customer Management</p>
        <p className="text-secondary text-sm mt-2">
          Customer profiles will appear here as orders are placed.
        </p>
      </div>
    </div>
  );
}
