# MCP Pack – Friendly Quick Start

This guide walks you through using MCP Pack even if you have never shipped code before. Follow the steps in order and you will safely install MCP servers for your favourite AI clients.

If you prefer the CLI to do most of the driving, run `node dist/cli.mjs walkthrough` — it will guide you through the same steps interactively.

## What you need first
- A computer with **Node.js 18 or newer**. If you have never installed Node before, download it from [nodejs.org](https://nodejs.org/en/download/) and follow the installer.
- The AI client you want to configure (for example Claude Desktop, Cursor, or VS Code).

## Step 1 – Download the project
If you received the project as a zip:
1. Unzip it somewhere easy to find (e.g., Desktop).
2. Open the folder in your terminal:
   ```bash
   cd /path/to/mcp-pack
   ```

If you are cloning from GitHub:
```bash
git clone https://github.com/YOUR-GITHUB-USERNAME/mcp-pack.git
cd mcp-pack
```

## Step 2 – Install dependencies
Run this once to download everything the CLI needs:
```bash
npm install
```

## Step 3 – Build the CLI
```bash
npm run build
```
This creates the runnable files inside the `dist/` folder.

## Step 4 – Pick the servers you want
```bash
node dist/cli.mjs select
```
The CLI will show a list of curated servers from `pack.yaml`. Use the arrow keys to highlight servers and the space bar to toggle them. Press **Enter** to save. The selections are stored in `~/.mcp-pack/selections/default.json`.

> **Tip:** You can create additional profiles for different projects using `node dist/cli.mjs profile create <name>` and then pass `--profile <name>` to the other commands.

## Step 5 – Install servers for your client
```bash
node dist/cli.mjs install --client claude
```
Replace `claude` with `cursor`, `vscode`, `windsurf`, or `codex` to install for a different client. The command runs the installer defined in `pack.yaml` (usually `npx`), showing a spinner for each server.

If the CLI asks for environment variables (API keys), it will prompt you securely. You can press **Ctrl+C** to cancel, or add `--yes` to skip prompts (values are set to placeholders so you can edit them later).
Have a `.env` or JSON file with your keys already? Add `--secrets path/to/file` so the CLI loads them automatically.

## Step 6 – Update client configuration
Always preview the changes before writing:
```bash
node dist/cli.mjs write-config --client claude --dry-run
```
If the diff looks good:
```bash
node dist/cli.mjs write-config --client claude --smoke-test
```
For Cursor you can target the global or project file:
```bash
node dist/cli.mjs write-config --client cursor --scope global
```

Every write creates a timestamped backup next to the original config file. If you ever need to undo a change run:
```bash
node dist/cli.mjs rollback --client claude
```
`--smoke-test` reruns the configuration in dry-run mode afterward to confirm no further changes are pending. Combine it with `--secrets path/to/.env` if you prefer keeping credentials outside your shell.

## Step 7 – Run the doctor (optional but recommended)
```bash
node dist/cli.mjs doctor --fix
```
The doctor checks that Node/npm are installed, which clients are detected on your machine, whether the expected config files exist, and whether required environment variables have values. With `--fix` it will create missing JSON/TOML files using safe defaults. Add `--report credentials` to see a checklist of API keys you still need to set.

## Troubleshooting
- **Command not found:** Ensure you ran `npm run build` and that you are typing `node dist/cli.mjs ...` (or use the globally installed `mcp-pack` command if you published it).
- **Missing servers in the diff:** Make sure you saved your selections in Step 4 and that you ran the command with the same profile.
- **Environment variable warnings:** Set the variables directly in your terminal before running `write-config`, e.g. `export GITHUB_TOKEN=...` on macOS/Linux or `setx GITHUB_TOKEN ...` on Windows.

## Next steps
- Share the project on GitHub following [`docs/PUBLISHING.md`](docs/PUBLISHING.md).
- Before every release follow the checklist in [`docs/TESTING.md`](docs/TESTING.md).
- Keep `pack.yaml` up to date so your users always get useful defaults.
- When teammates publish a new `pack.yaml`, stay in sync with `node dist/cli.mjs update-pack --url <raw-file-url>`.
- Share your selections via snapshots: `node dist/cli.mjs profile export snapshots/dev.json` on one machine, then `node dist/cli.mjs profile import snapshots/dev.json --extend-pack` on another.

You now have a safe, repeatable way to set up MCP servers across clients. 🎉
