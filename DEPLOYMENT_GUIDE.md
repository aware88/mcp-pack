# MCP Pack Deployment Guide

Use this file as a quick reference. Detailed, copy-and-paste instructions live in [`docs/PUBLISHING.md`](docs/PUBLISHING.md).

## Checklist before publishing
- [ ] Update `package.json` links (repository, bugs, homepage, author).
- [ ] Confirm `pack.yaml` reflects the servers you want to ship.
- [ ] Run every step in [`docs/TESTING.md`](docs/TESTING.md) (typecheck, lint, test, build, dry-run CLI).
- [ ] Refresh screenshots or gifs if you plan to include them in the release notes.
- [ ] Draft release notes covering new features, fixes, and the verification commands you ran.
- [ ] Capture a snapshot roundtrip (`profile export/import`) if you want to showcase team sharing.
- [ ] Run `write-config --smoke-test` with your demo profile if you plan to highlight post-write verification.

## High-level publishing flow
1. Commit your changes locally.
2. Push to GitHub (`main` branch or a version branch).
3. Create a GitHub release with version tag (for example `v0.1.0`).
4. Optionally publish to npm (`npm publish --access public`).
5. Announce the release to your community.

For the exact wording, terminal commands, and release template, see [`docs/PUBLISHING.md`](docs/PUBLISHING.md).
