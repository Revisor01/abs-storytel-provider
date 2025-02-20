# Storytel Provider for Audiobookshelf

A metadata provider that fetches book information from Storytel's API.

## Features

- High-resolution cover images (640x640)
- Smart title and series handling

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
        security_opt:
          - no-new-privileges:true
    ```

2. **Run Docker Compose:**
    ```bash
    docker-compose up -d
    ```

    This command will pull the image, create the container, and start it in detached mode.

## Configuration in Audiobookshelf

1.  Go to Settings -> Metadata in Audiobookshelf.
2.  Add Custom Provider.
3.  URL: `http://storytel-provider:3000/<lang-code>` (e.g. `http://storytel-provider:3000/de/`)

## Metadata Processing

### Title Handling

- Removes format indicators (Ungekürzt/Gekürzt)
- Cleans series information from titles
- Extracts subtitles
- Handles various series formats:
    - "Title, Folge X"
    - "Title, Band X"
    - "Title - Teil X"
    - "Title, Volume X"

### Series Information

- Formats series information as "Series Name, Number"
- Maintains clean titles without series markers

## License

MIT License (Set by Revisor01.  No license file was provided in the repository)