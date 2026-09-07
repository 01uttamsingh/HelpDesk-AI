import { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "../auth/auth.middleware";
import { createUserSchema, updateUserSchema } from "./user.schema";
import * as userService from "./user.service";

/**
 * Reusable error response handler for user controllers.
 */
function handleControllerError(
  error: any,
  res: Response,
  next: NextFunction,
  context: string
) {
  if (error instanceof userService.UserServiceError || error?.statusCode) {
    return res.status(error.statusCode || 400).json({
      success: false,
      error: error.message,
    });
  }
  console.error(`Error in ${context}:`, error);
  next(error);
}

/**
 * Controller to list all active platform users.
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
    handleControllerError(error, res, next, "listUsers controller");
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
    handleControllerError(error, res, next, "createUser controller");
  }
}

/**
 * Controller to update an existing user.
 * Validates name (>=3 chars), email, and optional password (>=8 chars if provided).
 * Accessible only to authenticated users with ADMIN role.
 */
export async function updateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors[0]?.message || "Invalid input data",
      });
    }

    const user = await userService.updateUser(id, parseResult.data);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    handleControllerError(error, res, next, "updateUser controller");
  }
}

/**
 * Controller to soft delete an existing user.
 * Admin users cannot be deleted.
 * Accessible only to authenticated users with ADMIN role.
 */
export async function deleteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    if (!id || typeof id !== "string") {
      return res.status(400).json({
        success: false,
        error: "User ID is required",
      });
    }

    const result = await userService.deleteUser(id);
    return res.status(200).json(result);
  } catch (error: any) {
    handleControllerError(error, res, next, "deleteUser controller");
  }
}
