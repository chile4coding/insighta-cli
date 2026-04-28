# Insighta CLI

> Insighta Labs+ CLI — Command-line interface for the Profile Intelligence Service

## Installation

```bash
# Install globally via npm
npm install -g insighta

# Or install from source
git clone <repository-url>
cd insighta-cli
npm install
npm run build
npm link
```

## Setup

The CLI connects to the Insighta backend service. Only the backend URL needs to be configured.

**Set the `API_BASE` environment variable:**

```bash
# Bash/Zsh
export API_BASE=https://api.insighta.com/api

# Windows PowerShell
$env:API_BASE = "https://api.insighta.com/api"
```

Add to your shell profile (`.bashrc`, `.zshrc`, etc.) to persist across sessions.

**Default:** `http://localhost:4888/api` (for local development)

## Usage

### Authentication

```bash
# Login via GitHub OAuth (opens browser)
insighta login

# Check current user
insighta whoami

# Logout (clears local credentials and invalidates session)
insighta logout
```

### Profile Management

```bash
# List all profiles
insighta profiles list

# List with filters
insighta profiles list --gender male --country-id NG --age-group adult

# List with sorting
insighta profiles list --sort-by age --order desc

# Pagination
insighta profiles list --page 2 --limit 20

# Get a specific profile by ID
insighta profiles get <profile-id>

# Search profiles using natural language
insighta profiles search "female adults from Nigeria"

# Create a profile (admin only)
insighta profiles create --name "Harriet Tubman"

# Delete a profile (admin only)
insighta profiles delete <profile-id>

# Export profiles to CSV
insighta profiles export --format csv

# Export with filters
insighta profiles export --format csv --gender male --country-id NG
```

### Command Reference

#### `insighta login`

Starts a local callback server, opens GitHub OAuth in the browser, and stores access/refresh tokens locally.

- Requires `API_BASE` to point to a running Insighta backend
- Backend handles PKCE, GitHub callback, and token issuance
- Tokens are saved to `~/.insighta/credentials.json`

#### `insighta logout`

Clears local credentials and calls backend `/auth/logout` to invalidate the refresh token.

#### `insighta whoami`

Displays the currently logged-in user's information (username, email, role, active status).

#### `insighta profiles list [options]`

List profiles with optional filtering, sorting, and pagination.

**Options:**

- `-g, --gender <gender>` — Filter by gender (`male` / `female`)
- `-c, --country-id <country>` — Filter by country code (e.g., `NG`, `US`)
- `--age-group <group>` — Filter by age group (`child`, `teenager`, `adult`, `senior`)
- `--min-age <age>` — Minimum age
- `--max-age <age>` — Maximum age
- `--sort-by <field>` — Sort field (`age`, `created_at`, `gender_probability`)
- `--order <order>` — Sort order (`asc` or `desc`)
- `--page <page>` — Page number (default: 1)
- `--limit <limit>` — Items per page, max 50 (default: 10)

#### `insighta profiles get <id>`

Retrieve a single profile by its UUID.

#### `insighta profiles delete <id>`

Delete a profile. **Admin role required.**

#### `insighta profiles search <query>`

Search profiles using natural language queries.

Examples:

- `"female adults from US"`
- `"males over 30"`
- `"senior profiles from Germany"`

#### `insighta profiles create --name <name>`

Create a new profile with AI-generated demographic data. **Admin role required.**

#### `insighta profiles export [options]`

Export matching profiles to a CSV file. Supports the same filters as `list`.

Options:

- `-f, --format <format>` — Export format (default: `csv`)
- All list filters are supported

## Token Storage

Credentials are stored securely in:

```
~/.insighta/credentials.json
```

File permissions are set to `600` (owner read/write only).

**Token lifetimes:**

- Access token: 3 minutes
- Refresh token: 5 minutes

### Automatic Token Refresh

The CLI automatically refreshes expired access tokens using the stored refresh token. If refresh fails (e.g., refresh token expired), you'll be prompted to log in again.

## Authentication Flow

```
┌─────────┐     ┌──────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐
│  User   │────▶│   CLI    │────▶│ Backend │────▶│ GitHub   │────▶│  User    │
│         │     │          │     │         │     │          │     │ Auth     │
└─────────┘     └──────────┘     └─────────┘     └──────────┘     └──────────┘
                                              │
                  1. GET /auth/github        │
                  (with redirect_uri)         │
                                                  │
                  5. Redirect with tokens     │
                  ◀───────────────────────────┘
                        (access_token,
                         refresh_token)
```

1. **CLI** starts local HTTP server on `http://localhost:3000/callback`
2. **CLI** requests `GET /auth/github?redirect_uri=http://localhost:3000/callback`
3. **Backend** generates PKCE, stores redirect URI, redirects to GitHub
4. **User** authenticates on GitHub
5. **GitHub** redirects to backend's `/auth/github/callback`
6. **Backend** exchanges code, creates/updates user, issues JWT tokens
7. **Backend** redirects to stored `redirect_uri` with tokens in query string
8. **CLI** receives tokens, fetches user info via `/auth/me`, saves credentials

All API requests (except `/auth/*`) require:

- `Authorization: Bearer <access_token>`
- `X-API-Version: 1`

## Role-Based Access Control

| Role      | Permissions                                    |
| --------- | ---------------------------------------------- |
| `admin`   | Full access: list, get, create, delete, export |
| `analyst` | Read-only: list, get, search                   |

Default role for new users: `analyst`

Attempting restricted actions (create/delete) as analyst returns `403 Forbidden`.

## API Versioning

All requests to profile endpoints must include:

```
X-API-Version: 1
```

The CLI sends this header automatically on every request.

Requests without this header are rejected with `400 Bad Request`.

## Rate Limiting

The backend enforces rate limits:

| Endpoint scope      | Limit                       |
| ------------------- | --------------------------- |
| `/auth/*` endpoints | 10 requests per minute      |
| All other endpoints | 60 requests per user/minute |

Exceeding limits returns `429 Too Many Requests`.

## Error Handling

Common errors and their meanings:

- `401 Unauthorized` — Invalid or expired token; try `insighta login`
- `403 Forbidden` — Insufficient permissions (admin-only action)
- `404 Not Found` — Profile or endpoint doesn't exist
- `429 Too Many Requests` — Rate limit exceeded
- `500 Internal Server Error` — Backend error

## Development

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Run in development mode (ts-node)
npm run dev

# Type check (no emit)
npm run typecheck

# Lint
npm run lint

# Test (if tests exist)
npm test
```

## Project Structure

```
insighta-cli/
├── src/
│   ├── commands/
│   │   ├── auth.ts       # login, logout, whoami
│   │   └── profiles.ts   # profile CRUD + list + search + export
│   ├── utils/
│   │   └── auth.ts       # credential storage, token refresh
│   └── index.ts          # CLI entry point
├── dist/                # compiled JavaScript (gitignored)
├── .gitignore
├── package.json
├── README.md
└── tsconfig.json
```

## Troubleshooting

### `insighta login` fails to open browser

Copy the displayed URL manually into your browser.

### "Session expired" on every command

Your tokens have expired (5-minute refresh token lifetime). Run:

```bash
insighta login
```

### Port 3000 already in use

The CLI attempts to use port 3000 for the callback server. If occupied, it will try ports 3001–3009 automatically. If all are taken, you'll see an error — free a port or restart the CLI.

### "Not authenticated" with valid tokens

Tokens may have expired beyond the refresh window (5 minutes). Re-login:

```bash
insighta logout
insighta login
```

### No profiles returned

Your backend may not have any profiles yet. An admin can create one:

```bash
insighta profiles create --name "John Doe"
```

### Permission denied (403)

You're attempting an admin-only action (`create`, `delete`) with an analyst account. Contact an admin to upgrade your role or use an admin account.

## Security

- Tokens stored with `0600` permissions (owner-only access)
- No sensitive data logged or stored in command history
- HTTP-only cookies used for web session (portal)
- Refresh tokens are single-use and rotated on each refresh

## License

MIT

## See Also

- [Insighta Backend](https://github.com/chile4coding/insighta-backend)
- [Insighta Web Portal](https://github.com/chile4coding/insighta-web)
