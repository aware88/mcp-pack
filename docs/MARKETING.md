# MCP Pack Positioning & Talking Points

Use this doc for the GitHub repo blurb, launch post, or any social media content. It highlights how MCP Pack compares to the current ways people install MCP servers.

## Problem We Solve
- MCP servers have to be installed and configured separately for every AI client.
- People copy JSON/TOML snippets from blog posts, risking typos and lost backups.
- Each server requires API keys that must be inserted manually without clear prompts.
- Rolling back a bad config edit usually means deleting files and starting over.

## Why MCP Pack Is Different
| Feature | MCP Pack | Manual setup / scattered scripts | `mcp-get` only runs | Client-specific installers |
|---------|----------|-----------------------------------|---------------------|---------------------------|
| One list of curated servers | ✅ `pack.yaml` is versioned | ❌ random gists/blogs | ❌ only knows about packages | ❌ each client team curates their own |
| Pull updates from GitHub with a diff preview | ✅ `update-pack` command | ❌ manual copy/paste | ❌ no diff, manual download | ❌ usually tied to app releases |
| Works across clients (Claude, Cursor, VS Code, Windsurf, Codex) | ✅ built-in adapters | ❌ repeat work per client | ❌ installs servers but does not write configs | ✅ only for a single client |
| Auto-detect installed clients + secrets checklist | ✅ `doctor` reports | ❌ guess manually | ❌ none | 🔸 sometimes |
| Shareable snapshots for teams | ✅ `profile export/import` | ❌ email JSON fragments | ❌ not available | ❌ tied to one product |
| Guided onboarding | ✅ `walkthrough` command | ❌ dig through docs | ❌ none | ❌ limited |
| Secrets loader & smoke tests | ✅ `.env` support + `--smoke-test` | ❌ copy/paste | ❌ no verification | ❌ limited |
| Safe config writes (dry-run diff + backup + rollback) | ✅ first-class | ❌ manual editing risks corruption | ❌ no config touch | ✅ limited to that client |
| Environment variable guidance | ✅ prompts + doctor check | ❌ left to the user | ❌ not handled | 🔸 sometimes, but no central view |
| Profiles for different projects | ✅ select/store per profile | ❌ clone folders manually | ❌ global only | 🔸 occasionally |
| One-command health check | ✅ `doctor --fix` | ❌ inspect logs manually | ❌ not available | 🔸 some GUIs have diagnostics |

## Key Benefits to Emphasize
1. **Universal installer:** Same workflow regardless of which MCP client you use today or tomorrow.
2. **Safety first:** Colorized diffs, automatic backups, and a dedicated rollback command mean you never lose your original settings.
3. **Guided secrets management:** The CLI tracks which servers need API keys and reminds users when they’re missing.
4. **Maintainable for teams:** Profiles let you curate different bundles (e.g., "research" vs "production") with a couple of keystrokes.
5. **Free + open:** Shipping the curated list and tooling openly builds trust and keeps the community’s installs current.
6. **Team-friendly snapshots:** Export/import keeps multi-machine and multi-user setups in sync without manual JSON edits.
7. **Non-destructive secret handling:** Optional `.env` support and post-write smoke tests build trust for cautious teams.
8. **Guided onboarding mode:** A single command walks new users through selection, install, config, and doctor steps.

## Suggested GitHub Highlights
- Banner tagline: `“One CLI to install and configure MCP servers for every AI client.”`
- Feature bullets:
  - "Curated server packs with one command select/install/write flow"
  - "Supports Claude Desktop, Cursor, VS Code, Windsurf, and Codex out of the box"
  - "Atomic writes with auto-backups + dry-run diffs"
  - "Environment-checking doctor with optional auto-fix"
  - "Profiles for different teams or projects"
- Screenshot ideas: diff preview screenshot, doctor summary output, profile selection prompt.

## Short Social Copy Examples
- **Tweet/X:** `🚀 Stop copy-pasting MCP configs. MCP Pack installs every server you need across Claude, Cursor, VS Code & more—diff previews, backups, secrets loader, and smoke tests included. Free & open-source.`
- **LinkedIn:** `Announcing MCP Pack, the universal MCP installer for busy teams. Curated server list, safe config writes, backup & rollback, and environment checks—so your AI assistants are productive in minutes, not hours.`
- **Reddit headline:** `[Release] MCP Pack – a free CLI that installs & configures MCP servers for Claude, Cursor, VS Code, Windsurf, and Codex with one workflow`

## FAQ Prompts You Can Use
- *“Does it store my API keys?”* – No. It only prompts for missing values and reminds you via the doctor report.
- *“Can it break my existing config?”* – It always creates a timestamped backup and offers a rollback command.
- *“Will it work on Windows?”* – Yes, as long as Node 18+ is installed.
- *“Do I have to publish to npm?”* – No; users can clone from GitHub and run `node dist/cli.mjs ...` directly.

Keep this document updated whenever you add new adapters, packs, or safety features so your messaging stays accurate.
