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
1. **Create a `docker-compose.yml` file:** Create a `docker-compose.yml` file in your desired directory with the following content:

    ```yaml
    version: "3.8"
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

    Ensure Network Connectivity:
    - Make sure the `abs_network` exists and your Audiobookshelf instance is also connected to this network.
    - If `abs_network` doesn't exist, create it with `docker network create abs_network`.

2. **Run Docker Compose:**
    ```bash
    docker-compose up -d
    ```

    This command will pull the image, create the container, and start it in detached mode.

## Configuration in Audiobookshelf
1. Go to Settings -> Metadata in Audiobookshelf.
2. Add Custom Provider.
3. Choose one of the following endpoints:
   - All media: `http://abs-storytel-provider:3000/<region>` (e.g. `http://abs-storytel-provider:3000/de`)
   - Books only: `http://abs-storytel-provider:3000/<region>/book`
   - Audiobooks only: `http://abs-storytel-provider:3000/<region>/audiobook`

## Endpoints
The provider offers three different endpoints:

- `/<region>` - Returns all available media (books and audiobooks)
- `/<region>/book` - Same as above, returns only ebooks
- `/<region>/audiobook` - Returns only audiobooks

## Region Support
The provider supports different Storytel regions through the URL path. Simply append your region code to the base URL:
- German: `http://abs-storytel-provider:3000/de`
- Swedish: `http://abs-storytel-provider:3000/se`
- English (default): `http://abs-storytel-provider:3000/en`

## Authentication

This provider includes authentication to prevent unauthorized access. To use the provider, you must set the `AUTH` environment variable to a secret value.

To set the `AUTH` environment variable in Docker Compose, add the following to your `docker-compose.yml` file or use `.env`:

```yaml
services:
  abs-storytel-provider:
    environment:
      - AUTH=your-secret-key
```

Replace `"your-secret-key"` with your actual secret key.

To access the provider, you must include the `Authorization` header in your requests with the value of the `AUTH` environment variable.

## Metadata Processing
### Title Handling
- Removes format indicators
- Cleans series information from titles
- Extracts subtitles
- Handles various series formats

### Series Information
- Formats series information as "Series Name, Number"
- Maintains clean titles without series markers

### Audiobook-Specific Metadata
- Duration in minutes
- Narrator information
- Audio format and bitrate
- Publisher details
- Release year

## Known Limitations
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book
- Maximum of 5 results per search

## License

MIT License

See the [LICENSE](LICENSE) file for details.