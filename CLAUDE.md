# Claude Instructions

## General Rules

- Never `git push` unless explicitly asked. Commit locally and report — wait for the user to say push.

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

- Token in `~/.npmrc`: Granular Access Token (Packages and scopes, Read and write).
  Check with `npm whoami`.
- 2FA uses a Security Key (WebAuthn, no TOTP app). WebAuthn works from the CLI as
  well as the web, so **publish via the browser flow, not a recovery code**:

  ```
  npm login --auth-type=web     # opens the browser → "Use security key"
  npm publish                   # approval happens in the browser too
  ```

  Web auth is the default for the public registry from npm 9 onwards
  (`--auth-type=web` makes it explicit). npm ≥ 8.14 supports the browser flow.

- **Do NOT use a recovery code to log in.** Doing so puts the account under a
  72-hour security hold during which publishing, token creation and account
  changes are all blocked — it locks you out of the very thing you wanted to do,
  and it cannot be lifted early.
  <https://docs.npmjs.com/recovering-your-2fa-enabled-account>

- Recovery codes are for losing access to the security key, nothing else. To view
  or regenerate them: npmjs.com → profile picture (upper right) → **Account** →
  Two-Factor Authentication → **Modify 2FA** → **Manage Recovery Codes**.
- Previous token `npm_E2aS...` had broken package-level permissions — do not use

## Testing Rules

This package emits Markdown **text** (`<br>` lines, trailing hard-break spaces), so
every change must be judged by what the downstream parser does with that text —
never by the string `preprocessMarkdown` returns.

A `<br>` line emitted directly after a table, list or blockquote is absorbed by
that block (extra table row / lazy continuation) instead of standing on its own.
That class of bug is invisible in a string-level assertion and shipped unnoticed
for several releases.

So:

- Any change to `preprocessMarkdown` needs a **render-level** test in
  `test/render.test.ts` — run the output through the unified pipeline and assert
  on the HTML, not on the intermediate Markdown.
- Add the new input to the corpus in `test/invariants.test.ts`. Every structural
  invariant (no phantom table cells, no `<br>` inside `<li>`/`<blockquote>`, no
  nested `<p>`, empty-line counts preserved) is then applied to it automatically.
- Keep that pipeline identical to `islas-shared/markdown/Viewer.vue`, which is
  what the consuming frontends actually use.
- Before claiming a fix works, verify it end to end in a consumer: copy `dist/`
  over its `node_modules/@coreator/remark-wysiwyg-breaks/dist/`, run, then
  restore.
