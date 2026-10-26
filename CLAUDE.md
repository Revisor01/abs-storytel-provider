# Hinweise für Coding-Agenten

Projektanweisungen, Übergaben und Betriebswissen liegen nicht in diesem
Repository, sondern in einer privaten Ablage des Autors. Wer ohne diese Ablage
arbeitet, hält sich an die folgenden Regeln.

## Grundsätze

- Änderungen nur über einen Pull Request auf `master`. Ein Thema pro PR.
- Commits nach [Conventional Commits](https://www.conventionalcommits.org/de/),
  Betreff im Präsens, höchstens 72 Zeichen, auf Deutsch oder Englisch.
- Jede Änderung, die Nutzer:innen bemerken, kommt im selben PR in
  `CHANGELOG.md` unter `[Unreleased]`
  ([Keep a Changelog](https://keepachangelog.com/de/1.1.0/)).
- Neues Verhalten bekommt einen Test, eine Fehlerbehebung zuerst den Test, der
  den Fehler zeigt.
- Keine neuen Abhängigkeiten ohne Rücksprache.
- In dieses Repository gehören keine Zugangsdaten, Hostnamen privater Server,
  lokalen Pfade, Testkonten oder Arbeitsnotizen, auch nicht in
  Commit-Nachrichten, PR-Texten oder Kommentaren. Der Secret-Scan in CI prüft
  das.

## Kommentare

Ein Kommentar sagt, warum etwas so ist, nicht was der Code tut oder wie es
früher war. Höchstens drei Zeilen; was mehr braucht, gehört in die
Commit-Nachricht oder nach `docs/`. Keine Hostnamen, IPs oder Serverdetails,
kein `TODO` ohne Issue-Nummer, kein auskommentierter Code.

## In English

Project instructions and handover notes are kept outside this repository.
Without them: changes only via pull request to `master`, one topic each;
Conventional Commits in English or German; user-visible changes go into `CHANGELOG.md` under `[Unreleased]`; new behaviour gets a test, a bug fix first gets the test that shows the
bug;
no new dependencies without asking; no credentials, private hostnames, local
paths, test accounts or work notes anywhere in the repository. Comments
explain why, at most three lines.
