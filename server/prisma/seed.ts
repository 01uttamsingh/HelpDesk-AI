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

const usersToSeed = [
  {
    email: (process.env.ADMIN_EMAIL || "test@example.com").trim().toLowerCase(),
    password: process.env.ADMIN_PASSWORD || "uvdb1357",
    name: process.env.ADMIN_NAME || "Admin",
    role: Role.ADMIN,
  },
  {
    email: "admin@example.com",
    password: process.env.ADMIN_PASSWORD || "uvdb1357",
    name: "Admin",
    role: Role.ADMIN,
  },
  {
    email: "agent@example.com",
    password: "uvdb1357",
    name: "Agent",
    role: Role.AGENT,
  },
];

async function seedUser(userData: (typeof usersToSeed)[number]) {
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
    include: { accounts: true },
  });

  const hashedPassword = await hashPassword(userData.password);

  if (existingUser) {
    console.log(`User already exists (${userData.email}). Updating role and credentials...`);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: userData.role,
        name: userData.name,
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

    console.log(`✅ User updated successfully! (${userData.email}, Role: ${userData.role})`);
  } else {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        name: userData.name,
        email: userData.email,
        role: userData.role,
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

    console.log(`✅ User created successfully! (${userData.email}, Role: ${userData.role})`);
  }
}

async function main() {
  console.log(`🌱 Seeding database...`);
  for (const user of usersToSeed) {
    await seedUser(user);
  }
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
