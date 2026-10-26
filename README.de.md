<h1 align="center">Storytel-Provider für Audiobookshelf</h1>

<p align="center">
  Ein eigener Metadaten-Provider, mit dem <a href="https://www.audiobookshelf.org">Audiobookshelf</a>
  Bücher und Hörbücher mit Storytel abgleicht.
</p>

<p align="center">
  <a href="README.md">English</a> · <b>Deutsch</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Docker-ghcr.io-2496ed?logo=docker" alt="Docker">
  <img src="https://img.shields.io/github/license/Revisor01/abs-storytel-provider" alt="Lizenz">
</p>

## Worum es geht

Audiobookshelf holt Titel, Cover, Reihen und Sprecher:innen von
Metadaten-Providern, Storytel gehört aber nicht zu den eingebauten. Dieser
Dienst sitzt dazwischen: Audiobookshelf fragt ihn, er fragt Storytel, räumt die
Antwort auf und gibt sie im Format zurück, das Audiobookshelf erwartet.
Ergebnisse werden lokal zwischengespeichert, jede Suche erreicht Storytel also
nur einmal.

## Funktionen
- Cover in der höchsten Auflösung, die Storytel liefert (640x640)
- Kluger Umgang mit Titeln und Reihen, Untertitel werden herausgelöst
- Viele Regionen (über 20 Sprachen)
- Getrennte Endpunkte für Hörbücher und E-Books mit sauberer Typfilterung
- Hörbuch-Metadaten (Sprecher:in, Dauer, Verlag, ISBN)
- Sortierung nach Autor:in, wenn diese mitgegeben wird
- Automatisch ein zweiter Versuch ohne Autor:in, wenn die kombinierte Suche nichts findet
- ISBN-Treffer zuerst: ein exakter ISBN-Treffer (von Audiobookshelf mitgeschickt) steht oben
- Mehrere Reihen je Buch
- Schlagwörter
- HTML wird aus Beschreibungen entfernt
- Hinweise „gekürzt/ungekürzt“ werden in 15 Sprachen entfernt
- Dauerhafter SQLite-Zwischenspeicher, damit möglichst wenige API-Aufrufe nötig sind
- Einstellbare Zahl der Ergebnisse (1–50, Standard: 5)

## Installation

### Mit Docker (empfohlen)

1. **Eine `docker-compose.yml` anlegen:**

    ```yaml
    services:
      abs-storytel-provider:
        image: ghcr.io/revisor01/abs-storytel-provider:latest
        container_name: abs-storytel-provider
        volumes:
          - ./data:/app/data
        restart: unless-stopped
        networks:
          - abs_network

    networks:
      abs_network:
        external: true
    ```

    > **Wichtig:** Der Mount `./data:/app/data` ist für den dauerhaften Suchspeicher nötig. Ohne ihn geht der Speicher bei jedem Neustart des Containers verloren.
    >
    > `abs_network` ist ein Docker-Netz, über das dieser Container den Container von Audiobookshelf beim Namen erreicht. Beide Container müssen im selben Netz sein.
    >
    > Gibt es das Netz noch nicht, zuerst anlegen:
    > ```bash
    > docker network create abs_network
    > ```
    > Dann auch den Audiobookshelf-Container in dieses Netz aufnehmen (`abs_network` unter `networks:` ergänzen).

    <details>
    <summary><strong>Alternative: eigenes Netz oder kein gemeinsames Netz</strong></summary>

    Wer schon ein anderes Netz nutzt (etwa `my_network` oder `br0`), ersetzt `abs_network` durch dessen Namen:

    ```yaml
    services:
      abs-storytel-provider:
        image: ghcr.io/revisor01/abs-storytel-provider:latest
        container_name: abs-storytel-provider
        volumes:
          - ./data:/app/data
        restart: unless-stopped
        networks:
          - my_network

    networks:
      my_network:
        external: true
        name: br0  # der tatsächliche Name des Netzes
    ```

    Ohne Docker-Netz, über eine Portfreigabe:

    ```yaml
    services:
      abs-storytel-provider:
        image: ghcr.io/revisor01/abs-storytel-provider:latest
        container_name: abs-storytel-provider
        volumes:
          - ./data:/app/data
        restart: unless-stopped
        ports:
          - "3000:3000"
    ```

    In diesem Fall in Audiobookshelf `http://<ip-des-servers>:3000` statt `http://abs-storytel-provider:3000` eintragen.

    </details>

2. **Docker Compose starten:**
    ```bash
    docker compose up -d
    ```

## Einrichtung in Audiobookshelf

1. In Audiobookshelf **Einstellungen → Metadaten** öffnen.
2. **Eigenen Provider hinzufügen** wählen.
3. Eine dieser Adressen eintragen (`<region>` durch den Regionscode ersetzen, z. B. `de`, `se`, `en`):
   - Alle Medien: `http://abs-storytel-provider:3000/<region>`
   - Nur Bücher: `http://abs-storytel-provider:3000/<region>/book`
   - Nur Hörbücher: `http://abs-storytel-provider:3000/<region>/audiobook`

   Beispiel für deutsche Hörbücher: `http://abs-storytel-provider:3000/de/audiobook`

## Regionen

Jeder Regionscode von Storytel funktioniert im Pfad:

| Region | Code | Region | Code |
|--------|------|--------|------|
| Arabisch (Ägypten, Saudi-Arabien, VAE) | `ae` | Isländisch | `is` |
| Bulgarisch | `bg` | Indonesisch | `id` |
| Brasilianisches Portugiesisch | `br` | Italienisch | `it` |
| Dänisch | `dk` | Norwegisch | `no` |
| Niederländisch (Belgien, Niederlande) | `nl` | Polnisch | `pl` |
| Englisch | `en` | Russisch | `ru` |
| Finnisch | `fi` | Spanisch (Kolumbien, Spanien) | `es` |
| Französisch | `fr` | Schwedisch | `se` |
| Deutsch | `de` | Türkisch | `tr` |
| Hebräisch (Israel) | `il` | Hindi (Indien) | `in` |

Jeder gültige Regionscode funktioniert — für die oben genannten ist die Aufbereitung der Titel abgestimmt.

## Anmeldung (optional)

Die Anmeldung ist **standardmäßig aus**. Zum Einschalten die Umgebungsvariable `AUTH` setzen:

```yaml
services:
  abs-storytel-provider:
    image: ghcr.io/revisor01/abs-storytel-provider:latest
    environment:
      - AUTH=your-secret-key
```

Ist `AUTH` gesetzt, muss jede Anfrage einen `Authorization`-Header mit genau diesem Wert mitschicken:
```
Authorization: your-secret-key
```

In Audiobookshelf den Schlüssel dann im Feld „Authorization“ des Providers eintragen.

## Versionen

Die Änderungen stehen in [CHANGELOG.md](CHANGELOG.md) (englisch), nach
[Keep a Changelog](https://keepachangelog.com/de/1.1.0/). Jede Version hat
außerdem ein [Release](https://github.com/Revisor01/abs-storytel-provider/releases).

## Selbst betreiben und entwickeln

Am einfachsten läuft der Provider als Docker-Abbild (siehe Installation). Aus
dem Quelltext braucht es Node.js 22 oder neuer:

```bash
git clone https://github.com/Revisor01/abs-storytel-provider.git
cd abs-storytel-provider
npm install
npm run dev    # lädt bei Änderungen neu, Port 3000
npm test       # Live-Tests gegen die Storytel-API
```

### Umgebungsvariablen

| Variable | Standard | Bedeutung |
|----------|----------|-----------|
| `PORT` | `3000` | HTTP-Port |
| `AUTH` | – | optionaler Schlüssel, siehe [Anmeldung](#anmeldung-optional) |
| `ALLOWED_ORIGINS` | – | erlaubte CORS-Quellen, durch Komma getrennt (ohne Angabe: alle) |
| `AXIOS_TIMEOUT_MS` | `5000` | Zeitlimit je Anfrage an Storytel (Audiobookshelf selbst gibt nach 10 s auf) |
| `DEFAULT_LIMIT` | `5` | Zahl der Ergebnisse ohne `limit` |
| `MAX_LIMIT` | `50` | Obergrenze für `limit` |
| `CACHE_DB` | `data/cache.db` | Pfad des SQLite-Zwischenspeichers |
| `CACHE_EVICTION_DAYS` | `30` | höchstes Alter der Einträge im Zwischenspeicher |
| `LOG_LEVEL` | `info` | Log-Stufe von pino (`debug` zeigt Treffer im Zwischenspeicher) |

### Endpunkte

- `/<region>/search?query=...` — alle Medien (Bücher und Hörbücher)
- `/<region>/book/search?query=...` — nur E-Books
- `/<region>/audiobook/search?query=...` — nur Hörbücher (mit Sprecher:in, Dauer und Statistik)

Optionale Parameter:
- `&author=...` — verbessert die Treffer und sortiert nach Übereinstimmung der Autor:in
- `&limit=N` — höchste Zahl der Ergebnisse (1–50, Standard: 5)
- `&isbn=...` — stellt den exakten ISBN-Treffer nach oben (Audiobookshelf schickt das von selbst mit)

Ist Storytel nicht erreichbar oder meldet einen Fehler, antwortet der Provider mit HTTP 503 statt mit einer leeren Liste. So werden Ausfälle in den Logs von Audiobookshelf sichtbar.

### Zwischenspeicher

Suchergebnisse liegen in einer **dauerhaften SQLite-Datenbank** (`data/cache.db`). Jede Suche geht nur einmal an Storytel, alle weiteren Anfragen beantwortet der lokale Speicher. Das verhindert Drosselung (Fehler 403) und beschleunigt wiederholte Suchen.

- Leere Ergebnisse (etwa nach Zeitüberschreitung oder API-Fehler) werden **nie** gespeichert
- Veraltete leere Einträge älterer Versionen werden beim Start entfernt
- Einträge, die älter als `CACHE_EVICTION_DAYS` (Standard: 30) sind, werden ignoriert und beim Start gelöscht. Von Hand leeren: `data/cache.db` löschen und den Container neu starten.

### Aufbereitung der Metadaten

#### Titel
- Entfernt Hinweise „gekürzt/ungekürzt“ in 15 Sprachen
- Entfernt Reihen-, Folgen- und Bandangaben aus Titeln in über 20 Sprachen
- Löst Untertitel heraus (Trennung an `:` oder ` - `)
- Tauscht rein numerische Titel gegen den Untertitel

#### Reihen
- Alle Reihen, zu denen ein Buch gehört
- Reihen auch ohne Bandnummer
- Entfernt den Reihennamen aus dem Titel, damit er nicht doppelt steht

#### Cover
- Angefragt in 1200x1200; das CDN von Storytel liefert derzeit höchstens 640x640
- Bei der Suche nach E-Books die Cover der E-Book-Ausgabe

#### Beschreibung
- HTML entfernt, Entitäten aufgelöst
- Sauberer Klartext

## Aufbau

```
abs-storytel-provider
├── src/
│   ├── server.js     — HTTP-Server, Routen, Anmeldung, CORS
│   ├── provider.js   — Suche bei Storytel, Sortierung, Aufbereitung der Metadaten
│   ├── config.js     — Einstellungen aus Umgebungsvariablen
│   └── logger.js     — strukturierte Logs
└── test/             — Live-Tests (node --test), laufen bei jedem Pull Request
```

**Grundsätze:**
- **Ausfälle müssen sichtbar sein.** Fällt Storytel aus, antwortet der
  Provider mit HTTP 503 statt mit einer leeren Liste, und leere Ergebnisse
  werden nie gespeichert.
- **Storytel so selten wie möglich fragen.** Jede Suche wird gespeichert.

## Bekannte Grenzen
- Die Ergebnisse hängen davon ab, dass die Storytel-API erreichbar ist
- Je nach Buch fehlen einzelne Metadaten
- Reiheninformationen kommen von Storytel und passen nicht immer zum tatsächlichen Reihennamen

## Mitmachen

Fehlermeldungen und Vorschläge sind willkommen — gern als
[Issue](https://github.com/Revisor01/abs-storytel-provider/issues).
Sicherheitslücken bitte vertraulich melden, wie in [SECURITY.md](SECURITY.md)
beschrieben. Pull Requests laufen durch die Tests und einen Secret-Scan; siehe
[CONTRIBUTING.md](CONTRIBUTING.md).

## Lizenz

MIT-Lizenz — siehe [LICENSE](LICENSE).

## Hinweis

Ein unabhängiges Projekt. Es gehört weder zu Storytel noch zu Audiobookshelf
und wird von keinem der beiden unterstützt.

## Kontakt

Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
