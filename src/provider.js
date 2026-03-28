const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { AXIOS_TIMEOUT_MS, DEFAULT_LIMIT, MAX_LIMIT, CACHE_DB_PATH } = require('./config');

// Persistent SQLite cache
const dbPath = CACHE_DB_PATH;
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
    CREATE TABLE IF NOT EXISTS search_cache (
        cache_key TEXT PRIMARY KEY,
        response TEXT NOT NULL,
        created_at INTEGER NOT NULL
    )
`);

// Clean up empty cache entries from previous versions
db.exec(`DELETE FROM search_cache WHERE response = '{"matches":[]}'`);

const getCache = db.prepare('SELECT response FROM search_cache WHERE cache_key = ?');
const setCache = db.prepare('INSERT OR REPLACE INTO search_cache (cache_key, response, created_at) VALUES (?, ?, ?)');

class StorytelProvider {
    constructor() {
        this.baseSearchUrl = 'https://www.storytel.com/api/search.action';
        this.locale = 'en';
    }

    /**
     * Sets the locale for the provider
     * @param locale {string} The locale to set
     */
    setLocale(locale) {
        this.locale = locale;
    }

    /**
     * Ensures a value is a string and trims it. Used for cleaning up data and returns
     * @param value
     * @returns {string}
     */
    ensureString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    /**
     * Upgrades the cover URL to a higher resolution
     * @param url
     * @returns {undefined|string}
     */
    upgradeCoverUrl(url) {
        if (!url) return undefined;
        return `https://storytel.com${url.replace(/\d{3}x\d{3}/, '1200x1200')}`;
    }

    /**
     * Splits a genre by / or , and trims the resulting strings
     * @param genre {string}
     * @returns {*[]}
     */
    splitGenre(genre) {
        if (!genre) return [];
        return genre.split(/[\/,]/).map(g => {
            const trimmedGenre = g.trim();
            return trimmedGenre === 'Sci-Fi' ? 'Science-Fiction' : trimmedGenre;
        });
    }

    /**
     * Escapes special characters in RegEx patterns
     * @param str {string} String to escape
     * @returns {string}
     */
    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Strips HTML tags and decodes common HTML entities from a string
     * @param str {string}
     * @returns {string}
     */
    stripHtml(str) {
        if (!str) return '';
        return str
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /**
     * Calculates a simple author match score (0-1)
     * @param resultAuthor {string}
     * @param searchAuthor {string}
     * @returns {number}
     */
    authorMatchScore(resultAuthor, searchAuthor) {
        if (!searchAuthor || !resultAuthor) return 0;
        const normalize = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
        const result = normalize(resultAuthor);
        const search = normalize(searchAuthor);
        if (result === search) return 1;
        if (result.includes(search) || search.includes(result)) return 0.8;
        const searchParts = search.split(/\s+/);
        const matchedParts = searchParts.filter(part => result.includes(part));
        return matchedParts.length / searchParts.length * 0.6;
    }

    /**
     * Formats the book metadata to the ABS format
     * @param bookData
     * @param type {string} Type filter: 'audiobook', 'ebook', or 'all'
     * @returns {object|null}
     */
    formatBookMetadata(bookData, type = 'all') {
        const slb = bookData.slb;
        if (!slb || !slb.book) return null;

        const book = slb.book;
        let abook = slb.abook;
        let ebook = slb.ebook;

        // Filter by type
        switch (type) {
            case 'audiobook':
                ebook = undefined;
                if (!abook) return null;
                break;
            case 'ebook':
                abook = undefined;
                if (!ebook) return null;
                break;
            default:
                if (!abook && !ebook) return null;
                break;
        }

        let seriesInfo = null;
        let seriesName = null;
        if (book.series && book.series.length > 0) {
            seriesName = book.series[0].name;
            seriesInfo = book.series.map(s => ({
                series: this.ensureString(s.name),
                sequence: book.seriesOrder ? this.ensureString(book.seriesOrder) : undefined
            }));
        }

        const author = this.ensureString(book.authorsAsString);

        let title = book.name;
        let subtitle = null;

        // These patterns match various series and volume indicators across different languages
        // Current Patterns for all Storytel regions
        const patterns = [

            // Belgium / Netherlands
            /^.*?,\s*Aflevering\s*\d+:\s*/i,      // Dutch: "Aflevering" (Episode)
            /^.*?,\s*Deel\s*\d+:\s*/i,            // Dutch: "Deel" (Part)

            // Brazil
            /^.*?,\s*Episódio\s*\d+:\s*/i,        // Portuguese: "Episódio" (Episode)
            /^.*?,\s*Parte\s*\d+:\s*/i,           // Portuguese: "Parte" (Part)

            // Bulgaria
            /^.*?,\s*епизод\s*\d+:\s*/i,          // Bulgarian: "епизод" (Episode)
            /^.*?,\s*том\s*\d+:\s*/i,             // Bulgarian: "том" (Volume)
            /^.*?,\s*част\s*\d+:\s*/i,            // Bulgarian: "част" (Part)

            // Colombia / Spain
            /^.*?,\s*Episodio\s*\d+:\s*/i,        // Spanish: "Episodio" (Episode)
            /^.*?,\s*Volumen\s*\d+:\s*/i,         // Spanish: "Volumen" (Volume)

            // Denmark
            /^.*?,\s*Afsnit\s*\d+:\s*/i,          // Danish: "Afsnit" (Episode)
            /^.*?,\s*Bind\s*\d+:\s*/i,            // Danish: "Bind" (Volume)
            /^.*?,\s*Del\s*\d+:\s*/i,             // Danish: "Del" (Part)

            // Egypt / Saudi Arabia / United Arab Emirates
            /^.*?,\s*حلقة\s*\d+:\s*/i,            // Arabic: "حلقة" (Episode)
            /^.*?,\s*مجلد\s*\d+:\s*/i,            // Arabic: "مجلد" (Volume)
            /^.*?,\s*جزء\s*\d+:\s*/i,             // Arabic: "جزء" (Part)

            // Finland
            /^.*?,\s*Jakso\s*\d+:\s*/i,           // Finnish: "Jakso" (Episode)
            /^.*?,\s*Volyymi\s*\d+:\s*/i,         // Finnish: "Volyymi" (Volume)
            /^.*?,\s*Osa\s*\d+:\s*/i,             // Finnish: "Osa" (Part)

            // France
            /^.*?,\s*Épisode\s*\d+:\s*/i,         // French: "Épisode" (Episode)
            /^.*?,\s*Tome\s*\d+:\s*/i,            // French: "Tome" (Volume)
            /^.*?,\s*Partie\s*\d+:\s*/i,          // French: "Partie" (Part)

            // Indonesia
            /^.*?,\s*Episode\s*\d+:\s*/i,         // Indonesian: "Episode"
            /^.*?,\s*Bagian\s*\d+:\s*/i,          // Indonesian: "Bagian" (Part)

            // Israel
            /^.*?,\s*פרק\s*\d+:\s*/i,             // Hebrew: "פרק" (Chapter)
            /^.*?,\s*כרך\s*\d+:\s*/i,             // Hebrew: "כרך" (Volume)
            /^.*?,\s*חלק\s*\d+:\s*/i,             // Hebrew: "חלק" (Part)

            // India
            /^.*?,\s*कड़ी\s*\d+:\s*/i,             // Hindi: "कड़ी" (Episode)
            /^.*?,\s*खण्ड\s*\d+:\s*/i,            // Hindi: "खण्ड" (Volume)
            /^.*?,\s*भाग\s*\d+:\s*/i,             // Hindi: "भाग" (Part)

            // Iceland
            /^.*?,\s*Þáttur\s*\d+:\s*/i,          // Icelandic: "Þáttur" (Episode)
            /^.*?,\s*Bindi\s*\d+:\s*/i,           // Icelandic: "Bindi" (Volume)
            /^.*?,\s*Hluti\s*\d+:\s*/i,           // Icelandic: "Hluti" (Part)

            // Poland
            /^.*?,\s*Odcinek\s*\d+:\s*/i,         // Polish: "Odcinek" (Episode)
            /^.*?,\s*Tom\s*\d+:\s*/i,             // Polish: "Tom" (Volume)
            /^.*?,\s*Część\s*\d+:\s*/i,           // Polish: "Część" (Part)

            // Sweden
            /^.*?,\s*Avsnitt\s*\d+:\s*/i,         // Swedish: "Avsnitt" (Episode)
        ];

        // Additional German patterns for special cases
        const germanPatterns = [
            /^.*?,\s*Folge\s*\d+:\s*/i,           // "Folge" (Episode)
            /^.*?,\s*Band\s*\d+:\s*/i,            // "Band" (Volume)
            /^.*?\s+-\s+\d+:\s*/i,                // Title - 1: format
            /^.*?\s+\d+:\s*/i,                    // Title 1: format
            /^.*?,\s*Teil\s*\d+:\s*/i,            // "Teil" (Part)
            /^.*?,\s*Volume\s*\d+:\s*/i,          // "Volume"
            /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,    // (Unabridged/Abridged)
            /,\s*Teil\s+\d+$/i,                   // ", Teil X" at end
            /-\s*.*?(?:Reihe|Serie)\s+\d+$/i      // "- Serie X" at end
        ];

        // Unabridged/Abridged markers across all supported languages
        const abridgedPatterns = [
            /\s*\((Unabridged|Abridged)\)\s*$/i,           // English
            /\s*\((Oavkortad|Förkortad)\)\s*$/i,           // Swedish
            /\s*\((Uforkortet|Forkortet)\)\s*$/i,          // Danish/Norwegian
            /\s*\((Lyhentämätön|Lyhennetty)\)\s*$/i,       // Finnish
            /\s*\((Óstytt|Stytt)\)\s*$/i,                  // Icelandic
            /\s*\((Sin abreviar|Abreviado)\)\s*$/i,        // Spanish
            /\s*\((Intégral|Abrégé)\)\s*$/i,               // French
            /\s*\((Integrale|Ridotto)\)\s*$/i,             // Italian
            /\s*\((Vollständig|Gekürzte Fassung)\)\s*$/i,  // German alternative
            /\s*\((Pełna|Skrócona)\)\s*$/i,                // Polish
            /\s*\((Integral|Resumido)\)\s*$/i,             // Portuguese
            /\s*\((Несъкратено|Съкратено)\)\s*$/i,         // Bulgarian
            /\s*\((Kısaltılmamış|Kısaltılmış)\)\s*$/i,     // Turkish
            /\s*\((Полная версия|Сокращённая)\)\s*$/i,     // Russian
            /\s*\((كامل|مختصر)\)\s*$/i,                    // Arabic
        ];

        const allPatterns = [...patterns, ...germanPatterns, ...abridgedPatterns];

        // Clean up the title by removing all pattern matches
        allPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        if (seriesInfo) {
            if (book.seriesOrder) {
                subtitle = `${seriesName} ${book.seriesOrder}`;
            }

            // Removes series from title name, but only when the title is not
            // identical to or ending with the series name (e.g. "Två berättelser
            // om Lotta på Bråkmakargatan" should keep its full title)
            if (title.includes(seriesName) && title !== seriesName) {
                const safeSeriesName = this.escapeRegex(seriesName);

                // Case 1: Series name at end after separator — "Title - SeriesName" or "Title, SeriesName"
                const trailingRegex = new RegExp(`^(.+?)[-,]\\s*${safeSeriesName}$`, 'i');
                const trailingMatch = title.match(trailingRegex);
                if (trailingMatch) {
                    title = trailingMatch[1].trim();
                }
                // Case 2: Series name at start — "SeriesName ActualTitle"
                else if (title.startsWith(seriesName)) {
                    const remainder = title.slice(seriesName.length).replace(/^[\s,\-:]+/, '').trim();
                    if (remainder.length > 0) {
                        title = remainder;
                    }
                }
            }
        }

        // Check if there is a subtitle (separated by : or " - ")
        // Only split on "-" when surrounded by spaces to avoid splitting
        // hyphenated words like "Harry-Potter-Lexikon"
        if (title.includes(':') || title.includes(' - ')) {
            const parts = title.split(/:|(?<=\s)-(?=\s)/);
            if (parts.length > 1 && parts[0].trim().length >= 3 && parts[1].trim().length >= 3) {
                title = parts[0].trim();
                subtitle = parts.slice(1).map(p => p.trim()).join(' - ');
            }
        }

        // If title is only a number (incl. decimal like 22.1) or a generic episode/part/volume label, swap with subtitle
        if (/^(\d+[\d.]*|Episode\s*\d+|Folge\s*\d+|Band\s*\d+|Teil\s*\d+|Volume\s*\d+|Aflevering\s*\d+|Deel\s*\d+|Episódio\s*\d+|Parte\s*\d+|Episodio\s*\d+|Volumen\s*\d+|Afsnit\s*\d+|Bind\s*\d+|Del\s*\d+|Jakso\s*\d+|Volyymi\s*\d+|Osa\s*\d+|Épisode\s*\d+|Tome\s*\d+|Partie\s*\d+|Bagian\s*\d+|Avsnitt\s*\d+|Odcinek\s*\d+|Tom\s*\d+|Część\s*\d+|Þáttur\s*\d+|Bindi\s*\d+|Hluti\s*\d+|епизод\s*\d+|том\s*\d+|част\s*\d+|حلقة\s*\d+|مجلد\s*\d+|جزء\s*\d+|פרק\s*\d+|כרך\s*\d+|חלק\s*\d+|कड़ी\s*\d+|खण्ड\s*\d+|भाग\s*\d+)$/i.test(title.trim()) && subtitle) {
            title = subtitle;
            subtitle = undefined;
        }

        // Final cleanup of title
        allPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        title = title.trim();
        if (subtitle) {
            subtitle = subtitle.trim();
        }

        const genres = book.category
            ? this.splitGenre(this.ensureString(book.category.title))
            : [];

        const tags = book.tags && book.tags.length > 0
            ? book.tags.map(t => t.name)
            : undefined;

        // Use ebook-specific covers when searching for ebooks
        const cover = type === 'ebook'
            ? (book.largeCoverE || book.coverE || book.largeCover || book.cover)
            : (book.largeCover || book.cover || book.largeCoverE || book.coverE);

        const narrator = abook
            ? (abook.narrators && abook.narrators.length > 0
                ? abook.narrators.map(n => n.name).join(', ')
                : abook.narratorAsString || undefined)
            : undefined;

        const rawDescription = abook ? abook.description : ebook?.description;

        const releaseDate = abook?.releaseDateFormat || ebook?.releaseDateFormat
            || abook?.releaseDate || ebook?.releaseDate || book.releaseDate;
        const publishedYear = releaseDate ? releaseDate.substring(0, 4) : undefined;

        const metadata = {
            title: this.ensureString(title),
            subtitle: subtitle,
            author: author,
            language: this.ensureString(book.language?.isoValue || this.locale),
            genres: genres.length > 0 ? genres : undefined,
            tags: tags,
            series: seriesInfo,
            cover: this.upgradeCoverUrl(cover),
            duration: abook ? (abook.length ? Math.floor(abook.length / 60000) : undefined) : undefined,
            narrator: narrator,
            description: this.stripHtml(this.ensureString(rawDescription)),
            publisher: this.ensureString(abook ? abook.publisher?.name : ebook?.publisher?.name),
            publishedYear: publishedYear,
            isbn: this.ensureString(abook ? abook.isbn : ebook?.isbn)
        };

        // Remove undefined values
        Object.keys(metadata).forEach(key =>
            metadata[key] === undefined && delete metadata[key]
        );

        return metadata;
    }

    /**
     * Searches for books in the Storytel API
     * @param query {string} Search query
     * @param author {string} Optional author filter
     * @param locale {string} Locale for the search
     * @param type {string} Type filter: 'audiobook', 'ebook', or 'all'
     * @param limit {number} Max results (1-10, default 5)
     * @returns {Promise<{matches: *[]}>}
     */
    async fetchFromApi(formattedQuery, locale) {
        const url = `${this.baseSearchUrl}?request_locale=${encodeURIComponent(locale)}&q=${encodeURIComponent(formattedQuery)}`;

        const response = await axios.get(url, {
            timeout: AXIOS_TIMEOUT_MS,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9'
            }
        });

        return response.data;
    }

    async searchBooks(query, author = '', locale, type = 'all', limit = DEFAULT_LIMIT) {
        const cleanQuery = query.split(':')[0].trim();
        const searchQuery = author ? `${cleanQuery} ${author}` : cleanQuery;
        const formattedQuery = searchQuery.replace(/\s+/g, '+');
        const maxResults = Math.min(Math.max(limit, 1), MAX_LIMIT);

        const cacheKey = `${formattedQuery}-${locale}-${type}`;

        // Check persistent cache
        const cached = getCache.get(cacheKey);
        if (cached) {
            logger.debug({ key: cacheKey }, 'cache hit');
            return JSON.parse(cached.response);
        }

        try {
            let searchData = await this.fetchFromApi(formattedQuery, locale);
            let books = searchData?.books || [];
            logger.info({ count: books.length, query: formattedQuery }, 'search results received');

            // Retry without author if combined search found nothing
            if (books.length === 0 && author) {
                const queryOnly = cleanQuery.replace(/\s+/g, '+');
                logger.info({ query: queryOnly }, 'retrying without author');
                searchData = await this.fetchFromApi(queryOnly, locale);
                books = searchData?.books || [];
                logger.info({ count: books.length }, 'retry results received');
            }

            let matches = [];
            for (const book of books) {
                if (!book.book || !book.book.id) continue;
                const metadata = this.formatBookMetadata({ slb: book }, type);
                if (metadata) {
                    matches.push(metadata);
                }
            }

            // Sort by author relevance if author was provided, then limit
            if (author) {
                matches.sort((a, b) =>
                    this.authorMatchScore(b.author, author) - this.authorMatchScore(a.author, author)
                );
            }
            matches = matches.slice(0, maxResults);

            const result = { matches };

            // Only cache non-empty results
            if (matches.length > 0) {
                setCache.run(cacheKey, JSON.stringify(result), Date.now());
                logger.debug({ key: cacheKey }, 'cache write');
            }

            return result;
        } catch (error) {
            logger.error({ err: error.message, query: formattedQuery }, 'Storytel API request failed');
            return { matches: [] };
        }
    }

}

module.exports = StorytelProvider;