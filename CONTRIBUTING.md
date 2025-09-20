# Contributing to MCP Pack

Thanks for your interest in improving MCP Pack! This document covers the basics so you can get involved quickly and safely.

## Prerequisites
- Node.js 18+
- npm 9+
- A fork of the repository (if you’re contributing via pull request)

Run the setup commands once after cloning:
```bash
npm install
npm run build
```

## Development workflow
1. Create a feature branch: `git checkout -b feat/your-feature`
2. Make changes and keep commits focused.
3. Run the full verification suite before pushing:
   ```bash
   npm run typecheck
   npm run lint
   npm test -- --run
   npm run smoke
   npm run build
   ```
4. Update docs (`README.md`, `USER_GUIDE.md`, `docs/TESTING.md`, etc.) when behaviour changes.
5. Submit a pull request describing **what** changed and **why**.

## Commit message style
Use present tense and keep messages under 72 characters when possible. Examples:
- `Add secrets loader utility`
- `Fix doctor credentials report`
- `Update marketing copy`

## Pull request checklist
- [ ] Tests updated/added when necessary
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm test -- --run` passes
- [ ] `npm run smoke` passes
- [ ] Documentation updated

## Reporting issues
Use the bug report template under GitHub Issues. Provide reproduction steps, expected behaviour, and what happened instead.

## Code of Conduct
Be respectful and inclusive. Harassment or discriminatory behaviour isn’t tolerated. If you encounter issues, contact the maintainers via GitHub Issues.

Happy hacking!
