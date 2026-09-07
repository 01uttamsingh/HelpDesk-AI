import { Response, NextFunction } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import * as userService from "../services/user.service";

const createUserSchema = z.object({
  name: z.string().trim().min(3, "Name must be at least 3 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/**
 * Controller to list all platform users.
 * Accessible only to authenticated users with ADMIN role.
 */
export async function listUsers(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const users = await userService.getAllUsers();
    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error in listUsers controller:", error);
    next(error);
  }
}

/**
 * Controller to create a new user.
 * Validates input: name >= 3 chars, valid email, password >= 8 chars.
 * Accessible only to authenticated users with ADMIN role.
 */
export async function createUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input data",
      });
    }

    const user = await userService.createUser(parseResult.data);
    return res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    if (error instanceof userService.UserServiceError || error?.statusCode) {
      return res.status(error.statusCode || 400).json({
        success: false,
        error: error.message,
      });
    }
    console.error("Error in createUser controller:", error);
    next(error);
  }
}

