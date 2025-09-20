# Testing & Verification Guide

Use this checklist any time you change MCP Pack or before you share a new version. None of the steps require coding experience—just copy and paste the commands into your terminal in order.

> **Prerequisite:** Run `npm install` at least once after downloading or updating the project.

## 1. Automated checks

| Step | Command | Why it matters |
|------|---------|----------------|
| 1 | `npm run typecheck` | Confirms the TypeScript code has no type errors. |
| 2 | `npm run lint` | Runs ESLint to catch common mistakes and style issues. |
| 3 | `npm test` | Executes the Vitest suite (merge logic, backups, config doctor, diff rendering). |
| 4 | `npm run build` | Produces the executable files in `dist/`. The command fails if bundling breaks. |
| 5 | `node dist/cli.mjs update-pack --dry-run` | Confirms the remote pack diff renders and the command succeeds. |

All commands should finish without errors. If a command fails, copy the error message, fix the highlighted issue (or ask for help), then rerun the failed command before moving on.

## 2. Manual smoke test

1. **Build selections**
   ```bash
   node dist/cli.mjs select
   ```
   Select at least one server and press **Enter**. The CLI should confirm where it stored the profile.

   Alternatively, run the guided flow with `node dist/cli.mjs walkthrough` and follow the prompts end-to-end.

2. **Run a dry-run config**
   ```bash
   node dist/cli.mjs write-config --client claude --dry-run
   ```
   You should see a colourised diff. No files are written during a dry run.

3. **Doctor health check**
   ```bash
   node dist/cli.mjs doctor --fix
   ```
   The command should print a summary like `OK 3 | Warn 1 | Fail 0`. Warnings about missing environment variables are normal if you have not set them yet.

   Optionally run `node dist/cli.mjs doctor --report credentials` to capture the secrets checklist for your release notes.

   If you store keys in a `.env` or JSON file, test the secrets loader with `node dist/cli.mjs doctor --secrets .env.local --report credentials`.

4. **Optional real write (if you want to test backups)**
   ```bash
   node dist/cli.mjs write-config --client claude
   node dist/cli.mjs rollback --client claude
   ```
   This proves the write/rollback loop works. Only run it if you are comfortable modifying your actual MCP config files.

5. **Optional pack refresh**
   ```bash
   node dist/cli.mjs update-pack --dry-run
   ```
   Verify that the diff looks correct before running without `--dry-run`.

6. **Optional snapshot roundtrip**
   ```bash
   node dist/cli.mjs profile export tmp/snapshot.json
   node dist/cli.mjs profile import tmp/snapshot.json --extend-pack --force
   ```
   Confirm that the profile selections match after import and clean up `tmp/snapshot.json` when finished.

7. **Optional smoke test**
   ```bash
   npm run smoke
   ```
   This script creates a temporary home directory, seeds a profile, runs dry-run writes, doctor reports, and snapshot export/import to validate the end-to-end flow. Inspect the console output for any failures.

## 3. Check the package metadata

Open `package.json` and confirm:
- `name` is set to the published package name (`mcp-pack` if you own it).
- `repository.url`, `bugs.url`, and `homepage` point to your GitHub repository.
- `author` has your name and contact e-mail.

## 4. Update documentation

If you changed features, update these files before publishing:
- `README.md`
- `USER_GUIDE.md`
- `docs/PUBLISHING.md` (only if the release process changed)

## 5. Record the results

When everything passes, note the commands you ran and their outcomes in your release notes or changelog. This builds trust with users and reminds you what you tested.

You are now ready to publish or share the project.
