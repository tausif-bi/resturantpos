import { getTaxConfigs } from "@/lib/actions/menu-actions";
import { TaxConfigClient } from "./tax-config-client";

export default async function TaxesPage() {
  const taxConfigs = await getTaxConfigs();
  return <TaxConfigClient taxConfigs={taxConfigs} />;
}
