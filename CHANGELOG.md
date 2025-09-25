# Changelog

All notable changes to this project will be documented here.

## [Unreleased]
- TBD

## [0.2.0] - 2025-09-24
### Added
- Expanded the default pack with ~40 additional SaaS, infrastructure, and remote MCP servers, complete with runtime metadata and setup guidance.
- Verified the expanded catalog with build, lint, unit, and smoke checks before publishing.

## [0.1.4] - 2025-09-24
### Added
- Added Notion, Slack, Google Workspace, and Airtable servers to the default pack with docs and setup tips.
- CLI runtime helper now includes server-specific guidance for Notion, Airtable, Slack, Google Workspace.
- README table documents secrets/notes for all bundled servers.

## [0.1.3] - 2025-09-24
### Added
- Firecrawl, Supabase, and Stripe servers to the default pack with helpful metadata.
- Selection runtime tips now include server-specific guidance for Firecrawl, Supabase, and Stripe.
- README now documents all bundled servers with secrets and notes.

## [0.1.2] - 2025-09-24
### Fixed
- CLI now reports the correct version (0.1.2) to match the published package.


## [0.1.1] - 2025-09-24
### Added
- Enabled all curated servers (npm/pip/go/docker) by default in `pack.yaml`.
- Added runtime guidance in CLI selection/install/write-config flows.
- Doctor now prints install pointers with a link to the runtime setup guide.
- README gained a "Setup runtimes" section with OS-specific commands and links.

## [0.1.0] - 2024-xx-xx
### Added
- Initial public MVP with curated pack management, install, write-config, doctor, and rollback commands.
- Snapshot export/import, secrets loader, smoke test script, and guided walkthrough.
