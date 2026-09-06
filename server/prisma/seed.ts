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

async function main() {
  const email = (process.env.ADMIN_EMAIL || "test@example.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "uvdb1357";
  const name = process.env.ADMIN_NAME || "Admin";

  console.log(`🌱 Seeding database...`);
  console.log(`Checking for existing admin user (${email})...`);

  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  const hashedPassword = await hashPassword(password);

  if (existingUser) {
    console.log(`Admin user already exists. Updating role and credentials...`);

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        role: Role.ADMIN,
        name,
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

    console.log(`✅ Admin user updated successfully! (${email}, Role: ADMIN)`);
  } else {
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    await prisma.user.create({
      data: {
        id: userId,
        name,
        email,
        role: Role.ADMIN,
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

    console.log(`✅ Admin user created successfully! (${email}, Role: ADMIN)`);
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
