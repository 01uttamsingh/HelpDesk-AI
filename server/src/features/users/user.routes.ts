import { Router } from "express";
import { requireAdmin } from "../auth/auth.middleware";
import * as userController from "./user.controller";

const router = Router();

// Enforce admin authentication across all user management routes
router.use(requireAdmin);

/**
 * GET /api/users
 * Returns list of all active platform users (Admins & Agents).
 * Restricted to ADMIN role.
 */
router.get("/", userController.listUsers);

/**
 * POST /api/users
 * Creates a new platform user with name, email, and password.
 * Restricted to ADMIN role.
 */
router.post("/", userController.createUser);

/**
 * PATCH /api/users/:id
 * Updates an existing user's details (name, email, optional password).
 * Restricted to ADMIN role.
 */
router.patch("/:id", userController.updateUser);

/**
 * DELETE /api/users/:id
 * Soft deletes an existing user and revokes their sessions.
 * Restricted to ADMIN role (Admin users cannot be deleted).
 */
router.delete("/:id", userController.deleteUser);

export default router;
