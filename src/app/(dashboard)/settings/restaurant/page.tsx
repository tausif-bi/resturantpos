import { getRestaurant } from "@/lib/actions/settings-actions";
import { RestaurantSettingsClient } from "./restaurant-settings-client";

export default async function RestaurantSettingsPage() {
  const restaurant = await getRestaurant();
  if (!restaurant) return <p>Restaurant not found</p>;
  return <RestaurantSettingsClient restaurant={restaurant} />;
}
