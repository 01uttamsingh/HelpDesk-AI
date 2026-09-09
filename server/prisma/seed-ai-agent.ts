import dotenv from "dotenv";
import path from "path";
import { hashPassword } from "better-auth/crypto";
import { Role } from "@prisma/client";
import prisma from "../src/prisma";

if (process.env.NODE_ENV === "test") {
  dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
  dotenv.config({ path: path.resolve(process.cwd(), "server/.env.test"), override: true });
}
dotenv.config();

export const AI_AGENT_EMAIL = (process.env.AI_AGENT_EMAIL || "ai@example.com").trim().toLowerCase();
export const AI_AGENT_NAME = "AI";
export const AI_AGENT_PASSWORD = process.env.AI_AGENT_PASSWORD || "uvdb1357";

export async function seedAiAgent() {
  console.log(`🤖 Checking AI Agent (${AI_AGENT_EMAIL})...`);

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: AI_AGENT_EMAIL },
        { name: AI_AGENT_NAME, role: Role.AGENT },
      ],
    },
    include: { accounts: true },
  });

  const hashedPassword = await hashPassword(AI_AGENT_PASSWORD);

  if (existingUser) {
    console.log(`AI Agent already exists (id: ${existingUser.id}, email: ${existingUser.email}). Updating...`);

    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        name: AI_AGENT_NAME,
        email: AI_AGENT_EMAIL,
        role: Role.AGENT,
        emailVerified: true,
        deletedAt: null,
      },
    });

    const credentialAccount = existingUser.accounts.find(
      (acc) => acc.providerId === "credential"
    );

    if (credentialAccount) {
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: hashedPassword },
      });
    } else {
      await prisma.account.create({
        data: {
          id: crypto.randomUUID(),
          accountId: existingUser.id,
          providerId: "credential",
          issuer: "local:credential",
          userId: existingUser.id,
          password: hashedPassword,
        },
      });
    }

    console.log(`✅ AI Agent updated successfully! (id: ${updated.id}, email: ${updated.email}, role: ${updated.role})`);
    return updated;
  } else {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    const created = await prisma.user.create({
      data: {
        id: userId,
        name: AI_AGENT_NAME,
        email: AI_AGENT_EMAIL,
        role: Role.AGENT,
        emailVerified: true,
        accounts: {
          create: {
            id: accountId,
            accountId: userId,
            providerId: "credential",
            issuer: "local:credential",
            password: hashedPassword,
          },
        },
      },
    });

    console.log(`✅ AI Agent created successfully! (id: ${created.id}, email: ${created.email}, role: ${created.role})`);
    return created;
  }
}

async function main() {
  await seedAiAgent();
}

if (import.meta.main || process.argv[1]?.endsWith("seed-ai-agent.ts")) {
  main()
    .catch((e) => {
      console.error("❌ Failed to seed AI agent:", e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
