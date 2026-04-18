import { getActiveKOTs } from "@/lib/actions/kot-actions";
import { KitchenClient } from "./kitchen-client";

export default async function KitchenPage() {
  const kots = await getActiveKOTs();
  return <KitchenClient initialKOTs={kots} />;
}
