import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Admin user ────────────────────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@fixr.af";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";

  const existingAdmin = await prisma.adminProfile.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const adminUser = await prisma.user.create({
      data: {
        phone: "+93000000000",
        name: "Fixr Admin",
        role: UserRole.ADMIN,
        adminProfile: {
          create: { email: adminEmail, password: hashedPassword },
        },
      },
    });
    console.log(
      `✅ Admin user created: ${adminEmail} (user id: ${adminUser.id})`,
    );
  } else {
    console.log(`⏭  Admin already exists: ${adminEmail}`);
  }

  // ─── Credit rate ───────────────────────────────────────────────────────────
  const existingRate = await prisma.creditRate.findFirst();
  if (!existingRate) {
    await prisma.creditRate.create({
      data: { afnPerCredit: 50, welcomeCredits: 5, welcomeExpiryDays: 30 },
    });
    console.log(
      "✅ Default credit rate set: 50 AFN/credit, 5 welcome credits (30-day expiry)",
    );
  } else {
    console.log("⏭  Credit rate already configured");
  }

  // ─── Zones ─────────────────────────────────────────────────────────────────
  const zones = [
    {
      name: "کارته سه",
      nameEn: "Karte Seh",
      latitude: 34.5143,
      longitude: 69.1716,
    },
    {
      name: "خیر خانه",
      nameEn: "Khair Khana",
      latitude: 34.5811,
      longitude: 69.1569,
    },
    {
      name: "شهر نو",
      nameEn: "Shahr-e-Naw",
      latitude: 34.5262,
      longitude: 69.1815,
    },
    {
      name: "ماکروریان",
      nameEn: "Macroyan",
      latitude: 34.5158,
      longitude: 69.2033,
    },
    {
      name: "کارته چهار",
      nameEn: "Karte Char",
      latitude: 34.5041,
      longitude: 69.1739,
    },
    {
      name: "کارته پروان",
      nameEn: "Karte Parwan",
      latitude: 34.5421,
      longitude: 69.1585,
    },
    {
      name: "تایمنی",
      nameEn: "Taimani",
      latitude: 34.5369,
      longitude: 69.1748,
    },
    {
      name: "وزیر اکبر خان",
      nameEn: "Wazir Akbar Khan",
      latitude: 34.5289,
      longitude: 69.2005,
    },
    { name: "سیلو", nameEn: "Silo", latitude: 34.5589, longitude: 69.1846 },
    {
      name: "دشت برچی",
      nameEn: "Dasht-e-Barchi",
      latitude: 34.4991,
      longitude: 69.0879,
    },
    {
      name: "پل سرخ",
      nameEn: "Pul-e-Surkh",
      latitude: 34.4893,
      longitude: 69.1653,
    },
    {
      name: "چهلستون",
      nameEn: "Chihilsatoon",
      latitude: 34.5199,
      longitude: 69.1672,
    },
  ];

  let zonesCreated = 0;
  for (const zone of zones) {
    const existing = await prisma.zone.findUnique({
      where: { name: zone.name },
    });
    if (!existing) {
      await prisma.zone.create({ data: zone });
      zonesCreated++;
    }
  }
  console.log(
    `✅ Zones: ${zonesCreated} created, ${zones.length - zonesCreated} already existed`,
  );

  // ─── Categories ────────────────────────────────────────────────────────────
  const categories = [
    { name: "لوله‌کشی", nameEn: "Plumbing", icon: "plumbing" },
    { name: "برق‌کاری", nameEn: "Electrical", icon: "electric-bolt" },
    { name: "نجاری", nameEn: "Carpentry", icon: "handyman" },
    { name: "رنگ‌کاری", nameEn: "Painting", icon: "format-paint" },
    {
      name: "تعمیر لوازم خانگی",
      nameEn: "Appliance Repair",
      icon: "construction",
    },
    { name: "نظافت", nameEn: "Cleaning", icon: "auto-awesome" },
    { name: "ساختمان‌سازی", nameEn: "Construction", icon: "house" },
    { name: "سایر", nameEn: "Other", icon: "more-horizontal" },
  ];

  let catsCreated = 0;
  for (const cat of categories) {
    const existing = await prisma.category.findUnique({
      where: { name: cat.name },
    });
    if (!existing) {
      await prisma.category.create({ data: cat });
      catsCreated++;
    }
  }
  console.log(
    `✅ Categories: ${catsCreated} created, ${categories.length - catsCreated} already existed`,
  );

  console.log("\n🎉 Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
