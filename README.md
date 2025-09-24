# MCP Pack

Universal MCP server installer for people who just want their AI tools to work. MCP Pack lets you pick a curated set of servers, install them with safe fallbacks, and update multiple client configuration files without ever touching JSON or TOML by hand.

> **Status:** MVP ready. Supports Claude Desktop, Cursor, VS Code, Windsurf, Warp (Warp Drive export), and Codex config formats.

## Contents
- [Why MCP Pack?](#why-mcp-pack)
- [System requirements](#system-requirements)
- [Install the CLI](#install-the-cli)
- [Quick start](#quick-start)
- [Command overview](#command-overview)
- [Keeping packs current](#keeping-packs-current)
- [Safety features](#safety-features)
- [Development & testing](#development--testing)
- [Project structure](#project-structure)
- [Support](#support)
- [Sharing configurations](#sharing-configurations)
- [License](#license)

## Why MCP Pack?
- **Curated servers in one file.** Choose from the vetted list stored in `pack.yaml`.
- **One workflow for many clients.** Generate config for Claude, Cursor (global or project scopes), VS Code, Windsurf, Warp, and Codex.
- **Safe edits.** Automatic backups, readable diffs, and a `rollback` command keep configs recoverable.
- **Profiles for different setups.** Maintain separate selections for workspaces or teams via the `profile` command group.

## System requirements
- Node.js **18 or newer**
- `npm` (ships with Node)
- macOS, Linux, or Windows (CLI tested on macOS/Linux)
- Optional runtimes when using certain servers from `pack.yaml`:
  - Python 3.10+ with `pip` for AWS Labs servers (e.g. `awslabs.amazon-qbusiness-anonymous-mcp-server`)
  - Go 1.21+ for Go-based servers (e.g. `github.com/mark3labs/mcp-filesystem-server`)
  - Docker CLI for containerised servers (e.g. `ghcr.io/github/github-mcp-server`)
  - Ensure each runtime’s binary directory (e.g. `~/.local/bin`, `$(go env GOPATH)/bin`) is on your `PATH` so generated configs can launch the binaries

### Runtime Requirements (at a glance)
- If you only use the default servers, Node/npm is enough.
- If you uncomment pip/go/docker servers in `pack.yaml`, install those runtimes and ensure their CLIs are on your PATH. The CLI will warn you during `install`, `write-config`, and `doctor` if something is missing.

## Install the CLI

Local development install (recommended if you plan to contribute or test):

```bash
git clone https://github.com/aware88/mcp-pack.git
cd mcp-pack
npm install
npm run build
```

Global usage (after publishing to npm):

```bash
npm install -g mcp-pack
```

You can also run without installing globally:

```bash
npx mcp-pack --help
```

## Quick start
1. **Select servers** for your default profile:
   ```bash
   node dist/cli.mjs select
   ```
2. **Install** the selected servers for Claude (replace `claude` with `cursor`, `vscode`, `windsurf`, `warp`, or `codex` as needed, or pass a comma list to label multiple clients):
   ```bash
   node dist/cli.mjs install --client claude
   ```
3. **Write config** (dry-run first if you want to preview diffs):
   ```bash
   node dist/cli.mjs write-config --client claude --dry-run
   node dist/cli.mjs write-config --client claude
   ```
   For Warp the command creates `.mcp-pack/warp/warp-drive-export.json`; import that file via **Settings -> Warp Drive -> Import JSON** to register the servers.
4. **Check for issues**:
   ```bash
   node dist/cli.mjs doctor --fix
   ```

Need extra guidance? Run `node dist/cli.mjs walkthrough` to step through selecting servers, installing clients, previewing diffs, and running the doctor command interactively.

## Command overview

| Command | What it does |
|---------|---------------|
| `select [--profile <name>]` | Choose servers from `pack.yaml` and store them in `~/.mcp-pack/selections/<profile>.json`. |
| `install --client <ids>[,<ids>] [--profile <name>] [--yes] [--verbose] [--secrets <path>]` | Installs each selected server once, then reuses it for the listed clients. Launch commands are inferred per runtime (npm/pip/go/docker) or honoured from explicit `command`/`args` overrides in `pack.yaml`. `--secrets` preloads env vars from `.env`/JSON. |
| `write-config --client <id> [--profile <name>] [--dry-run] [--yes] [--scope <scope>] [--secrets <path>] [--smoke-test]` | Generates and writes client configuration files. For Warp it produces an importable Warp Drive JSON snippet. `--dry-run` shows the diff, `--scope` applies to Cursor, `--secrets` hydrates env vars, `--smoke-test` verifies the result. |
| `doctor [--fix] [--profile <name>] [--report credentials] [--secrets <path>]` | Health check for Node/npm, expected config files, and required environment variables. `--fix` scaffolds missing files, `--report` outputs a credentials checklist, `--secrets` loads env vars first. |
| `update-pack [--url <url>] [--dry-run]` | Download the latest `pack.yaml`, preview the diff, and optionally replace the local file. |
| `profile export <file> [--profile <name>] [--include-env]` | Produce a sharable snapshot containing selected servers, optional env values, and detected clients. |
| `profile import <file> [--profile <name>] [--extend-pack] [--force]` | Restore selections from a snapshot and optionally merge missing server definitions into `pack.yaml`. |
| `profile list|create <name> [--copy-from <profile>]` | Manage profile files for different setups. |
| `walkthrough [--profile <name>] [--client <ids>] [--secrets <path>]` | Follow a guided select → install → diff → doctor sequence in one command. |
| `rollback --client <id> [--scope <scope>]` | Restore the most recent backup for the chosen client. |

Use `node dist/cli.mjs <command> --help` for command-specific flags. Replace `node dist/cli.mjs` with `mcp-pack` if installed globally.

### Included servers

The default `pack.yaml` includes npm servers only for a smooth first-run. Optional examples for pip/go/docker are provided commented out—uncomment as needed.

## Safety features
- **Atomic writes**: All client config updates happen via temporary files that replace the original in one step.
- **Timestamped backups**: Every write stores a `.bak` file alongside the original so you can `rollback` at any time.
- **Readable diffs**: `--dry-run` renders colorised diffs (powered by the `diff` library) so you can see changes before applying.
- **Validation helpers**: The doctor checks ensure JSON/TOML files are valid, required environment variables are set, and detects which clients are present.
- **Secrets bridge**: Load `.env` or JSON files before commands so sensitive values never hit source control but are still available.
- **Smoke tests**: Optionally re-run config generation after writes to confirm no extra changes remain.

## Development & testing
Development tooling lives in npm scripts. See [`docs/TESTING.md`](docs/TESTING.md) for detailed instructions.

| Command | Purpose |
|---------|---------|
| `npm run typecheck` | TypeScript type checking (strict mode). |
| `npm run lint` | ESLint over `src`. |
| `npm test` | Vitest unit suite (`merge`, `backup`, `diff`, and doctor helpers). |
| `npm run build` | Bundles the CLI to `dist` using `tsup`. |
| `npm run smoke` | Optional end-to-end CLI smoke test using a temporary home directory. |
| `node dist/cli.mjs ...` | Run the built CLI locally. |

Suggested loop while developing:
```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
node dist/cli.mjs write-config --client claude --dry-run
```

## Project structure

```
├── pack.yaml            # Curated MCP server definitions
├── src/                 # CLI source (TypeScript)
├── dist/                # Build output (tsup)
├── test/                # Vitest unit tests
├── docs/                # Additional guides (testing, publishing, etc.)
├── README.md            # This document
└── USER_GUIDE.md        # Non-technical quick start
```

Server entries in `pack.yaml` can optionally set explicit `command` and `args` fields when the default runtime heuristics (npm → `npx`, pip → `python -m`, go → the installed binary, docker → `docker run --rm`) are not sufficient.

## Support
- See [`USER_GUIDE.md`](USER_GUIDE.md) for a plain-language tutorial.
- Troubleshooting tips and checklists live in [`docs/TESTING.md`](docs/TESTING.md).
- Publishing steps (GitHub + npm) are captured in [`docs/PUBLISHING.md`](docs/PUBLISHING.md).
- Open issues or questions once the repository is live on GitHub.

## License
MIT
- **Curated source control**: `update-pack` pulls a trusted `pack.yaml` from GitHub (configurable) so teams stay in sync.

## Keeping packs current

Set `DEFAULT_PACK_URL` in `src/cli.ts` (line near the top) to your canonical `pack.yaml` URL—usually the raw file from your GitHub repo. Then run:

```bash
node dist/cli.mjs update-pack --dry-run
node dist/cli.mjs update-pack
```

The command shows a diff before writing and asks for confirmation unless you pass `--dry-run`.

## Sharing configurations

Use the profile snapshot commands to sync setups across machines:

```bash
node dist/cli.mjs profile export snapshots/dev.json --include-env
node dist/cli.mjs profile import snapshots/dev.json --extend-pack
```

Snapshots include the selected servers, any environment variables captured during export, and a note about which clients were detected on the source machine.
Add `--secrets .env.local` to either command if you store credentials outside your shell.
