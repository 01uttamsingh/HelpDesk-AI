import { z } from "zod";

// Base field schemas following DRY
export const userNameSchema = z
  .string()
  .trim()
  .min(3, "Name must be at least 3 characters");

export const userEmailSchema = z
  .string()
  .trim()
  .email("Please enter a valid email address");

export const userPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters");

export const optionalUserPasswordSchema = z
  .string()
  .optional()
  .refine((val) => !val || val.length >= 8, {
    message: "Password must be at least 8 characters",
  });

export const createUserSchema = z.object({
  name: userNameSchema,
  email: userEmailSchema,
  password: userPasswordSchema,
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;

export const editUserSchema = z.object({
  name: userNameSchema,
  email: userEmailSchema,
  password: optionalUserPasswordSchema,
});

export type EditUserFormValues = z.infer<typeof editUserSchema>;
