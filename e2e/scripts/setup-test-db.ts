import { Client } from "pg";
import { execSync } from "child_process";
import path from "path";
import dotenv from "dotenv";

const rootDir = path.resolve(import.meta.dirname, "../..");
const serverDir = path.resolve(rootDir, "server");

// Load test environment variables with override: true
dotenv.config({ path: path.resolve(rootDir, ".env.test"), override: true });
dotenv.config({ path: path.resolve(serverDir, ".env.test"), override: true });

const isReset = process.argv.includes("--reset");
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5433/helpdesk_test?schema=public";

const parsedUrl = new URL(databaseUrl.replace(/^postgresql:\/\//, "http://"));
const dbName = parsedUrl.pathname.replace(/^\//, "").split("?")[0] || "helpdesk_test";

if (dbName === "helpdesk" || !dbName.includes("test")) {
  throw new Error(
    `Safety Check Failed: Target database is "${dbName}". Test database scripts must only run against a database containing "test".`
  );
}

async function setupTestDb() {
  console.log(`\n========================================`);
  console.log(`🔧 Configuring Test Database`);
  console.log(`========================================`);

  // Connection URL pointing to default "postgres" administrative database
  const adminUrl = databaseUrl.replace(`/${dbName}`, "/postgres");

  console.log(`📍 Target test database: "${dbName}"`);
  console.log(`📡 Connecting to PostgreSQL host...`);

  const client = new Client({ connectionString: adminUrl });

  try {
    await client.connect();

    // Check if test database already exists
    const checkRes = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    const dbExists = checkRes.rowCount !== null && checkRes.rowCount > 0;

    if (isReset && dbExists) {
      console.log(`♻️ Resetting test database "${dbName}"...`);
      // Terminate any active connections to the test database
      await client.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [dbName]
      );
      await client.query(`DROP DATABASE "${dbName}"`);
      console.log(`🗑️ Dropped existing database "${dbName}".`);
    }

    if (!dbExists || isReset) {
      console.log(`🏗️ Creating database "${dbName}"...`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log(`✅ Database "${dbName}" created successfully.`);
    } else {
      console.log(`ℹ️ Database "${dbName}" already exists.`);
    }
  } catch (err) {
    console.error(`❌ Failed to configure database "${dbName}":`, err);
    throw err;
  } finally {
    await client.end();
  }

  // Deploy migrations to the test database
  console.log(`\n📦 Deploying Prisma migrations to "${dbName}"...`);
  try {
    execSync("bunx prisma migrate deploy", {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
      },
      stdio: "inherit",
    });
    console.log(`✅ Migrations applied cleanly to "${dbName}".`);
  } catch (error) {
    console.error(`❌ Failed to apply migrations:`, error);
    throw error;
  }

  // Seed the test database with initial admin user
  console.log(`\n🌱 Seeding test database "${dbName}"...`);
  try {
    execSync("bun prisma/seed.ts", {
      cwd: serverDir,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        NODE_ENV: "test",
      },
      stdio: "inherit",
    });
    console.log(`✅ Seed data created in "${dbName}".`);
  } catch (error) {
    console.error(`❌ Failed to seed test database:`, error);
    throw error;
  }

  console.log(`\n✨ Test database "${dbName}" is ready for Playwright tests!\n`);
}

setupTestDb().catch((err) => {
  console.error("❌ Fatal error setting up test database:", err);
  process.exit(1);
});
