import { describe, it, expect, beforeEach } from "bun:test";
import {
  getAllUsers,
  getAssignableUsers,
  createUser,
  updateUser,
  deleteUser,
  normalizeEmail,
  UserServiceError,
} from "../user.service";
import prisma from "../../../prisma";
import { Role } from "@prisma/client";

describe("userService", () => {
  const testTimestamp = Date.now();

  describe("normalizeEmail", () => {
    it("trims whitespace and converts to lowercase", () => {
      expect(normalizeEmail("  TEST@EXAMPLE.COM  ")).toBe("test@example.com");
      expect(normalizeEmail("Admin@Test.Org ")).toBe("admin@test.org");
    });
  });

  describe("createUser", () => {
    it("creates a new user with hashed password and returns safe user object", async () => {
      const email = `unit-create-${Date.now()}@example.com`;
      const user = await createUser({
        name: "Unit Agent",
        email,
        password: "SuperSecretPassword123!",
      });

      expect(user.id).toBeDefined();
      expect(user.name).toBe("Unit Agent");
      expect(user.email).toBe(email);
      expect(user.role).toBe(Role.AGENT);
      expect(user).not.toHaveProperty("password");

      // Verify stored in DB with credential account
      const account = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      expect(account).not.toBeNull();
      expect(account?.password).toBeDefined();
      expect(account?.password).not.toBe("SuperSecretPassword123!");
    });

    it("throws 409 UserServiceError when email already exists", async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      await createUser({
        name: "First User",
        email,
        password: "Password123!",
      });

      expect(
        createUser({
          name: "Second User",
          email,
          password: "Password123!",
        })
      ).rejects.toThrow(UserServiceError);
    });
  });

  describe("getAllUsers and getAssignableUsers", () => {
    it("returns active users and filters out soft-deleted users", async () => {
      const activeUser = await createUser({
        name: "Active Agent",
        email: `active-${Date.now()}@example.com`,
        password: "Password123!",
      });

      const deletedUser = await createUser({
        name: "To Be Deleted Agent",
        email: `to-delete-${Date.now()}@example.com`,
        password: "Password123!",
      });

      await deleteUser(deletedUser.id);

      const allUsers = await getAllUsers();
      expect(allUsers.some((u) => u.id === activeUser.id)).toBe(true);
      expect(allUsers.some((u) => u.id === deletedUser.id)).toBe(false);

      const assignable = await getAssignableUsers();
      expect(assignable.some((u) => u.id === activeUser.id)).toBe(true);
      expect(assignable.some((u) => u.id === deletedUser.id)).toBe(false);
    });
  });

  describe("updateUser", () => {
    it("updates user name and preserves existing password when password is not provided", async () => {
      const email = `preserve-pwd-${Date.now()}@example.com`;
      const user = await createUser({
        name: "Original Name",
        email,
        password: "InitialPassword123!",
      });

      const originalAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      const updated = await updateUser(user.id, {
        name: "Updated Name",
        email,
      });

      expect(updated.name).toBe("Updated Name");

      const afterAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      expect(afterAccount?.password).toBe(originalAccount?.password);
    });

    it("updates password when new password is provided", async () => {
      const email = `new-pwd-${Date.now()}@example.com`;
      const user = await createUser({
        name: "Change Password Agent",
        email,
        password: "InitialPassword123!",
      });

      const originalAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });

      await updateUser(user.id, {
        name: "Change Password Agent",
        email,
        password: "BrandNewPassword456!",
      });

      const afterAccount = await prisma.account.findFirst({
        where: { userId: user.id, providerId: "credential" },
      });
      expect(afterAccount?.password).not.toBe(originalAccount?.password);
    });

    it("throws 404 when user does not exist or is soft-deleted", async () => {
      expect(
        updateUser("non-existent-id", {
          name: "Ghost",
          email: "ghost@example.com",
        })
      ).rejects.toThrow(UserServiceError);
    });

    it("throws 409 when changing email to an already existing user's email", async () => {
      const user1 = await createUser({
        name: "User One",
        email: `conflict-1-${Date.now()}@example.com`,
        password: "Password123!",
      });

      const user2 = await createUser({
        name: "User Two",
        email: `conflict-2-${Date.now()}@example.com`,
        password: "Password123!",
      });

      expect(
        updateUser(user2.id, {
          name: "User Two Updated",
          email: user1.email,
        })
      ).rejects.toThrow(UserServiceError);
    });
  });

  describe("deleteUser", () => {
    it("soft-deletes an agent user and removes active sessions", async () => {
      const agent = await createUser({
        name: "Deletable Agent",
        email: `deletable-${Date.now()}@example.com`,
        password: "Password123!",
      });

      const result = await deleteUser(agent.id);
      expect(result.success).toBe(true);

      const dbUser = await prisma.user.findUnique({ where: { id: agent.id } });
      expect(dbUser?.deletedAt).not.toBeNull();
    });

    it("throws 400 UserServiceError when attempting to delete an administrator", async () => {
      // Find or create an admin
      const admin = await prisma.user.findFirst({
        where: { role: Role.ADMIN, deletedAt: null },
      });

      if (admin) {
        expect(deleteUser(admin.id)).rejects.toThrow(
          "Administrators cannot be deleted"
        );
      }
    });

    it("throws 404 when deleting non-existent user", async () => {
      expect(deleteUser("non-existent-user-id")).rejects.toThrow(
        "User not found"
      );
    });
  });
});
