export interface UserItem {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "AGENT";
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export type RoleFilter = "ALL" | "ADMIN" | "AGENT";

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserInput {
  name: string;
  email: string;
  password?: string;
}
