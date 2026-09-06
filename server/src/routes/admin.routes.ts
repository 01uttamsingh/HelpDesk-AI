import { Router, Response } from "express";
import { requireAdmin, AuthenticatedRequest } from "../middleware/auth.middleware";
import prisma from "../prisma";

const router = Router();

// Apply requireAdmin to all routes in this router
router.use(requireAdmin);

/**
 * GET /api/admin/users
 * Returns list of all registered users (Agents & Admins).
 * Accessible only to authenticated users with ADMIN role.
 */
router.get("/users", async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch users",
    });
  }
});

export default router;
