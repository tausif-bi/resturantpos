import { getTables } from "@/lib/actions/table-actions";
import { TablesClient } from "./tables-client";

export default async function TablesSettingsPage() {
  const tables = await getTables();
  return <TablesClient tables={tables} />;
}
