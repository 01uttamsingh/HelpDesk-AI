import prisma from "../prisma";

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
