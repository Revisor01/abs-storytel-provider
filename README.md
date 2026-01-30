# Storytel Provider for Audiobookshelf
A metadata provider that fetches book information from Storytel's API.

## Features
- High-resolution cover images (640x640)
- Smart title and series handling
- Multi-region support
- Separate audiobook and book endpoints
- Audiobook-specific metadata and statistics

## Installation

### Using Docker (recommended)

1. **Create a `docker-compose.yml` file:**

    ```yaml
    services:
      abs-storytel-provider:
        image: ghcr.io/revisor01/abs-storytel-provider:latest
        container_name: abs-storytel-provider
        restart: unless-stopped
        networks:
          - abs_network
        security_opt:
          - no-new-privileges:true

    networks:
      abs_network:
        external: true
    ```

    > **Important:** The `abs_network` is a Docker network that allows this container to communicate with your Audiobookshelf container by name. Both containers must be on the same network.
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
- `/<region>/book/search?query=...` — Returns only e-books (no audiobooks)
- `/<region>/audiobook/search?query=...` — Returns only audiobooks (with narrator, duration, and stats)

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
- Removes format indicators (e.g. "Ungekürzt", "Gekürzt")
- Cleans series/episode/volume markers from titles across 20+ languages
- Extracts subtitles

### Series Information
- Automatically extracts series name and number
- Formats as "Series Name, Number"

### Audiobook-Specific Metadata
- Duration in minutes
- Narrator information
- Publisher details
- Release year
- ISBN

## Known Limitations
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book
- Maximum of 5 results per search

## License

MIT License — see [LICENSE](LICENSE) for details.
