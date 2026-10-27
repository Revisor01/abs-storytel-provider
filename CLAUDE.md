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

> **Comments.** A comment is one line and says why something is the way it is.
> Not what the code does, not how it came about, no maxims, no explanatory
> prose. This is enough: "Deploy script instead of a Portainer webhook: no
> Portainer runs on the target server." Two lines only where an error would
> otherwise follow; history belongs in the commit message. A file header names
> in one line what the file is, at most plus how to call it. The source is
> written for publication: no hostnames, IPs, server or proxy setup, stack or
> registry IDs, task numbers, finding IDs, agents, names other than the author,
> no verbatim quotes of decisions, no reference to private notes. No `TODO`
> without an issue number, no commented-out code. Whoever touches a comment
> shortens it to this rule. Check before every merge: the secret scan reports
> no findings.
