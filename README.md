# Storytel Provider for Audiobookshelf
A metadata provider that fetches book information from Storytel's API.

## Features
- High-resolution cover images (640x640)
- Smart title and series handling
- Multi-region support

## Installation
### Using Docker (recommended)
1. **Create a `docker-compose.yml` file:**
   ```yaml
   version: "3.8"
   services:
     storytel-provider:
       image: ghcr.io/revisor01/storytel-provider:latest
       container_name: storytel-provider
       restart: unless-stopped
       networks:
         - abs_network
       security_opt:
         - no-new-privileges:true
   networks:
     abs_network:
       external: true # Or create a network if needed
   ```

2. **Run Docker Compose:**
   ```bash
   docker-compose up -d
   ```

3. **Ensure Network Connectivity:**
   - Make sure the `abs_network` exists and your Audiobookshelf instance is also connected to this network.
   - If `abs_network` doesn't exist, create it with `docker network create abs_network`.

## Configuration in Audiobookshelf
1. Go to Settings -> Metadata in Audiobookshelf.
2. Add Custom Provider.
3. URL: `http://storytel-provider:3000/region` (replace 'region' with your desired region code)

## Region Support
The provider supports different Storytel regions through the URL path. Simply append your region code to the base URL:
- German: `http://storytel-provider:3000/de`
- Swedish: `http://storytel-provider:3000/se`
- English (default): `http://storytel-provider:3000/en`

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

## Known Limitations
- Title cleanup patterns are optimized for German titles but include some English patterns
- Search results depend on Storytel API availability
- Some metadata fields might be unavailable depending on the book

## License
MIT License