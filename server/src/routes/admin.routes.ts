import { Router } from "express";
import { requireAdmin } from "../features/auth";
import { userController } from "../features/users";

const router = Router();

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Returns list of all registered users (Agents & Admins).
 * Accessible only to authenticated users with ADMIN role.
 */
router.get("/users", userController.listUsers);

export default router;
