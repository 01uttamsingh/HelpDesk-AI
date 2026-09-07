import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth";
import prisma from "../../prisma";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthenticatedSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: AuthenticatedSession;
}

/**
 * Middleware ensuring the incoming request has a valid, active Better Auth session.
 */
export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session || !session.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    }

    // Verify user is not soft-deleted
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deletedAt: true },
    });

    if (dbUser?.deletedAt) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Account has been deactivated",
      });
    }

    // Attach authenticated user and safe session info (excluding raw secret token)
    req.user = session.user as AuthenticatedUser;
    req.session = {
      id: session.session.id,
      userId: session.session.userId,
      expiresAt: session.session.expiresAt,
    };

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Invalid or expired session",
    });
  }
}

/**
 * Middleware ensuring the authenticated user has a specific role.
 */
export function requireRole(role: "ADMIN" | "AGENT") {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized: Authentication required",
      });
    }

    const userRole = req.user.role?.toUpperCase();
    if (userRole !== role.toUpperCase()) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: ${role} access required`,
      });
    }

    next();
  };
}

/**
 * Composite middleware enforcing both authentication and ADMIN role.
 */
export async function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    await requireAuth(req, res, () => {
      requireRole("ADMIN")(req, res, next);
    });
  } else {
    requireRole("ADMIN")(req, res, next);
  }
}
