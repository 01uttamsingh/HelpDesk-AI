import prisma from "../../prisma";
import { Role, type User } from "@prisma/client";

export const AI_AGENT_EMAIL = (process.env.AI_AGENT_EMAIL || "ai@example.com").trim().toLowerCase();
export const AI_AGENT_NAME = "AI";

/**
 * Retrieves the official AI agent user from the database.
 * If not present (e.g. in fresh or isolated test databases), auto-creates it to ensure zero runtime failures.
 */
export async function getOrCreateAiAgent(): Promise<User> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email: AI_AGENT_EMAIL },
        { name: AI_AGENT_NAME, role: Role.AGENT },
      ],
      deletedAt: null,
    },
  });

  if (existing) {
    return existing;
  }

  const userId = crypto.randomUUID();
  return prisma.user.create({
    data: {
      id: userId,
      name: AI_AGENT_NAME,
      email: AI_AGENT_EMAIL,
      role: Role.AGENT,
      emailVerified: true,
    },
  });
}
