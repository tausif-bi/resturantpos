"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const topNavLinks = [
  { title: "Floor Map", href: "/pos" },
  { title: "Quick Pay", href: "/orders" },
  { title: "Reservation", href: "/customers" },
];

export function Topbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const user = session?.user;

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 backdrop-blur-md border-b border-stone-200/50 shadow-sm">
      <div className="flex justify-between items-center px-8 w-full h-full">
        <div className="flex items-center gap-8">
          <span className="font-headline font-black text-orange-700 text-lg uppercase tracking-wider">
            RestroPOS
          </span>
          <nav className="hidden md:flex gap-6 text-sm font-medium">
            {topNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={
                  pathname.startsWith(link.href)
                    ? "text-orange-700 border-b-2 border-orange-700 pb-1"
                    : "text-stone-500 hover:text-orange-600 transition-colors"
                }
              >
                {link.title}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group">
            <input
              className="bg-surface-container border-none rounded-full px-5 py-2 text-sm w-64 focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-stone-400"
              placeholder="Search orders..."
              type="text"
            />
            <span className="material-symbols-outlined absolute right-3 top-2 text-stone-400">
              search
            </span>
          </div>
          <div className="flex items-center gap-4 text-stone-500">
            <button className="hover:text-orange-600 transition-colors relative">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-9 h-9 rounded-full bg-stone-200 overflow-hidden flex items-center justify-center text-sm font-bold text-stone-600">
              {user?.name
                ? user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U"}
            </div>
            <div className="h-8 w-px bg-stone-200 mx-1" />
            <span className="text-primary font-bold text-sm">
              {user?.role?.replace("_", " ")}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
