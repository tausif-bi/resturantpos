import { getActiveKOTs, getRecentReadyKOTs } from "@/lib/actions/kot-actions";
import { KitchenClient } from "./kitchen-client";

export default async function KitchenPage() {
  const [active, ready] = await Promise.all([
    getActiveKOTs(),
    getRecentReadyKOTs(),
  ]);
  return <KitchenClient initialKOTs={active} initialReadyKOTs={ready} />;
}
