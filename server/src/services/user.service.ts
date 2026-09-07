import { Role } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";
import prisma from "../prisma";

export class UserServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "UserServiceError";
    this.statusCode = statusCode;
  }
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

/**
 * Retrieves all registered users from the database.
 * Selects only safe fields, strictly omitting passwords and token data.
 * Sorted by role (Admins first) and creation date descending.
 */
export async function getAllUsers(): Promise<SafeUser[]> {
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" },
    ],
  });
}

/**
 * Creates a new user and corresponding credential account in the database.
 * Hashes password using Better Auth crypto utility.
 * Defaults role to AGENT and emailVerified to false.
 */
export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const normalizedEmail = input.email.trim().toLowerCase();

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
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      image: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

