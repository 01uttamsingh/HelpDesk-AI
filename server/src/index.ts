import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth";
import prisma from "./prisma";
import { env, getTrustedOrigins } from "./config/env";
import { requireAuth, AuthenticatedRequest } from "./middleware/auth.middleware";
import adminRoutes from "./routes/admin.routes";

// Prevent Bun event loop idle exit on Windows
setInterval(() => {}, 1000 * 60 * 60);

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

const app = express();
const PORT = env.PORT;

// Trust first proxy for secure cookies behind reverse proxies (Nginx, Cloudflare, etc.)
app.set("trust proxy", 1);

// 2. Restrict CORS to trusted origins only
const trustedOrigins = getTrustedOrigins();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as server-to-server calls, curl, or mobile clients)
      if (!origin) {
        return callback(null, true);
      }
      if (trustedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  })
);

// 4. Rate limiting on authentication endpoints (brute-force & credential stuffing defense)
const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts. Please try again in 60 seconds.",
  },
});

app.use("/api/auth", authRateLimiter);

// Mount Better Auth handler before standard body parsers
app.all("/api/auth/*", toNodeHandler(auth));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/api/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "ok",
      database: "connected",
      message: "Helpdesk API is running and connected to PostgreSQL (helpdesk)",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      status: "error",
      database: "disconnected",
      message: "Database connection failed",
      timestamp: new Date().toISOString(),
    });
  }
});

// 3. GET /api/me: Returns authenticated user profile without exposing session token
app.get("/api/me", requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    success: true,
    data: {
      user: req.user,
      session: {
        id: req.session?.id,
        expiresAt: req.session?.expiresAt,
        // session.token is strictly omitted from the payload to prevent token leakage
      },
    },
  });
});

// 1. Mount Admin Routes guarded by requireAdmin middleware
app.use("/api/admin", adminRoutes);
// Direct alias for /api/users pointing to admin user management
app.use("/api/users", adminRoutes);

// Centralized error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err?.message?.includes("CORS blocked")) {
    return res.status(403).json({
      success: false,
      error: "CORS error: Request origin not allowed",
    });
  }
  console.error("Unhandled API error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

app.listen(PORT, async () => {
  try {
    await prisma.$connect();
    console.log(`✅ Connected to PostgreSQL database (helpdesk)`);
  } catch (err) {
    console.error(`❌ Failed to connect to database:`, err);
  }
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔒 Trusted CORS origins: ${trustedOrigins.join(", ")}`);
});
