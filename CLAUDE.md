# Notes for coding agents

Project instructions, handover notes and operational knowledge are kept
outside this repository, in the author's private notes. Without them, follow
these rules.

## Principles

- Changes only via a pull request to `master`. One topic per PR.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/),
  subject in the imperative, at most 72 characters, in English or German.
- Every change users notice goes into `CHANGELOG.md` under `[Unreleased]` in
  the same PR ([Keep a Changelog](https://keepachangelog.com/en/1.1.0/)).
- New behaviour gets a test; a bug fix first gets the test that shows the bug.
- No new dependencies without asking.
- No credentials, private hostnames, local paths, test accounts or work notes
  in this repository, including commit messages, PR texts and comments. The
  secret scan in CI checks this.

## Comments

A comment explains why something is the way it is, not what the code does or
how it used to be. At most three lines; anything longer belongs in the commit
message or in `docs/`. No hostnames, IPs or server details, no `TODO` without
an issue number, no commented-out code.
