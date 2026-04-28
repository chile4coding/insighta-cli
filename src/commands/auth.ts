import { Command } from "commander";
import axios from "axios";
import open from "open";
import {
  loadCredentials,
  saveCredentials,
  clearCredentials,
} from "../utils/auth";
import { createServer } from "http";
import { URL } from "url";
import chalk from "chalk";

const API_BASE = process.env.API_BASE || "http://185.200.244.215:9400";
let CALLBACK_PORT = 3000;
let CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;

async function findAvailablePort(startPort: number): Promise<number> {
  for (let offset = 0; offset < 10; offset++) {
    const port = startPort + offset;
    try {
      await new Promise<void>((resolve, reject) => {
        const testServer = createServer()
          .once("error", (err: any) => {
            if (err.code === "EADDRINUSE") {
              reject(new Error("EADDRINUSE"));
            } else {
              reject(err);
            }
          })
          .listen(port, () => {
            testServer.close();
            resolve();
          });
      });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error("No available ports found");
}

export async function login(cmd: Command): Promise<void> {
  console.log(chalk.cyan("\n🚀 Insighta Login\n"));

  // Find an available port for the callback server
  try {
    CALLBACK_PORT = await findAvailablePort(3000);
    CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/callback`;
  } catch (err) {
    console.error(
      chalk.red("Error: Could not find an available port for callback server"),
    );
    process.exit(1);
  }

  // Step 1: Start local callback server to receive tokens from backend
  const server = createServer(async (req: any, res: any) => {
    try {
      const url = new URL(req.url!, `http://${req.headers.host}`);

      // Only handle /callback path
      if (url.pathname !== "/callback") {
        res.writeHead(404);
        res.end();
        return;
      }

      // Check for error from GitHub/backend
      const error = url.searchParams.get("error");
      const errorDesc = url.searchParams.get("error_description");
      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>Authentication Error</h1><p>${errorDesc || error}</p>`);
        console.error(chalk.red(`\nError: ${errorDesc || error}\n`));
        server.close();
        return;
      }

      // Extract tokens from query params (sent by backend redirect)
      const accessToken = url.searchParams.get("access_token");
      const refreshToken = url.searchParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          "<h1>Authentication Failed</h1><p>No tokens received from server.</p>",
        );
        console.error(chalk.red("\nError: No tokens in callback URL\n"));
        server.close();
        return;
      }

      // Fetch full user info from backend
      try {
        const userResponse = await axios.get(`${API_BASE}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-API-Version": "1",
          },
        });

        const user = userResponse.data.data;

        // Calculate token expiry times (backend: access=3min, refresh=5min)
        const now = Date.now();
        saveCredentials({
          accessToken,
          refreshToken,
          accessTokenExpires: now + 3 * 60 * 1000,
          refreshTokenExpires: now + 5 * 60 * 1000,
          user,
        });

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
  <div style="font-family: sans-serif; text-align: center; padding: 60px 20px;">
    <h1>Login Successful!</h1>
    <p>Logged in as <strong>@${user.username}</strong></p>
    <p>Role: ${user.role}</p>
    <p style="color: #666;">You can close this tab and return to the CLI.</p>
    <button 
      onclick="window.close()" 
      style="margin-top: 20px; padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
      Close Tab
    </button>
    <script>
      // Auto-close after 3 seconds, or immediately if opened by CLI
      setTimeout(() => window.close(), 3000);
    </script>
  </div>
`);

        console.log(
          chalk.green(`\n✓ Logged in as @${user.username} (${user.role})\n`),
        );
      } catch (err: any) {
        console.error(
          chalk.red(`\nError: Failed to fetch user info: ${err.message}\n`),
        );
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(
          "<h1>Error</h1><p>Failed to complete login. Please try again.</p>",
        );
      } finally {
        server.close();
      }
    } catch (err: any) {
      console.error(chalk.red(`\nError: ${err.message}\n`));
      try {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end("<h1>Error</h1><p>An unexpected error occurred.</p>");
      } catch {
        // Ignore if headers already sent
      }
      server.close();
    }
  });

  // Step 2: Initiate OAuth flow via backend
  const authStartUrl = `${API_BASE}/auth/github?redirect_uri=${encodeURIComponent(CALLBACK_URL)}`;

  console.log(chalk.gray("Starting GitHub OAuth flow..."));
  console.log(chalk.gray("Opening browser for authentication...\n"));

  try {
    await open(authStartUrl);
  } catch (err) {
    console.error(chalk.yellow("Could not open browser automatically"));
    console.log(chalk.cyan(`Please visit: ${authStartUrl}`));
  }

  // Step 3: Listen for backend redirect with tokens
  server.listen(CALLBACK_PORT, () => {
    console.log(
      chalk.gray(
        `🔗 Local callback server: http://localhost:${CALLBACK_PORT}/callback`,
      ),
    );
    console.log(chalk.gray("⏳ Waiting for GitHub authentication...\n"));
  });
}

export async function logout(): Promise<void> {
  try {
    const credentials = loadCredentials();
    if (credentials) {
      await axios
        .post(
          `${API_BASE}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${credentials.accessToken}`,
              "X-API-Version": "1",
            },
          },
        )
        .catch(() => {});
    }
  } catch (err) {
    // Ignore logout errors
  }

  clearCredentials();
  console.log(chalk.green("✓ Logged out successfully"));
}

export async function whoami(): Promise<void> {
  let credentials: any = null;
  try {
    credentials = loadCredentials(true);
  } catch (err: any) {
    console.log(chalk.yellow("Not logged in"));
    console.log('Run "insighta login" to authenticate');
    return;
  }

  if (!credentials?.accessToken) {
    console.log(chalk.yellow("Not logged in"));
    console.log('Run "insighta login" to authenticate');
    return;
  }

  try {
    const response = await axios.get(`${API_BASE}/api/users/me`, {
      headers: {
        Authorization: `Bearer ${credentials.accessToken}`,
        "X-API-Version": "1",
      },
    });

    const user = response.data.data;

    console.log(chalk.cyan("\n┌─ Current User ────────────"));
    console.log(chalk.gray(`│  Username:  ${user.username}`));
    console.log(chalk.gray(`│  Email:     ${user.email}`));
    console.log(chalk.gray(`│  Role:      ${user.role}`));
    console.log(chalk.gray(`│  Active:    ${user.isActive}`));
    console.log(chalk.gray(`└──────────────────────────\n`));
  } catch (err: any) {
    if (err.response?.status === 401) {
      console.log(
        chalk.yellow('Session expired. Run "insighta login" to log in again.'),
      );
      clearCredentials();
    } else {
      console.error(chalk.red(`Error: ${err.message}`));
    }
  }
}
