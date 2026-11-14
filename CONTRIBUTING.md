# Contributing

Thanks for helping with **Dancing with the SARs**!

> This repository is public for viewing, but **write access is invitation-only**.
> Collaborators are added by the repository owner. If you are not a collaborator,
> please open an issue with your suggestion instead of a pull request.

## Workflow

Tasks, owners and gates are in [`docs/PLAN.md`](docs/PLAN.md); every task has an ID (`A2`, `D4`…).

1. One branch per task, with the ID in the name:
   ```bash
   git switch -c a2-gunw-coherence
   ```
2. Commit messages start with the task ID: `A2: export coherence to common grid`.
3. Run the checks locally before pushing:
   ```bash
   make check
   ```
4. Open a small pull request using the template and merge it into `main` (several times per
   phase; nothing stays out of `main` for more than two hours). `main` always works: every merge
   will publish the app.
5. Raw data never enters git; only the final layers in `web/public/layers/`.
6. Changes to `docs/CONTRACT.md`, `pipeline/caramulo/grid.py` or the map API are announced
   before they are made.

## Data and licensing rules

Space Apps requires every solution to be open source and every source to be cited.

- Do **not** commit datasets, credentials or API keys. `data/`, `.env` and
  credential files are git-ignored.
- Any new dataset or library must be added to [`NOTICE`](NOTICE) and
  [`docs/data-sources.md`](docs/data-sources.md) with its license and citation.
- Relevant AI use goes in one line in [`docs/AI_USE.md`](docs/AI_USE.md).
- Only OSI-approved licenses are allowed for code we write.
- Do not paste proprietary or export-controlled material into the repository.

## Code style

- Python: `ruff format` + `ruff check` (config in `pipeline/pyproject.toml`).
- TypeScript/React: `npm run lint` and `npm run build` inside `web/`.
- Each pipeline module starts with a comment: what goes in, what comes out, which product it reads.

## Commit authorship

Commit with your own name and e-mail; the hackathon requires the work to be
created during the event and attributed to its authors.
