import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware";
import * as userController from "../controllers/user.controller";

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

export default router;

