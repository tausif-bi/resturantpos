export default function OrdersPage() {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Orders
          </h2>
          <p className="text-secondary mt-1">
            View and manage all orders
          </p>
        </div>
      </div>
      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-12 text-center">
        <span className="material-symbols-outlined text-5xl text-stone-300 mb-4">receipt_long</span>
        <p className="font-headline font-bold text-on-surface text-lg">Order History</p>
        <p className="text-secondary text-sm mt-2">
          Start taking orders from the POS to see them here.
        </p>
      </div>
    </div>
  );
}
