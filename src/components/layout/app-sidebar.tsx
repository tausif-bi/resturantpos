"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { hasPermission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";

type NavItem = {
  title: string;
  href: string;
  icon: string;
  permission: string | null;
  children?: { title: string; href: string; permission: string | null }[];
};

const navItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: "dashboard",
    permission: null,
  },
  {
    title: "POS",
    href: "/pos",
    icon: "point_of_sale",
    permission: "create_order",
    children: [
      { title: "Floor Map", href: "/pos", permission: "create_order" },
      { title: "Orders", href: "/orders", permission: "create_order" },
    ],
  },
  {
    title: "Menu",
    href: "/menu",
    icon: "restaurant_menu",
    permission: "manage_menu",
    children: [
      { title: "All Items", href: "/menu", permission: "manage_menu" },
      { title: "Settings", href: "/settings/taxes", permission: "manage_settings" },
    ],
  },
  {
    title: "Kitchen",
    href: "/kitchen",
    icon: "skillet",
    permission: "view_kot",
  },
  {
    title: "Inventory",
    href: "/inventory",
    icon: "inventory_2",
    permission: "manage_inventory",
  },
  {
    title: "Analytics",
    href: "/reports",
    icon: "analytics",
    permission: "view_reports",
    children: [
      { title: "Sales", href: "/reports", permission: "view_reports" },
      { title: "Customers", href: "/customers", permission: "view_customers" },
      { title: "Staff", href: "/staff", permission: "manage_staff" },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role as UserRole | undefined;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  function toggleExpand(title: string) {
    setExpandedItems((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    );
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  function isGroupActive(item: NavItem) {
    if (isActive(item.href)) return true;
    return item.children?.some((child) => isActive(child.href)) ?? false;
  }

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-stone-100 flex flex-col py-6 z-50">
      {/* Brand */}
      <div className="px-6 mb-10">
        <h1 className="text-xl font-bold text-orange-800 font-headline">
          RestroPOS
        </h1>
        <p className="text-xs font-semibold tracking-tight text-stone-500 uppercase mt-1">
          Command Center
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          if (
            item.permission &&
            userRole &&
            !hasPermission(userRole, item.permission)
          )
            return null;

          const active = isGroupActive(item);
          const expanded = expandedItems.includes(item.title) || active;
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.title}>
              {hasChildren ? (
                <button
                  onClick={() => toggleExpand(item.title)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all active:scale-95 duration-150 ml-4 ${
                    active
                      ? "bg-white text-orange-700 rounded-l-full shadow-sm border-l-4 border-blue-600"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="font-headline text-sm font-semibold tracking-tight flex-1 text-left">
                    {item.title}
                  </span>
                  <span
                    className={`material-symbols-outlined text-[16px] transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  >
                    expand_more
                  </span>
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 transition-all active:scale-95 duration-150 ml-4 ${
                    active
                      ? "bg-white text-orange-700 rounded-l-full shadow-sm border-l-4 border-blue-600"
                      : "text-stone-500 hover:text-stone-900 hover:bg-stone-200/50"
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {item.icon}
                  </span>
                  <span className="font-headline text-sm font-semibold tracking-tight">
                    {item.title}
                  </span>
                </Link>
              )}

              {/* Children */}
              {hasChildren && expanded && (
                <div className="ml-12 mt-1 space-y-1">
                  {item.children!.map((child) => {
                    if (
                      child.permission &&
                      userRole &&
                      !hasPermission(userRole, child.permission)
                    )
                      return null;

                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
                          isActive(child.href)
                            ? "text-orange-700 bg-orange-50"
                            : "text-stone-400 hover:text-stone-700 hover:bg-stone-200/50"
                        }`}
                      >
                        {child.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="mt-auto px-6 space-y-4">
        <Link
          href="/pos"
          className="w-full primary-gradient text-white py-4 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined">add</span>
          New Order
        </Link>
        <div className="pt-4 border-t border-stone-200 space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-2 py-2 text-stone-500 hover:text-stone-900 transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">
              settings
            </span>
            <span className="font-headline text-sm font-semibold">
              Settings
            </span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 px-2 py-2 text-stone-500 hover:text-stone-900 transition-colors w-full"
          >
            <span className="material-symbols-outlined text-[20px]">
              logout
            </span>
            <span className="font-headline text-sm font-semibold">
              Logout
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
