# Security policy

This is a hackathon project and it is not intended to run with sensitive data.
Please do not include credentials, personal data, or export-controlled material in
issues, pull requests or commits.

## Reporting

If you find a security issue (for example a committed secret or an injection bug),
please contact the repository maintainers privately instead of opening a public
issue. We will respond as quickly as possible and rotate any exposed credential.

## Secrets

- `.env` files are git-ignored; use `.env.example` as the template.
- NASA Earthdata credentials are read from the environment at runtime only.
- If a secret is ever committed, revoke/rotate it first, then remove it from the
  history (e.g. with `git filter-repo`).
