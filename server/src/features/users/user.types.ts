import { Role } from "@prisma/client";

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role?: Role;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  password?: string;
}
