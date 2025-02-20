# Storytel Provider for Audiobookshelf
A metadata provider that fetches book information from Storytel's API.

## Features
- High-resolution cover images (640x640)
- Smart title and series handling
- Multi-region support

## Installation
### Using Docker (recommended)
1. **Create a `docker-compose.yml` file:** Create a `docker-compose.yml` file in your desired directory with the following content:

    ```yaml
    version: "3.8"
    services:
      storytel-provider:
        image: ghcr.io/vito0912/storytel-provider:latest
        container_name: storytel-provider
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
3. URL: `http://storytel-provider:3000/<lang-code>` (e.g. `http://storytel-provider:3000/de/`)
For specific regions, use the region code (e.g., de, se, en).  See "Region Support" below.

## Region Support
The provider supports different Storytel regions through the URL path. Simply append your region code to the base URL:
- German: `http://storytel-provider:3000/de`
- Swedish: `http://storytel-provider:3000/se`
- English (default): `http://storytel-provider:3000/en`

## Metadata Processing
### Title Handling
- Removes format indicators
- Cleans series information from titles
- Extracts subtitles
- Handles various series formats

### Series Information
- Formats series information as "Series Name, Number"
- Maintains clean titles without series markers

## Known Limitations
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book

## License

MIT License (Set by Revisor01.  No license file was provided in the repository)