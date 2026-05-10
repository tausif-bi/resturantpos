"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { settingsLinks } from "../settings/page";

type Tile =
  | {
      kind: "link";
      title: string;
      icon: string;
      href: string;
    }
  | {
      kind: "action";
      title: string;
      icon: string;
      onClick: () => void;
    };

const operationsTiles: Tile[] = [
  { kind: "link", title: "Orders", icon: "receipt_long", href: "/orders" },
  { kind: "link", title: "Online Orders", icon: "cloud_sync", href: "/operations/online-orders" },
  { kind: "link", title: "KOTs", icon: "skillet", href: "/kitchen" },
  { kind: "link", title: "Customers", icon: "groups", href: "/customers" },
  { kind: "link", title: "Cash Flow", icon: "account_balance", href: "/operations/cash-flow" },
  { kind: "link", title: "Expense", icon: "request_quote", href: "/operations/expense" },
  { kind: "link", title: "Withdrawal", icon: "outbox", href: "/operations/withdrawal" },
  { kind: "link", title: "Cash Top-Up", icon: "savings", href: "/operations/cash-top-up" },
  { kind: "link", title: "Inventory", icon: "inventory_2", href: "/inventory" },
  { kind: "link", title: "Alerts", icon: "notifications_active", href: "/operations/alerts" },
  { kind: "link", title: "Tables", icon: "table_restaurant", href: "/settings/tables" },
  { kind: "link", title: "Virtual Wallet", icon: "account_balance_wallet", href: "/operations/wallet" },
  {
    kind: "action",
    title: "Manual Sync",
    icon: "sync",
    onClick: () => toast.success("Sync started"),
  },
  { kind: "link", title: "Help", icon: "help", href: "/operations/help" },
  { kind: "link", title: "Live View", icon: "live_tv", href: "/operations/live-view" },
  { kind: "link", title: "Due Payment", icon: "schedule", href: "/operations/due-payment" },
  { kind: "link", title: "Feedback", icon: "rate_review", href: "/operations/feedback" },
  { kind: "link", title: "Delivery Boys", icon: "delivery_dining", href: "/staff?role=DELIVERY" },
  { kind: "link", title: "Reports", icon: "analytics", href: "/reports" },
  { kind: "link", title: "Reservations", icon: "event_available", href: "/reservations" },
  { kind: "link", title: "Settings", icon: "settings", href: "/settings" },
  {
    kind: "action",
    title: "Logout",
    icon: "logout",
    onClick: () => signOut({ callbackUrl: "/login" }),
  },
];

export function OperationsClient() {
  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-3xl font-black font-headline tracking-tight text-on-surface">
          Operations
        </h2>
        <p className="text-secondary mt-1">
          Quick shortcuts to every part of your restaurant
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-4">
        {operationsTiles.map((tile) => (
          <OperationTile key={tile.title} tile={tile} />
        ))}
      </div>

      <div>
        <h3 className="text-lg font-bold font-headline text-on-surface mb-4">
          Set the configuration for your restaurant
        </h3>
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
    </div>
  );
}

function OperationTile({ tile }: { tile: Tile }) {
  const inner = (
    <div className="aspect-square bg-surface-container-lowest rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all p-4 flex flex-col items-center justify-center text-center gap-2 border border-outline-variant/20 group cursor-pointer">
      <div className="w-14 h-14 rounded-2xl bg-surface-container-high group-hover:bg-primary/10 flex items-center justify-center transition-colors">
        <span className="material-symbols-outlined text-3xl text-on-surface group-hover:text-primary transition-colors">
          {tile.icon}
        </span>
      </div>
      <span className="text-xs font-bold text-on-surface leading-tight">
        {tile.title}
      </span>
    </div>
  );

  if (tile.kind === "link") {
    return <Link href={tile.href}>{inner}</Link>;
  }
  return (
    <button onClick={tile.onClick} className="text-left w-full">
      {inner}
    </button>
  );
}
