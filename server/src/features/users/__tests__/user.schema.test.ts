import { describe, it, expect } from "bun:test";
import { createUserSchema, updateUserSchema } from "../user.schema";

describe("user.schema", () => {
  describe("createUserSchema", () => {
    it("validates valid user creation payload", () => {
      const result = createUserSchema.safeParse({
        name: "Valid User",
        email: "user@example.com",
        password: "securePassword123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects name shorter than 3 characters", () => {
      const result = createUserSchema.safeParse({
        name: "Ab",
        email: "user@example.com",
        password: "securePassword123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid email format", () => {
      const result = createUserSchema.safeParse({
        name: "Valid User",
        email: "not-an-email",
        password: "securePassword123",
      });
      expect(result.success).toBe(false);
    });

    it("rejects password shorter than 8 characters", () => {
      const result = createUserSchema.safeParse({
        name: "Valid User",
        email: "user@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateUserSchema", () => {
    it("validates update payload without password", () => {
      const result = updateUserSchema.safeParse({
        name: "Updated Name",
        email: "updated@example.com",
      });
      expect(result.success).toBe(true);
    });

    it("validates update payload with valid optional password", () => {
      const result = updateUserSchema.safeParse({
        name: "Updated Name",
        email: "updated@example.com",
        password: "newPassword123",
      });
      expect(result.success).toBe(true);
    });

    it("rejects update payload with password shorter than 8 characters", () => {
      const result = updateUserSchema.safeParse({
        name: "Updated Name",
        email: "updated@example.com",
        password: "short",
      });
      expect(result.success).toBe(false);
    });
  });
});
