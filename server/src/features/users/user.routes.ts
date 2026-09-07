import { Router } from "express";
import { requireAdmin } from "../auth/auth.middleware";
import * as userController from "./user.controller";

const router = Router();

// Enforce admin authentication across all user management routes
router.use(requireAdmin);

/**
 * GET /api/users
 * Returns list of all platform users (Admins & Agents).
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

export default router;
