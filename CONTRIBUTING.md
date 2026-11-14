# Contributing

Thanks for helping with **Dancing with the SARs**!

> This repository is public for viewing, but **write access is invitation-only**.
> Collaborators are added by the repository owner. If you are not a collaborator,
> please open an issue with your suggestion instead of a pull request.

## Workflow

1. Create a branch from `main`:
   ```bash
   git switch -c feat/<short-description>
   ```
2. Make focused commits using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat(frontend): add scene timeline slider
   fix(api): handle missing bbox parameter
   docs(data): add NISAR citation strings
   ```
3. Run the checks locally before pushing:
   ```bash
   make check
   ```
4. Open a pull request using the template. Keep PRs small and describe the
   **what**, the **why** and how you tested it.
5. At least one review is required before merging.

## Branch naming

| Prefix | Use |
| --- | --- |
| `feat/` | New feature |
| `fix/` | Bug fix |
| `data/` | Data pipeline or dataset changes |
| `docs/` | Documentation only |
| `chore/` | Tooling, CI, dependencies |

## Data and licensing rules

Space Apps requires every solution to be open source and every source to be cited.

- Do **not** commit datasets, credentials or API keys. `data/`, `.env` and
  credential files are git-ignored.
- Any new dataset or library must be added to [`NOTICE`](NOTICE) and
  [`docs/data-sources.md`](docs/data-sources.md) with its license and citation.
- Only OSI-approved licenses are allowed for code we write.
- Do not paste proprietary or export-controlled material into the repository.

## Code style

- Python: `ruff format` + `ruff check` (config in `backend/pyproject.toml`).
- TypeScript/React: `npm run lint` and `npm run build` inside `frontend/`.
- Keep public functions typed and documented where the intent is not obvious.

## Commit authorship

Commit with your own name and e-mail; the hackathon requires the work to be
created during the event and attributed to its authors.
