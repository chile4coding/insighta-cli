import crypto from "crypto";
import axios from "axios";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import chalk from "chalk";

const API_BASE = process.env.API_BASE || "http://185.200.244.215:9400";
const CREDENTIALS_DIR = path.join(os.homedir(), ".insighta");
const CREDENTIALS_FILE = path.join(CREDENTIALS_DIR, "credentials.json");

export interface Credentials {
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number;
  refreshTokenExpires: number;
  user: {
    id: string;
    username: string;
    email: string;
    avatarUrl: string;
    role: string;
  };
}

export function ensureCredentialsDir(): void {
  if (!fs.existsSync(CREDENTIALS_DIR)) {
    fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  }
}

export function saveCredentials(creds: Credentials): void {
  ensureCredentialsDir();
  const data = {
    ...creds,
    savedAt: Date.now(),
  };
  fs.writeFileSync(CREDENTIALS_FILE, JSON.stringify(data, null, 2));
  fs.chmodSync(CREDENTIALS_FILE, 0o600);
}

export function loadCredentials(requireAuth?: boolean): Credentials | null {
  ensureCredentialsDir();

  try {
    if (!fs.existsSync(CREDENTIALS_FILE)) {
      if (requireAuth) {
        throw new Error(
          "Not authenticated. Run 'insighta login' to authenticate",
        );
      }
      return null;
    }

    const data = JSON.parse(fs.readFileSync(CREDENTIALS_FILE, "utf-8"));
    const creds: Credentials = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      accessTokenExpires: data.accessTokenExpires,
      refreshTokenExpires: data.refreshTokenExpires,
      user: data.user,
    };

    return creds;
  } catch (err: any) {
    if (requireAuth) {
      throw new Error("Failed to load credentials: " + err.message);
    }
    return null;
  }
}

export function clearCredentials(): void {
  ensureCredentialsDir();
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      fs.unlinkSync(CREDENTIALS_FILE);
    }
  } catch (err) {
    // Ignore cleanup errors
  }
}

export function isTokenExpired(expiresAt: number): boolean {
  // Add 30 second buffer
  return Date.now() >= expiresAt - 30000;
}

export async function refreshAccessToken(): Promise<Credentials | null> {
  const creds = loadCredentials();
  if (!creds) {
    return null;
  }

  // Check if access token is still valid
  if (!isTokenExpired(creds.accessTokenExpires)) {
    return creds;
  }

  // Check if refresh token is expired
  if (isTokenExpired(creds.refreshTokenExpires)) {
    clearCredentials();
    return null;
  }

  try {
    const response = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refresh_token: creds.refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-Version": "1",
        },
      },
    );
    if (response.data.status === "success") {
      const now = Date.now();
      const newCreds: Credentials = {
        accessToken: response?.data?.data.access_token,
        refreshToken: response?.data?.data.refresh_token,
        accessTokenExpires: now + 3 * 60 * 1000, // 3 minutes
        refreshTokenExpires: now + 5 * 60 * 1000, // 5 minutes
        user: creds.user, // preserve user info
      };
      saveCredentials(newCreds);
      return newCreds;
    }
  } catch (err: any) {
    console.error(chalk.yellow("Warning: Token refresh failed"));
    clearCredentials();
  }

  return null;
}

export function displayCurrentUser(): void {
  const creds = loadCredentials();
  if (!creds) {
    console.log(chalk.yellow("Not logged in"));
    return;
  }

  if (isTokenExpired(creds.accessTokenExpires)) {
    console.log(chalk.yellow("Session expired"));
    return;
  }

  console.log(chalk.cyan("\nCurrent User:"));
  console.log(chalk.gray(`  Username: ${creds.user.username}`));
  console.log(chalk.gray(`  Email: ${creds.user.email}`));
  console.log(chalk.gray(`  Role: ${creds.user.role}`));
  console.log();
}
