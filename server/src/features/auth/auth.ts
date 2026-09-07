import { betterAuth } from "better-auth";
import { prismaAdapter } from "@better-auth/prisma-adapter";
import { createAuthMiddleware, APIError } from "better-auth/api";
import prisma from "../../prisma";
import { env, getTrustedOrigins } from "../../config/env";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "AGENT",
        input: false,
      },
      deletedAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  trustedOrigins: getTrustedOrigins(),
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "x-real-ip"],
    },
  },
  rateLimit: {
    enabled: env.NODE_ENV === "production",
    window: 60, // 60-second window
    max: 10,    // 10 attempts per minute
    storage: "memory",
  },
  hooks: {
    before: createAuthMiddleware(async (ctx: any) => {
      if (ctx.body && typeof ctx.body.email === "string") {
        ctx.body.email = ctx.body.email.trim().toLowerCase();
      }

      // Prohibit soft-deleted users from logging in
      if (
        ctx.path.startsWith("/sign-in") &&
        ctx.body &&
        typeof ctx.body.email === "string"
      ) {
        const user = await prisma.user.findUnique({
          where: { email: ctx.body.email },
          select: { deletedAt: true },
        });
        if (user?.deletedAt) {
          throw new APIError("UNAUTHORIZED", {
            message: "This account has been deactivated.",
          });
        }
      }
    }),
  },
});

export type Auth = typeof auth;
