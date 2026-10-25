# Hinweise für Coding-Agenten

Projektanweisungen, Übergaben und Betriebswissen liegen nicht in diesem
Repository, sondern in einer privaten Ablage des Autors. Wer ohne diese Ablage
arbeitet, hält sich an die folgenden Regeln.

## Grundsätze

- Änderungen nur über einen Pull Request auf `master`. Ein Thema pro PR.
- Commits nach [Conventional Commits](https://www.conventionalcommits.org/de/),
  auf Deutsch, Betreff im Präsens, höchstens 72 Zeichen.
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

> **Kommentare.** Ein Kommentar sagt, warum etwas so ist. Was der Code tut,
> steht im Code; was früher war, steht in der Commit-Nachricht. Höchstens drei
> Zeilen; was mehr braucht, gehört in die Commit-Nachricht oder nach `docs/` im
> selben Repo, mit einem Satz Verweis. Ein Dateikopf ist ein Absatz. Der
> Quelltext ist zum Veröffentlichen geschrieben: keine Hostnamen, IPs, Server-
> oder Proxy-Aufbau, Stack- oder Registry-IDs, Auftragsnummern,
> Befundkennungen, Agenten, Namen außer dem Autor, keine wörtlichen Zitate von
> Entscheidungen, kein Verweis auf die Werkstatt. Ein Datum als Beleg einer
> Entscheidung ist in Ordnung („geprüft gegen 3.4.0 am 17.09.2026"), das Protokoll
> dazu nicht. Kein `TODO` ohne Issue-Nummer, kein auskommentierter Code. Wer
> einen Kommentar anfasst, kürzt ihn auf diese Regel. Gegenprobe vor jedem
> Merge: der Prüf-Scan des Repos meldet „Prüfung ohne Treffer"; wo es einen
> Quelltext-Export gibt, ist das `node scripts/quelltext-export/export.mjs
> HEAD`, sonst gitleaks mit der Konfiguration der Werkstatt.
