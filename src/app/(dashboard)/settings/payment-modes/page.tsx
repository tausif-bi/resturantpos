export default function PaymentModesPage() {
  return (
    <div>
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
            Payment Modes
          </h2>
          <p className="text-secondary mt-1">
            Configure accepted payment methods for your restaurant
          </p>
        </div>
        <button className="flex items-center gap-2 px-6 py-3 primary-gradient rounded-xl font-bold text-white shadow-xl">
          <span className="material-symbols-outlined">add_circle</span>
          Add Payment Mode
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: "payments", name: "Cash", enabled: true },
          { icon: "credit_card", name: "Card", enabled: true },
          { icon: "qr_code_2", name: "UPI / QR", enabled: true },
          { icon: "account_balance_wallet", name: "Wallet", enabled: false },
        ].map((mode) => (
          <div
            key={mode.name}
            className={`bg-surface-container-lowest p-6 rounded-xl shadow-sm flex items-center gap-4 ${
              !mode.enabled ? "opacity-50" : ""
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">{mode.icon}</span>
            </div>
            <div className="flex-1">
              <p className="font-headline font-bold text-on-surface">{mode.name}</p>
              <p className="text-xs text-secondary">{mode.enabled ? "Enabled" : "Disabled"}</p>
            </div>
            <div
              className={`w-10 h-5 rounded-full relative cursor-pointer ${
                mode.enabled ? "bg-primary" : "bg-stone-300"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                  mode.enabled ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
