# Claude Instructions

## Default Branch

Always work on `develop`. Only switch to `main` to merge and push for release.

## Release Flow

When publishing a new version:

1. Switch to `develop`, merge `main`
2. Make changes, run `npm test`
3. Bump version in `package.json`, update `CHANGELOG.md`
4. Commit on `develop`, merge to `main`, push both branches
5. Publish: `npm publish --otp=<recovery-code>`

### npm Auth

- Token in `~/.npmrc`: Granular Access Token (Packages and scopes, Read and write). Check with `npm whoami`.
- 2FA uses Security Key (no TOTP app) — publish always needs a recovery code via `--otp`
- Recovery codes are single-use; user regenerates them at npmjs.com → Account Settings → Two-Factor Authentication → Manage Recovery Codes
- Previous token `npm_E2aS...` had broken package-level permissions — do not use
