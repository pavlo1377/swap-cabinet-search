# Git Workflow

## Branches

- `main` – stable demo version. Protected. Updated only at the end via a PR from `dev`.
- `dev` – main working branch. Protected. All PRs target `dev`.
- `feature/<short-name>` – new functionality, from `dev` (e.g. `feature/nl-search`).
- `bug/<short-name>` – bug fixes, from `dev` (e.g. `bug/price-filter`).

## Rules

- No direct pushes to `main` or `dev`. Everything goes through a PR.
- Every PR needs 1 approval from a teammate.
- One branch = one task. Keep it small.
- Never commit secrets. `.env` stays local.

## Workflow

```bash
# 1. Start
git checkout dev
git pull origin dev
git checkout -b feature/<short-name>

# 2. Commit (check git status first, avoid blind `git add .`)
git add <files>
git commit -m "Add search endpoint"

# 3. Push
git push -u origin feature/<short-name>
```

4. On GitHub: open a PR → base `dev` → request a reviewer.
5. After approval: **Squash and merge**, delete the branch.

## Release

At the end, when `dev` is stable: PR `dev` → `main`, 1 approval, merge.

## Shared test data

The whole team uses one Sharetribe test environment:

- Don't delete or modify existing listings.
- Prefix test listings with `[TEST]`.
- Only one person at a time runs scripts that write to listings.
