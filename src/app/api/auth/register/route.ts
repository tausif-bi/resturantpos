import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, restaurantName, phone } = body;

    if (!name || !email || !password || !restaurantName) {
      return NextResponse.json(
        { error: "Name, email, password, and restaurant name are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create slug from restaurant name
    const slug = restaurantName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Check slug uniqueness
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug },
    });

    const finalSlug = existingTenant
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Create tenant, restaurant, subscription, and owner user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: restaurantName,
          slug: finalSlug,
          email,
          phone,
        },
      });

      await tx.subscription.create({
        data: {
          tenantId: tenant.id,
          plan: "STARTER",
          status: "TRIAL",
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          maxOutlets: 1,
        },
      });

      const restaurant = await tx.restaurant.create({
        data: {
          tenantId: tenant.id,
          name: restaurantName,
          slug: "main",
          phone,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name,
          email,
          phone,
          passwordHash,
          role: "OWNER",
        },
      });

      await tx.staffAssignment.create({
        data: {
          userId: user.id,
          restaurantId: restaurant.id,
        },
      });

      // Create default tax configs for Indian GST
      await tx.taxConfig.createMany({
        data: [
          { restaurantId: restaurant.id, name: "GST 5%", percentage: 5.0 },
          { restaurantId: restaurant.id, name: "GST 12%", percentage: 12.0 },
          { restaurantId: restaurant.id, name: "GST 18%", percentage: 18.0 },
          { restaurantId: restaurant.id, name: "GST 28%", percentage: 28.0 },
        ],
      });

      return { tenant, restaurant, user };
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        tenantId: result.tenant.id,
        restaurantId: result.restaurant.id,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
