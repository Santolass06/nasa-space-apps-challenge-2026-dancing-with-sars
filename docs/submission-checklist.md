# Submission checklist — NASA Space Apps 2026

Sources: official 2026 Terms & Conditions (<https://www.spaceappschallenge.org/legal>) and the
*Project Submission and Judging & Awards* session (2026). Confirm details in the live
Project Submission Guide before the deadline.

Ticked on 2026-11-15, after checking each one: first commit is 2026-11-14 14:27 UTC; the
repository is public with `LICENSE` (Apache-2.0) and `NOTICE` at the root, a description and
six topics; credits are in `NOTICE` and `data-sources.md`; the history was scanned for secrets
(only variable names and comments such as `EARTHDATA_PASSWORD`, no credentials); the GitHub
Pages demo answers 200. Everything else (team page, demo video, project page, submission)
depends on the team and is still open.

## Hard requirements

- [ ] Project submitted from the **team page → Project tab** before
      **Sunday 15 November 2026, 23:59 local time**. Team target: submitted by **20:00**.
- [ ] Team registered, 1–6 members, all in the same Local Event or the Universal Event, and
      **visible on the team page before the deadline**.
- [x] The solution addresses **one** official challenge - *Dancing with the SARs*.
- [x] Work was **created during the event** (14–15 Nov). The commit history is the check:
      no pre-built project code.
- [x] **Open-source license** - OSI-approved. This repo uses Apache-2.0 (NASA's default when
      no license is given). Keep `LICENSE`, `NOTICE` and `docs/data-sources.md` up to date.
- [x] External resources (code, images, text) identified as such.
- [x] **Code in a public repository** linked from the project page (this repo is public).
- [ ] **Publicly accessible demo link**, with no password, permission request or registration.
      GitHub, YouTube, Google Drive, OneDrive, Dropbox or a hosted site are accepted.
- [ ] **Every source cited**, including open-source libraries and NASA data. Fill the
      references field in the submission form.

## Demo format

| Option | Limit |
| --- | --- |
| Slide presentation | **Maximum 7 slides**, including title and intro slides |
| Video presentation | **Maximum 30 seconds** |

- [ ] Going over the limit takes the project out of global judging.
- [ ] Project page and materials in **English**; a video may be spoken in another language but
      needs **English subtitles**.
- [ ] Demo uploaded to an external host (not to the Space Apps site) and the link tested in a
      private/incognito window.
- [ ] No PII; no names, voices or likeness of people under 18.

## Project page content

- [ ] Title and one-paragraph high-level summary.
- [ ] Clear explanation of what it does, how it uses NISAR data, and the study area.
- [ ] Screenshots or a short walkthrough.
- [ ] Demo link and repository link.
- [ ] References: every dataset, paper, tutorial and library with links.
- [ ] Use of AI described (from [`AI_USE.md`](AI_USE.md)).
- [ ] Credits: team members and their roles.

## Finalisation

- [x] `LICENSE` and `NOTICE` readable at the repository root.
- [x] `README.md` explains setup and the scientific reasoning.
- [x] No secrets in the repo (`git log -p | grep -i -E 'password|token|secret'`).
- [x] Repository topics/description set; Pages/demo deployment working.
- [ ] Submit **and** click *Submit to Global Judging* if applicable.
- [ ] Download the participant certificate from the profile page.
