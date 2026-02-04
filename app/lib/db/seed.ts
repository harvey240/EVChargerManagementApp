import { db } from "./index";
import { chargers } from "./schema";

async function seed() {
  console.log("Seeding database...");
  console.log("Database URL:", process.env.DATABASE_URL ? "Found" : "Not Found");

  const existingChargers = await db.select().from(chargers);

  if (existingChargers.length > 0) {
    console.log("Chargers already exist. Skipping seeding.");
    process.exit(0);
  }

  await db.insert(chargers).values([
    { name: "Charger 1", status: "available" },
    { name: "Charger 2", status: "available" },
    { name: "Charger 3", status: "available" },
    { name: "Charger 4", status: "available" },
  ]);


  console.log("Database seeded successfully.");
  process.exit(0);
}

seed().catch((error) => {
    console.error("Error seeding database:", error);
    process.exit(1);
});