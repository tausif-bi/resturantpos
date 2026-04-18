import Link from "next/link";

const settingsLinks = [
  {
    title: "Restaurant",
    description: "Name, address, GST, FSSAI, logo, and contact details",
    href: "/settings/restaurant",
    icon: "storefront",
  },
  {
    title: "Tables",
    description: "Manage table layout, floors, and capacity",
    href: "/settings/tables",
    icon: "table_restaurant",
  },
  {
    title: "Taxes",
    description: "Configure GST rates and tax rules",
    href: "/settings/taxes",
    icon: "receipt",
  },
  {
    title: "Payment Modes",
    description: "Configure accepted payment methods",
    href: "/settings/payment-modes",
    icon: "credit_card",
  },
  {
    title: "Outlets",
    description: "Manage multiple restaurant outlets",
    href: "/settings/outlets",
    icon: "store",
  },
];

export default function SettingsPage() {
  return (
    <div>
      <div className="mb-10">
        <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
          Settings
        </h2>
        <p className="text-secondary mt-1">
          Configure your restaurant settings
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsLinks.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer group">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <span className="material-symbols-outlined text-secondary group-hover:text-primary transition-colors">
                    {item.icon}
                  </span>
                </div>
                <h3 className="font-headline font-bold text-on-surface text-lg">
                  {item.title}
                </h3>
              </div>
              <p className="text-sm text-secondary">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
