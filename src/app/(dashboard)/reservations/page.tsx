import { getReservations } from "@/lib/actions/reservation-actions";
import { getTables } from "@/lib/actions/table-actions";
import { ReservationsClient } from "./reservations-client";

export default async function ReservationsPage() {
  // Show today's reservations + everything in the next 30 days by default.
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const horizon = new Date(startOfToday);
  horizon.setDate(horizon.getDate() + 30);

  const [reservations, tables] = await Promise.all([
    getReservations({ from: startOfToday, to: horizon }),
    getTables(),
  ]);

  return <ReservationsClient initialReservations={reservations} tables={tables} />;
}
