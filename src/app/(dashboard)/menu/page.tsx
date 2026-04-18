import { getCategories, getMenuItems } from "@/lib/actions/menu-actions";
import { MenuPageClient } from "./menu-page-client";

export default async function MenuPage() {
  const [categories, menuItems] = await Promise.all([
    getCategories(),
    getMenuItems(),
  ]);

  return <MenuPageClient categories={categories} menuItems={menuItems} />;
}
