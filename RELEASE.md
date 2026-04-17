# Release Flow

## Prerequisites

- npm account with access to `@coreator` scope
- A **Granular Access Token** (Packages and scopes, Read and write) stored in `~/.npmrc`:
  ```
  //registry.npmjs.org/:_authToken=<token>
  ```
- npm 2FA active. Since Security Key 2FA cannot be used in CLI, publish requires a recovery code via `--otp`

## Steps

```bash
# 1. Switch to develop and sync with main
git checkout develop
git merge main

# 2. Make changes, run tests
npm test

# 3. Bump version in package.json, update CHANGELOG.md

# 4. Commit on develop
git add src/ test/ package.json CHANGELOG.md README.md
git commit -m "fix: <description>"

# 5. Merge to main
git checkout main
git merge develop

# 6. Push both branches
git push origin develop
git push origin main

# 7. Publish (prepublishOnly runs build automatically)
npm publish --otp=<recovery-code>
```

## Notes

- Recovery codes are single-use. Regenerate at npmjs.com → Account Settings → Two-Factor Authentication → Manage Recovery Codes after each release.
- The token `npm_dMVpHi9z...` (Granular, Read and write, all packages) is the current publish token.
- Previous token `npm_E2aS...` had permission issues with existing packages — do not use.
