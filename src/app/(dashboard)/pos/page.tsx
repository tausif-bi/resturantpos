import { getTablesWithActiveOrders } from "@/lib/actions/table-actions";
import { getCategories, getMenuItems } from "@/lib/actions/menu-actions";
import { getActiveNonDineOrders } from "@/lib/actions/order-actions";
import { POSClient } from "./pos-client";

export default async function POSPage() {
  const [tables, nonDineOrders, categories, menuItems] = await Promise.all([
    getTablesWithActiveOrders(),
    getActiveNonDineOrders(),
    getCategories(),
    getMenuItems(),
  ]);

  return (
    <POSClient
      tables={tables}
      nonDineOrders={nonDineOrders}
      categories={categories}
      menuItems={menuItems}
    />
  );
}
