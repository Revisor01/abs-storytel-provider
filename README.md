<h1 align="center">Storytel Provider for Audiobookshelf</h1>

<p align="center">
  A custom metadata provider that lets <a href="https://www.audiobookshelf.org">Audiobookshelf</a>
  match books and audiobooks against Storytel.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Docker-ghcr.io-2496ed?logo=docker" alt="Docker">
  <img src="https://img.shields.io/github/license/Revisor01/abs-storytel-provider" alt="License">
</p>

## About

Audiobookshelf has no built-in Storytel provider. This service queries
Storytel, cleans up the metadata and returns it in the format Audiobookshelf
expects.

## Features
- Clean titles, subtitles and series (multi-series, 20+ languages, abridged markers in 15)
- Separate audiobook and e-book endpoints, multi-region support
- Audiobook metadata: narrator, duration, publisher, ISBN, tags
- Highest-resolution covers Storytel serves (640x640)
- Ranking by author and exact ISBN (sent by Audiobookshelf)
- Plain-text descriptions without HTML
- Persistent SQLite cache to minimize API calls
- Configurable result limit (1–50, default: 5)

## Installation

### Using Docker (recommended)

1. **Create a `docker-compose.yml` file:**

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

    > The `./data` volume keeps the search cache across restarts. Both
    > containers must share `abs_network`; create it with
    > `docker network create abs_network` and add it to your Audiobookshelf
    > container as well.

    <details>
    <summary><strong>Alternative: Using your own network or no shared network</strong></summary>

    If you already have a different network (e.g. `my_network` or `br0`), replace `abs_network` with your network name:

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
        name: br0  # your actual network name
    ```

    If you don't use Docker networking and want to access the provider via port mapping instead:

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

    In this case, use `http://<your-server-ip>:3000` instead of `http://abs-storytel-provider:3000` when configuring the provider in Audiobookshelf.

    </details>

2. **Run Docker Compose:**
    ```bash
    docker compose up -d
    ```

Images are built for `linux/amd64` and `linux/arm64`. Since 2.2.0 there is no
32-bit ARM (armv7) image; on armv7, pin the last one, `sha-ad1d90a`, or switch
to a 64-bit OS.

## Configuration in Audiobookshelf

1. Go to **Settings → Metadata** in Audiobookshelf.
2. Click **Add Custom Provider**.
3. Enter one of the following URLs (replace `<region>` with your region code, e.g. `de`, `se`, `en`):
   - All media: `http://abs-storytel-provider:3000/<region>`
   - Books only: `http://abs-storytel-provider:3000/<region>/book`
   - Audiobooks only: `http://abs-storytel-provider:3000/<region>/audiobook`

   Example for German audiobooks: `http://abs-storytel-provider:3000/de/audiobook`

## Region Support

Use any Storytel region code in the URL path:

| Region | Code | Region | Code |
|--------|------|--------|------|
| Arabic (Egypt, Saudi Arabia, UAE) | `ae` | Icelandic | `is` |
| Bulgarian | `bg` | Indonesian | `id` |
| Brazilian Portuguese | `br` | Italian | `it` |
| Danish | `dk` | Norwegian | `no` |
| Dutch (Belgium, Netherlands) | `nl` | Polish | `pl` |
| English | `en` | Russian | `ru` |
| Finnish | `fi` | Spanish (Colombia, Spain) | `es` |
| French | `fr` | Swedish | `se` |
| German | `de` | Turkish | `tr` |
| Hebrew (Israel) | `il` | Hindi (India) | `in` |

Any valid Storytel region code works — the ones above have optimized title processing.

## Authentication (optional)

Authentication is **disabled by default**. To enable it, set the `AUTH` environment variable:

```yaml
services:
  abs-storytel-provider:
    image: ghcr.io/revisor01/abs-storytel-provider:latest
    environment:
      - AUTH=your-secret-key
```

When `AUTH` is set, all requests must include an `Authorization` header with the exact same value:
```
Authorization: your-secret-key
```

If you configure the provider in Audiobookshelf with authentication, enter the secret key in the Authorization field.

## Versions

Changes are listed in [CHANGELOG.md](CHANGELOG.md), following
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Each version also has
a [release](https://github.com/Revisor01/abs-storytel-provider/releases).

## Self-hosting and development

The Docker image is the easiest way to run the provider (see Installation).
To run it from source, Node.js 22 or newer is required:

```bash
git clone https://github.com/Revisor01/abs-storytel-provider.git
cd abs-storytel-provider
npm install
npm run dev    # auto-reload, listens on port 3000
npm test       # live tests against the Storytel API
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `AUTH` | – | Optional token, see [Authentication](#authentication-optional) |
| `ALLOWED_ORIGINS` | – | Comma-separated CORS origins (all origins allowed if unset) |
| `AXIOS_TIMEOUT_MS` | `5000` | Timeout per Storytel request (Audiobookshelf itself gives up after 10s) |
| `DEFAULT_LIMIT` | `5` | Results returned when no `limit` is given |
| `MAX_LIMIT` | `50` | Upper bound for `limit` |
| `CACHE_DB` | `data/cache.db` | Path of the SQLite cache |
| `CACHE_EVICTION_DAYS` | `30` | Maximum age of cache entries |
| `LOG_LEVEL` | `info` | pino log level (`debug` shows cache hits) |

### Endpoints

- `/<region>/search?query=...` — Returns all available media (books and audiobooks)
- `/<region>/book/search?query=...` — Returns only e-books
- `/<region>/audiobook/search?query=...` — Returns only audiobooks (with narrator, duration, and stats)

Optional parameters:
- `&author=...` — Improves search relevance and ranks results by author match
- `&limit=N` — Maximum number of results (1–50, default: 5)
- `&isbn=...` — Ranks the exact ISBN match first (Audiobookshelf sends this automatically)

If Storytel is unreachable or returns an error, the provider answers with HTTP 503 instead of an empty result.

### Caching

Each unique search is sent to Storytel once and then served from `data/cache.db`, which avoids rate limiting (HTTP 403). Empty results are never cached; entries older than `CACHE_EVICTION_DAYS` are ignored. To clear the cache, delete `data/cache.db` and restart the container.

## Architecture

```
abs-storytel-provider
├── src/
│   ├── server.js     — HTTP server, routes, authentication, CORS
│   ├── provider.js   — Storytel search, ranking and metadata cleanup
│   ├── config.js     — settings from environment variables
│   └── logger.js     — structured logging
└── test/             — live tests (node --test), run on every pull request
```

## Known Limitations
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book
- Series information comes from Storytel and may not always match the actual series name

## Contributing

Bug reports and suggestions are welcome as
[issues](https://github.com/Revisor01/abs-storytel-provider/issues). Please
report security issues privately as described in [SECURITY.md](SECURITY.md).
Pull requests run through the tests and a secret scan; see
[CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT License — see [LICENSE](LICENSE) for details.

## Disclaimer

This is an independent project. It is not affiliated with, endorsed or
supported by Storytel or Audiobookshelf.

## Contact

Simon Luthe · [mail@simonluthe.de](mailto:mail@simonluthe.de) ·
[simonluthe.de](https://simonluthe.de)
