# Storytel Provider for Audiobookshelf
A metadata provider that fetches book information from Storytel's API.

## Features
- High-resolution cover images (1200x1200)
- Smart title and series handling with subtitle extraction
- Multi-region support (20+ languages)
- Separate audiobook and e-book endpoints with proper type filtering
- Audiobook-specific metadata (narrator, duration, publisher, ISBN)
- Author relevance ranking when author is provided
- Multi-series support
- Tags extraction
- HTML cleanup in descriptions
- Abridged/Unabridged marker removal in 15 languages
- Persistent SQLite cache to minimize API calls
- Configurable result limit (1–10)

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

    > **Important:** The volume mount `./data:/app/data` is required for the persistent search cache. Without it, the cache is lost on container restart.
    >
    > The `abs_network` is a Docker network that allows this container to communicate with your Audiobookshelf container by name. Both containers must be on the same network.
    >
    > If you don't have this network yet, create it first:
    > ```bash
    > docker network create abs_network
    > ```
    > Then also add your Audiobookshelf container to this network (add `abs_network` to its `networks:` section).

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

## Configuration in Audiobookshelf

1. Go to **Settings → Metadata** in Audiobookshelf.
2. Click **Add Custom Provider**.
3. Enter one of the following URLs (replace `<region>` with your region code, e.g. `de`, `se`, `en`):
   - All media: `http://abs-storytel-provider:3000/<region>`
   - Books only: `http://abs-storytel-provider:3000/<region>/book`
   - Audiobooks only: `http://abs-storytel-provider:3000/<region>/audiobook`

   Example for German audiobooks: `http://abs-storytel-provider:3000/de/audiobook`

## Endpoints

- `/<region>/search?query=...` — Returns all available media (books and audiobooks)
- `/<region>/book/search?query=...` — Returns only e-books
- `/<region>/audiobook/search?query=...` — Returns only audiobooks (with narrator, duration, and stats)

Optional parameters:
- `&author=...` — Improves search relevance and ranks results by author match
- `&limit=N` — Maximum number of results (1–10, default: 5)

## Region Support

Use any Storytel region code in the URL path:

| Region | Code | Example URL |
|--------|------|-------------|
| German | `de` | `http://abs-storytel-provider:3000/de` |
| Swedish | `se` | `http://abs-storytel-provider:3000/se` |
| English | `en` | `http://abs-storytel-provider:3000/en` |
| Polish | `pl` | `http://abs-storytel-provider:3000/pl` |
| ... | ... | Any valid Storytel region code works |

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

## Metadata Processing

### Title Handling
- Removes abridged/unabridged markers in 15 languages
- Cleans series/episode/volume markers from titles across 20+ languages
- Extracts subtitles (splits on `:` or ` - `)
- Swaps numeric-only titles with subtitle

### Series Information
- Extracts all series a book belongs to (multi-series support)
- Returns series even without a sequence number
- Removes series name from title to avoid duplication

### Cover Images
- Upgraded to 1200x1200 resolution
- Uses e-book-specific covers when searching for e-books

### Description
- HTML tags stripped and entities decoded
- Clean plaintext output

## Caching

Search results are stored in a **persistent SQLite database** (`data/cache.db`). Each unique search query is only sent to Storytel once — all subsequent requests are served from the local cache. This prevents rate-limiting (403 errors) and speeds up repeated searches.

The cache has no expiration. To clear it, delete `data/cache.db` and restart the container.

## Known Limitations
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book
- Series information comes from Storytel and may not always match the actual series name

## License

MIT License — see [LICENSE](LICENSE) for details.