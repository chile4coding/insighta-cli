
# Insighta CLI

Command-line interface for the Insighta Labs+ Profile Intelligence Platform.

## Installation

```bash
npm install -g @insighta/cli
```

Or install from source:

```bash
git clone <repository-url>
cd insighta-cli
npm install
npm run build
npm link
```

## Setup

The CLI requires the backend API URL to be configured.

**Set the `API_BASE` environment variable to your Insighta backend URL:**

```bash
# Bash/Zsh
export API_BASE=https://api.insighta.com/api

# Windows PowerShell
$env:API_BASE="https://api.insighta.com/api"
```

For convenience, you can add this to your shell profile (`.bashrc`, `.zshrc`, etc.) or create a `.env` file:

```env
API_BASE=https://api.insighta.com/api
```

**Note:** The default is `http://localhost:4888/api` for local development.

## Usage

### Authentication

```bash
# Login via GitHub OAuth
insighta login

# Check current user
insighta whoami

# Logout
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

# List with pagination
insighta profiles list --page 2 --limit 20

# Get a specific profile
insighta profiles get <id>

# Search profiles (natural language)
insighta profiles search "female adults from Nigeria"

# Create a profile (admin only)
insighta profiles create --name "Harriet Tubman"

# Delete a profile (admin only)
insighta profiles delete <id>

# Export profiles to CSV
insighta profiles export --format csv

# Export with filters
insighta profiles export --format csv --gender male --country NG
```

### Command Reference

#### `insighta login`

Authenticate via GitHub OAuth. Opens browser for authentication and stores tokens locally.

#### `insighta logout`

Clear local credentials and invalidate session on server.

#### `insighta whoami`

Display current user information.

#### `insighta profiles list [options]`

List profiles with optional filters:
- `-g, --gender <gender>`: Filter by gender (male/female)
- `-c, --country-id <country>`: Filter by country code (e.g., NG, US)
- `--age-group <group>`: Filter by age group (child/teenager/adult/senior)
- `--min-age <age>`: Minimum age
- `--max-age <age>`: Maximum age
- `--sort-by <field>`: Sort by field (age/created_at/gender_probability)
- `--order <order>`: Sort order (asc/desc)
- `--page <page>`: Page number
- `--limit <limit>`: Items per page (max 50)

#### `insighta profiles get <id>`

Get a specific profile by ID.

#### `insighta profiles delete <id>`

Delete a profile (admin only).

#### `insighta profiles search <query>`

Search profiles using natural language:
- "female adults from US"
- "males over 30"
- "senior profiles from Germany"

#### `insighta profiles create --name <name>`

Create a new profile (requires admin role).

#### `insighta profiles export [options]`

Export profiles to CSV format:
- `-f, --format <format>`: Export format (csv)
- All filter options from `list` command are supported

## Token Storage

Credentials are stored in `~/.insighta/credentials.json` with 600 permissions (read/write for owner only).

### Automatic Token Refresh

The CLI automatically refreshes expired access tokens using the refresh token. If refresh fails, you'll be prompted to login again.

## Examples

### Find all male adult profiles from Nigeria

```bash
insighta profiles list --gender male --age-group adult --country-id NG
```

### Export senior profiles to CSV

```bash
insighta profiles export --age-group senior --format csv
```

### Search with natural language

```bash
insighta profiles search "young males from Ghana"
```

## Configuration

Environment variables (optional, defaults shown):

```env
API_BASE=http://localhost:4888/api
```

## Security

- Tokens stored with restricted file permissions (600)
- Automatic token expiration handling
- No sensitive data in command history

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development mode
npm run dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Troubleshooting

### Login fails

Ensure the GitHub OAuth app callback URL matches your setup:
- Default: `http://localhost:3000/callback`

### Token expired

The CLI automatically refreshes tokens. If this fails, run `insighta login` again.

### Permission denied

Some operations require admin role. Contact your administrator.

## License

MIT

## See Also

- [Insighta Backend](https://github.com/your-org/insighta-backend)
- [Insighta Web Portal](https://github.com/your-org/insighta-web)
# insighta-cli
# insighta-cli
