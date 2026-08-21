import { db } from './index.js';
import { aidPackages } from './schema.js';
import dotenv from 'dotenv';

// Ensure env vars are loaded so db connection works
dotenv.config();

const seed = async () => {
  const packages = [
    {
      id: "11111111-1111-1111-1111-111111111111",
      title: "Emergency Food Ration",
      priceInInr: 1500,
      itemsSummary: {}
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      title: "Medical Supply Kit",
      priceInInr: 2500,
      itemsSummary: {}
    },
    {
      id: "33333333-3333-3333-3333-333333333333",
      title: "Temporary Shelter Kit",
      priceInInr: 5000,
      itemsSummary: {}
    }
  ];

  try {
    console.log("Seeding aid packages...");
    await db.insert(aidPackages).values(packages);
    console.log("Seed successful!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding aid packages:", error);
    process.exit(1);
  }
};

seed();
