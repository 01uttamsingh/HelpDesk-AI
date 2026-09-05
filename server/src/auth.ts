import dotenv from "dotenv";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma";

// Ensure environment variables are loaded
dotenv.config();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  trustedOrigins: [process.env.CLIENT_URL || "http://localhost:5173"],
});

export type Auth = typeof auth;
