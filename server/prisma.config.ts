import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Load environment variables explicitly via dotenv
dotenv.config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "bun prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
