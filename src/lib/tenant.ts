import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { redirect } from "next/navigation";

export async function getTenantScope() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.tenantId) {
    throw new Error("No tenant associated with this user");
  }

  return {
    tenantId: session.user.tenantId,
    restaurantId: session.user.restaurantId,
    userId: session.user.id,
    role: session.user.role,
  };
}

export async function getSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}
