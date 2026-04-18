import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.orderItemAddOn.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderTax.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.kOT.deleteMany();
  await prisma.order.deleteMany();
  await prisma.wastageEntry.deleteMany();
  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.recipeItem.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.menuItemTax.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.category.deleteMany();
  await prisma.taxConfig.deleteMany();
  await prisma.table.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.restaurant.deleteMany();
  await prisma.tenant.deleteMany();

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: "Spice Garden Restaurant",
      slug: "spice-garden",
      email: "admin@spicegarden.com",
      phone: "+91 9876543210",
    },
  });

  // Create subscription (14-day trial)
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      plan: "STARTER",
      status: "TRIAL",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      maxOutlets: 1,
    },
  });

  // Create restaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      tenantId: tenant.id,
      name: "Spice Garden - Main Branch",
      slug: "main",
      address: "123 Food Street, Koramangala",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560034",
      phone: "+91 9876543210",
      gstNumber: "29AABCU9603R1ZM",
      fssaiNumber: "12345678901234",
    },
  });

  // Create users
  const passwordHash = await bcrypt.hash("admin123", 12);

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Rahul Sharma",
      email: "admin@spicegarden.com",
      phone: "+91 9876543210",
      passwordHash,
      role: "OWNER",
    },
  });

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Priya Patel",
      email: "manager@spicegarden.com",
      phone: "+91 9876543211",
      passwordHash,
      role: "MANAGER",
    },
  });

  const cashier = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Amit Kumar",
      email: "cashier@spicegarden.com",
      phone: "+91 9876543212",
      passwordHash,
      role: "CASHIER",
    },
  });

  const kitchenStaff = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Suresh Cook",
      email: "kitchen@spicegarden.com",
      phone: "+91 9876543213",
      passwordHash,
      role: "KITCHEN_STAFF",
    },
  });

  const waiter = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Ravi Waiter",
      email: "waiter@spicegarden.com",
      phone: "+91 9876543214",
      passwordHash,
      role: "WAITER",
    },
  });

  // Assign all staff to the restaurant
  for (const user of [owner, manager, cashier, kitchenStaff, waiter]) {
    await prisma.staffAssignment.create({
      data: { userId: user.id, restaurantId: restaurant.id },
    });
  }

  // Create tax configs
  const gst5 = await prisma.taxConfig.create({
    data: { restaurantId: restaurant.id, name: "GST 5%", percentage: 5.0 },
  });
  const gst12 = await prisma.taxConfig.create({
    data: { restaurantId: restaurant.id, name: "GST 12%", percentage: 12.0 },
  });
  const gst18 = await prisma.taxConfig.create({
    data: { restaurantId: restaurant.id, name: "GST 18%", percentage: 18.0 },
  });

  // Create categories
  const starters = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Starters",
      description: "Appetizers and small bites",
      sortOrder: 1,
    },
  });

  const mainCourse = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Main Course",
      description: "Rice, curries, and gravies",
      sortOrder: 2,
    },
  });

  const breads = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Breads",
      description: "Naan, roti, and more",
      sortOrder: 3,
    },
  });

  const beverages = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Beverages",
      description: "Drinks and refreshments",
      sortOrder: 4,
    },
  });

  const desserts = await prisma.category.create({
    data: {
      restaurantId: restaurant.id,
      name: "Desserts",
      description: "Sweet treats",
      sortOrder: 5,
    },
  });

  // Create menu items with variants and add-ons

  // Starters
  const paneerTikka = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: starters.id,
      name: "Paneer Tikka",
      description: "Marinated cottage cheese grilled in tandoor",
      basePrice: 249,
      isVeg: true,
      preparationTime: 20,
      sortOrder: 1,
    },
  });
  await prisma.variant.createMany({
    data: [
      { menuItemId: paneerTikka.id, name: "Half", price: 149, sortOrder: 1 },
      { menuItemId: paneerTikka.id, name: "Full", price: 249, sortOrder: 2 },
    ],
  });
  await prisma.menuItemTax.create({
    data: { menuItemId: paneerTikka.id, taxConfigId: gst5.id },
  });

  const chickenTikka = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: starters.id,
      name: "Chicken Tikka",
      description: "Spiced chicken pieces cooked in tandoor",
      basePrice: 299,
      isVeg: false,
      preparationTime: 25,
      sortOrder: 2,
    },
  });
  await prisma.variant.createMany({
    data: [
      { menuItemId: chickenTikka.id, name: "Half", price: 179, sortOrder: 1 },
      { menuItemId: chickenTikka.id, name: "Full", price: 299, sortOrder: 2 },
    ],
  });
  await prisma.menuItemTax.create({
    data: { menuItemId: chickenTikka.id, taxConfigId: gst5.id },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: starters.id,
      name: "Veg Spring Roll",
      description: "Crispy rolls stuffed with mixed vegetables",
      basePrice: 179,
      isVeg: true,
      preparationTime: 15,
      sortOrder: 3,
      taxes: { create: { taxConfigId: gst5.id } },
    },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: starters.id,
      name: "Fish Amritsari",
      description: "Crispy fried fish with spices",
      basePrice: 349,
      isVeg: false,
      preparationTime: 20,
      sortOrder: 4,
      taxes: { create: { taxConfigId: gst5.id } },
    },
  });

  // Main Course
  const butterChicken = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: mainCourse.id,
      name: "Butter Chicken",
      description: "Tender chicken in creamy tomato-butter gravy",
      basePrice: 349,
      isVeg: false,
      preparationTime: 30,
      sortOrder: 1,
    },
  });
  await prisma.variant.createMany({
    data: [
      { menuItemId: butterChicken.id, name: "Half", price: 219, sortOrder: 1 },
      { menuItemId: butterChicken.id, name: "Full", price: 349, sortOrder: 2 },
    ],
  });
  await prisma.addOn.createMany({
    data: [
      { menuItemId: butterChicken.id, name: "Extra Gravy", price: 49 },
      { menuItemId: butterChicken.id, name: "Boneless", price: 30 },
    ],
  });
  await prisma.menuItemTax.create({
    data: { menuItemId: butterChicken.id, taxConfigId: gst5.id },
  });

  const dalMakhani = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: mainCourse.id,
      name: "Dal Makhani",
      description: "Slow-cooked black lentils in rich buttery gravy",
      basePrice: 249,
      isVeg: true,
      preparationTime: 25,
      sortOrder: 2,
    },
  });
  await prisma.menuItemTax.create({
    data: { menuItemId: dalMakhani.id, taxConfigId: gst5.id },
  });

  const biryani = await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: mainCourse.id,
      name: "Chicken Biryani",
      description: "Fragrant basmati rice layered with spiced chicken",
      basePrice: 349,
      isVeg: false,
      preparationTime: 35,
      sortOrder: 3,
    },
  });
  await prisma.variant.createMany({
    data: [
      { menuItemId: biryani.id, name: "Half", price: 199, sortOrder: 1 },
      { menuItemId: biryani.id, name: "Full", price: 349, sortOrder: 2 },
    ],
  });
  await prisma.addOn.createMany({
    data: [
      { menuItemId: biryani.id, name: "Extra Raita", price: 29 },
      { menuItemId: biryani.id, name: "Egg", price: 20 },
    ],
  });
  await prisma.menuItemTax.create({
    data: { menuItemId: biryani.id, taxConfigId: gst5.id },
  });

  await prisma.menuItem.create({
    data: {
      restaurantId: restaurant.id,
      categoryId: mainCourse.id,
      name: "Palak Paneer",
      description: "Cottage cheese cubes in creamy spinach gravy",
      basePrice: 269,
      isVeg: true,
      preparationTime: 25,
      sortOrder: 4,
      taxes: { create: { taxConfigId: gst5.id } },
    },
  });

  // Breads
  for (const bread of [
    { name: "Butter Naan", price: 59, isVeg: true },
    { name: "Garlic Naan", price: 69, isVeg: true },
    { name: "Tandoori Roti", price: 39, isVeg: true },
    { name: "Laccha Paratha", price: 59, isVeg: true },
    { name: "Cheese Naan", price: 89, isVeg: true },
  ]) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: breads.id,
        name: bread.name,
        basePrice: bread.price,
        isVeg: bread.isVeg,
        preparationTime: 10,
        sortOrder: 0,
        taxes: { create: { taxConfigId: gst5.id } },
      },
    });
  }

  // Beverages
  for (const bev of [
    { name: "Masala Chai", price: 49, isVeg: true },
    { name: "Fresh Lime Soda", price: 79, isVeg: true },
    { name: "Mango Lassi", price: 99, isVeg: true },
    { name: "Cold Coffee", price: 129, isVeg: true },
    { name: "Buttermilk", price: 49, isVeg: true },
  ]) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: beverages.id,
        name: bev.name,
        basePrice: bev.price,
        isVeg: bev.isVeg,
        preparationTime: 5,
        sortOrder: 0,
        taxes: { create: { taxConfigId: gst12.id } },
      },
    });
  }

  // Desserts
  for (const dessert of [
    { name: "Gulab Jamun", price: 99, desc: "Soft milk dumplings in sugar syrup" },
    { name: "Ras Malai", price: 129, desc: "Soft paneer balls in sweetened milk" },
    { name: "Kulfi", price: 89, desc: "Traditional Indian ice cream" },
  ]) {
    await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        categoryId: desserts.id,
        name: dessert.name,
        description: dessert.desc,
        basePrice: dessert.price,
        isVeg: true,
        preparationTime: 5,
        sortOrder: 0,
        taxes: { create: { taxConfigId: gst5.id } },
      },
    });
  }

  // Create tables
  const floors = [
    { floor: "Ground Floor", tables: ["T1", "T2", "T3", "T4", "T5", "T6"] },
    { floor: "First Floor", tables: ["T7", "T8", "T9", "T10"] },
    { floor: "Terrace", tables: ["T11", "T12"] },
  ];

  for (const { floor, tables } of floors) {
    for (let i = 0; i < tables.length; i++) {
      await prisma.table.create({
        data: {
          restaurantId: restaurant.id,
          name: tables[i],
          capacity: i < 2 ? 2 : 4,
          floor,
          positionX: i % 3,
          positionY: Math.floor(i / 3),
        },
      });
    }
  }

  // Create sample customers
  await prisma.customer.createMany({
    data: [
      {
        tenantId: tenant.id,
        name: "Vikram Singh",
        phone: "+91 9000000001",
        email: "vikram@example.com",
      },
      {
        tenantId: tenant.id,
        name: "Anita Desai",
        phone: "+91 9000000002",
        email: "anita@example.com",
      },
      {
        tenantId: tenant.id,
        name: "Raj Malhotra",
        phone: "+91 9000000003",
      },
    ],
  });

  console.log("Seed completed successfully!");
  console.log("");
  console.log("Demo accounts (all passwords: admin123):");
  console.log("  Owner:    admin@spicegarden.com");
  console.log("  Manager:  manager@spicegarden.com");
  console.log("  Cashier:  cashier@spicegarden.com");
  console.log("  Kitchen:  kitchen@spicegarden.com");
  console.log("  Waiter:   waiter@spicegarden.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
