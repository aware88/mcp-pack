# Publishing MCP Pack

This guide walks you through sharing MCP Pack with the public. Follow each section even if you have never used GitHub or npm before.

## 1. Update project details
1. Open `package.json` and replace the placeholder values:
   - `repository.url` → `git+https://github.com/YOUR-USERNAME/mcp-pack.git`
   - `bugs.url` → `https://github.com/YOUR-USERNAME/mcp-pack/issues`
   - `homepage` → `https://github.com/YOUR-USERNAME/mcp-pack`
   - `author` → `Your Name <you@example.com>`
2. Confirm `README.md` and `USER_GUIDE.md` mention the correct GitHub links.
3. Run the testing checklist in [`docs/TESTING.md`](TESTING.md). Do **not** publish until everything passes.

## 2. Create the GitHub repository
1. Go to [github.com/new](https://github.com/new).
2. Repository name: `mcp-pack`.
3. Description: `Universal MCP server installer for multi-client setups` (or your preferred wording).
4. Visibility: **Public**.
5. Do **not** initialize with a README (you already have one).
6. Click **Create repository**.

## 3. Push your local project to GitHub
Run these commands in the project folder:
```bash
git init
 git add .
git commit -m "Initial commit: MCP Pack MVP"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/mcp-pack.git
git push -u origin main
```
If you already have a git history, adjust the commit message instead of using the example above.

## 4. Create a release page
1. On GitHub, open your repository → **Releases** → **Draft a new release**.
2. Tag: `v0.1.0` (or the next version number).
3. Release title: `MCP Pack v0.1.0 – Universal MCP installer`.
   4. Description (copy/paste and edit as needed):
   ```markdown
   ## Highlights
   - Curated MCP server picker powered by `pack.yaml`
   - Safe `write-config` command with backups, diffs, and rollback
   - Cross-client support: Claude, Cursor, VS Code, Windsurf, Codex
   - Guided doctor checks for missing configs and environment variables
   - Shareable profile snapshots for teams (`profile export/import`)
   - Optional secrets loader and smoke-test flag for safer releases

   ## Verification
   - `npm run typecheck`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `node dist/cli.mjs write-config --client claude --dry-run`
   - `node dist/cli.mjs write-config --client claude --smoke-test --secrets .env.local` (adjust path as needed)
   ```
5. Attach any demo screenshots if you have them.
6. Click **Publish release**.

## 5. (Optional) Publish to npm
Only do this if you own the `mcp-pack` package name or choose an alternative.

```bash
npm login            # enter your npm credentials
npm whoami           # confirm login worked
npm run build        # ensure fresh build
npm publish --access public
```

After publishing, test the global install:
```bash
npm install -g mcp-pack
mcp-pack --help
```

## 6. Tell people about it
- Share the release link on LinkedIn, Twitter/X, or developer communities.
- Post a quick demo video or GIF to show the diff preview and doctor command.
- Invite users to open issues or discussions if they need additional client support.

That’s it—you have successfully published MCP Pack. 🎉
