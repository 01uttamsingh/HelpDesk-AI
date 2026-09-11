import http from "http";
import url from "url";
import dotenv from "dotenv";
import path from "path";

// Load existing env if available
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "server/.env") });

const CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.argv[2];
const CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.argv[3];
const PORT = 3456;
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.log(`
❌ Missing Google OAuth credentials.

Usage:
  bun server/scripts/get-gmail-token.ts <CLIENT_ID> <CLIENT_SECRET>

Or set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in your server/.env file.
`);
  process.exit(1);
}

const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
  CLIENT_ID
)}&redirect_uri=${encodeURIComponent(
  REDIRECT_URI
)}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.send&access_type=offline&prompt=consent`;

console.log("\n=======================================================");
console.log("👉 STEP 1: Copy and open this URL in your browser:");
console.log("=======================================================");
console.log(authUrl);
console.log("\nWaiting for you to log in and approve permissions...\n");

const server = http.createServer(async (req, res) => {
  try {
    const parsed = url.parse(req.url || "", true);
    if (parsed.pathname === "/oauth2callback") {
      const code = parsed.query.code as string;
      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h1>Error: Authorization code not found.</h1>");
        return;
      }

      // Exchange code for tokens
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          code,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      });

      const tokens = (await tokenResponse.json()) as any;

      if (!tokenResponse.ok || !tokens.refresh_token) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(`<h1>Failed to retrieve refresh token</h1><pre>${JSON.stringify(tokens, null, 2)}</pre>`);
        console.error("Token exchange failed:", tokens);
        return;
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 40px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #16a34a;">✅ Authorization Successful!</h2>
          <p>You can close this tab and return to your terminal.</p>
        </div>
      `);

      console.log("\n=======================================================");
      console.log("🎉 SUCCESS! Add these variables to Railway:");
      console.log("=======================================================");
      console.log(`GMAIL_CLIENT_ID=${CLIENT_ID}`);
      console.log(`GMAIL_CLIENT_SECRET=${CLIENT_SECRET}`);
      console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log("=======================================================\n");

      setTimeout(() => {
        server.close();
        process.exit(0);
      }, 1000);
    }
  } catch (err) {
    console.error("Error during OAuth callback:", err);
  }
});

server.listen(PORT);
