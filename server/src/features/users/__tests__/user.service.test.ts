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

    it("unassigns all tickets assigned to the deleted user", async () => {
      const timestamp = Date.now();
      const agent = await createUser({
        name: "Assigned Agent",
        email: `assigned-${timestamp}@example.com`,
        password: "Password123!",
      });

      const otherAgent = await createUser({
        name: "Other Agent",
        email: `other-${timestamp}@example.com`,
        password: "Password123!",
      });

      // Create two tickets assigned to the agent to be deleted
      const ticket1 = await prisma.ticket.create({
        data: {
          subject: `Ticket 1 for Agent ${timestamp}`,
          body: "Ticket 1 body",
          senderName: "Customer One",
          senderEmail: "customer1@example.com",
          assignedToId: agent.id,
        },
      });

      const ticket2 = await prisma.ticket.create({
        data: {
          subject: `Ticket 2 for Agent ${timestamp}`,
          body: "Ticket 2 body",
          senderName: "Customer Two",
          senderEmail: "customer2@example.com",
          assignedToId: agent.id,
        },
      });

      // Create a ticket assigned to another agent (should NOT be unassigned)
      const ticket3 = await prisma.ticket.create({
        data: {
          subject: `Ticket 3 for Other Agent ${timestamp}`,
          body: "Ticket 3 body",
          senderName: "Customer Three",
          senderEmail: "customer3@example.com",
          assignedToId: otherAgent.id,
        },
      });

      // Verify tickets are currently assigned
      expect(ticket1.assignedToId).toBe(agent.id);
      expect(ticket2.assignedToId).toBe(agent.id);
      expect(ticket3.assignedToId).toBe(otherAgent.id);

      // Delete the first agent
      const result = await deleteUser(agent.id);
      expect(result.success).toBe(true);

      // Verify tickets assigned to deleted agent are now unassigned
      const updatedTicket1 = await prisma.ticket.findUnique({
        where: { id: ticket1.id },
      });
      expect(updatedTicket1?.assignedToId).toBeNull();

      const updatedTicket2 = await prisma.ticket.findUnique({
        where: { id: ticket2.id },
      });
      expect(updatedTicket2?.assignedToId).toBeNull();

      // Verify other agent's ticket remains assigned to other agent
      const updatedTicket3 = await prisma.ticket.findUnique({
        where: { id: ticket3.id },
      });
      expect(updatedTicket3?.assignedToId).toBe(otherAgent.id);
    });
  });
});
