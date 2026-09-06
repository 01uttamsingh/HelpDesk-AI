import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import * as userService from "../services/user.service";

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
