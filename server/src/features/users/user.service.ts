import { Role } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import prisma from "../../prisma";
import type { SafeUser, CreateUserInput, UpdateUserInput } from "./user.types";

export class UserServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UserServiceError";
    this.statusCode = statusCode;
  }
}

/**
 * Reusable function to normalize email addresses consistently.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Shared projection selecting safe user fields (strictly omitting sensitive credentials).
 */
export const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  emailVerified: true,
  image: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

/**
 * Retrieves all registered active users from the database.
 * Filters out soft-deleted users (where deletedAt is null).
 * Sorted by role (Admins first) and creation date descending.
 */
export async function getAllUsers(): Promise<SafeUser[]> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: safeUserSelect,
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * Retrieves all registered active users who can be assigned to tickets.
 * Filters out soft-deleted users (where deletedAt is null).
 */
export async function getAssignableUsers(): Promise<
  Array<{ id: string; name: string; email: string; role: string }>
> {
  return prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

/**
 * Creates a new user and corresponding credential account in the database.
 * Hashes password using Better Auth crypto utility.
 * Defaults role to AGENT and emailVerified to false.
 */
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const normalizedEmail = normalizeEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    throw new UserServiceError("A user with this email already exists", 409);
  }

  const hashedPassword = await hashPassword(input.password);
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();

  return prisma.user.create({
    data: {
      id: userId,
      name: input.name.trim(),
      email: normalizedEmail,
      role: input.role || Role.AGENT,
      emailVerified: false,
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
    select: safeUserSelect,
  });
}

/**
 * Updates an existing active user's details.
 * If password is provided, hashes it and updates the linked credential account.
 * Otherwise, leaves the user's password unchanged.
 */
export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<SafeUser> {
  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser || existingUser.deletedAt) {
    throw new UserServiceError("User not found", 404);
  }

  const normalizedEmail = normalizeEmail(input.email);

  // If email is changing, verify it is not already in use by another user
  if (normalizedEmail !== existingUser.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (emailConflict && emailConflict.id !== id) {
      throw new UserServiceError("A user with this email already exists", 409);
    }
  }

  return prisma.$transaction(async (tx) => {
    // If a new password is provided, update or create the credential account
    if (input.password && input.password.trim().length > 0) {
      const hashedPassword = await hashPassword(input.password);
      const credentialAccount = await tx.account.findFirst({
        where: { userId: id, providerId: "credential" },
      });

      if (credentialAccount) {
        await tx.account.update({
          where: { id: credentialAccount.id },
          data: { password: hashedPassword },
        });
      } else {
        await tx.account.create({
          data: {
            id: crypto.randomUUID(),
            accountId: id,
            providerId: "credential",
            issuer: "local:credential",
            userId: id,
            password: hashedPassword,
          },
        });
      }
    }

    return tx.user.update({
      where: { id },
      data: {
        name: input.name.trim(),
        email: normalizedEmail,
      },
      select: safeUserSelect,
    });
  });
}

/**
 * Soft deletes an existing user and terminates their active sessions.
 * Also unassigns all tickets assigned to that user.
 * Admins cannot be deleted under any circumstances.
 */
export async function deleteUser(
  id: string
): Promise<{ success: boolean; message: string }> {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user || user.deletedAt) {
    throw new UserServiceError("User not found", 404);
  }

  if (user.role === Role.ADMIN) {
    throw new UserServiceError("Administrators cannot be deleted", 400);
  }

  await prisma.$transaction(async (tx) => {
    // 1. Soft-delete user by stamping deletedAt
    await tx.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // 2. Unassign all tickets currently assigned to this user
    await tx.ticket.updateMany({
      where: { assignedToId: id },
      data: {
        assignedToId: null,
      },
    });

    // 3. Immediately revoke all active sessions for this user
    await tx.session.deleteMany({
      where: { userId: id },
    });
  });

  return {
    success: true,
    message: "User deleted successfully",
  };
}
