const axios = require('axios');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');
const { AXIOS_TIMEOUT_MS, DEFAULT_LIMIT, MAX_LIMIT, CACHE_DB_PATH, CACHE_EVICTION_DAYS } = require('./config');

const dbPath = CACHE_DB_PATH;
let db = null;
let getCache = null;
let setCache = null;

// Bump when the cached response shape changes; entries with another prefix are dropped on startup
const CACHE_KEY_PREFIX = 'v2:';

// Concurrent identical searches share one Storytel request
const inFlight = new Map();

// Thrown when the Storytel API is unreachable or answers with an error — mapped to HTTP 503
class StorytelApiError extends Error {
    constructor(message, cause) {
        super(message);
        this.name = 'StorytelApiError';
        this.cause = cause;
    }
}

// Fallback for Storytel category IDs that return empty `title` across all locales (see GitHub #12)
const CATEGORY_ID_FALLBACK = {
    22: 'True Crime',
};

try {
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
    }
    db = new Database(dbPath);
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
    db.prepare('DELETE FROM search_cache WHERE cache_key NOT LIKE ?').run(`${CACHE_KEY_PREFIX}%`);

    const evictionThreshold = Date.now() - CACHE_EVICTION_DAYS * 24 * 60 * 60 * 1000;
    const evicted = db.prepare('DELETE FROM search_cache WHERE created_at < ?').run(evictionThreshold);
    if (evicted.changes > 0) {
        db.exec('VACUUM');
    }
    logger.info({ evictedRows: evicted.changes, thresholdDays: CACHE_EVICTION_DAYS }, 'cache eviction complete');

    // Entries older than CACHE_EVICTION_DAYS are ignored on read too, so long-running containers don't serve stale data
    getCache = db.prepare('SELECT response FROM search_cache WHERE cache_key = ? AND created_at >= ?');
    setCache = db.prepare('INSERT OR REPLACE INTO search_cache (cache_key, response, created_at) VALUES (?, ?, ?)');
} catch (err) {
    logger.error({ err: err.message, path: dbPath }, 'SQLite cache init failed — running without cache');
    db = null;
    getCache = null;
    setCache = null;
}

// Every pattern is ^.*? plus a fixed literal, so replace() cannot backtrack catastrophically
const seriesPatterns = [

    // Belgium / Netherlands
    /^.*?,\s*Aflevering\s*\d+:\s*/i,
    /^.*?,\s*Deel\s*\d+:\s*/i,

    // Brazil
    /^.*?,\s*Episódio\s*\d+:\s*/i,
    /^.*?,\s*Parte\s*\d+:\s*/i,

    // Bulgaria
    /^.*?,\s*епизод\s*\d+:\s*/i,
    /^.*?,\s*том\s*\d+:\s*/i,
    /^.*?,\s*част\s*\d+:\s*/i,

    // Colombia / Spain
    /^.*?,\s*Episodio\s*\d+:\s*/i,
    /^.*?,\s*Volumen\s*\d+:\s*/i,

    // Denmark
    /^.*?,\s*Afsnit\s*\d+:\s*/i,
    /^.*?,\s*Bind\s*\d+:\s*/i,
    /^.*?,\s*Del\s*\d+:\s*/i,

    // Egypt / Saudi Arabia / United Arab Emirates
    /^.*?,\s*حلقة\s*\d+:\s*/i,
    /^.*?,\s*مجلد\s*\d+:\s*/i,
    /^.*?,\s*جزء\s*\d+:\s*/i,

    // Finland
    /^.*?,\s*Jakso\s*\d+:\s*/i,
    /^.*?,\s*Volyymi\s*\d+:\s*/i,
    /^.*?,\s*Osa\s*\d+:\s*/i,

    // France
    /^.*?,\s*Épisode\s*\d+:\s*/i,
    /^.*?,\s*Tome\s*\d+:\s*/i,
    /^.*?,\s*Partie\s*\d+:\s*/i,

    // Indonesia
    /^.*?,\s*Episode\s*\d+:\s*/i,
    /^.*?,\s*Bagian\s*\d+:\s*/i,

    // Israel
    /^.*?,\s*פרק\s*\d+:\s*/i,
    /^.*?,\s*כרך\s*\d+:\s*/i,
    /^.*?,\s*חלק\s*\d+:\s*/i,

    // India
    /^.*?,\s*कड़ी\s*\d+:\s*/i,
    /^.*?,\s*खण्ड\s*\d+:\s*/i,
    /^.*?,\s*भाग\s*\d+:\s*/i,

    // Iceland
    /^.*?,\s*Þáttur\s*\d+:\s*/i,
    /^.*?,\s*Bindi\s*\d+:\s*/i,
    /^.*?,\s*Hluti\s*\d+:\s*/i,

    // Poland
    /^.*?,\s*Odcinek\s*\d+:\s*/i,
    /^.*?,\s*Tom\s*\d+:\s*/i,
    /^.*?,\s*Część\s*\d+:\s*/i,

    // Sweden
    /^.*?,\s*Avsnitt\s*\d+:\s*/i,
];

const germanPatterns = [
    /^.*?,\s*Folge\s*\d+:\s*/i,
    /^.*?,\s*Band\s*\d+:\s*/i,
    /^.*?\s+-\s+\d+:\s*/i,
    /^.*?\s+\d+:\s*/i,
    /^.*?,\s*Teil\s*\d+:\s*/i,
    /^.*?,\s*Volume\s*\d+:\s*/i,
    /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,
    /,\s*Teil\s+\d+$/i,
    /-\s*.*?(?:Reihe|Serie)\s+\d+$/i
];

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

const TITLE_CLEANUP_PATTERNS = [...seriesPatterns, ...germanPatterns, ...abridgedPatterns];

// Each alternative is KEYWORD\s*\d+ without nested quantifiers, so matching stays linear
const GENERIC_LABEL_PATTERN = /^(\d+[\d.]*|Episode\s*\d+|Folge\s*\d+|Band\s*\d+|Teil\s*\d+|Volume\s*\d+|Aflevering\s*\d+|Deel\s*\d+|Episódio\s*\d+|Parte\s*\d+|Episodio\s*\d+|Volumen\s*\d+|Afsnit\s*\d+|Bind\s*\d+|Del\s*\d+|Jakso\s*\d+|Volyymi\s*\d+|Osa\s*\d+|Épisode\s*\d+|Tome\s*\d+|Partie\s*\d+|Bagian\s*\d+|Avsnitt\s*\d+|Odcinek\s*\d+|Tom\s*\d+|Część\s*\d+|Þáttur\s*\d+|Bindi\s*\d+|Hluti\s*\d+|епизод\s*\d+|том\s*\d+|част\s*\d+|حلقة\s*\d+|مجلد\s*\d+|جزء\s*\d+|פרק\s*\d+|כרך\s*\d+|חלק\s*\d+|कड़ी\s*\d+|खण्ड\s*\d+|भाग\s*\d+)$/i;

class StorytelProvider {
    constructor() {
        this.baseSearchUrl = 'https://www.storytel.com/api/search.action';
        this.locale = 'en';
    }

    ensureString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    upgradeCoverUrl(url) {
        if (!url) return undefined;
        // www host avoids an extra 301 redirect (storytel.com → www.storytel.com)
        return `https://www.storytel.com${url.replace(/\d{3}x\d{3}/, '1200x1200')}`;
    }

    splitGenre(genre) {
        if (!genre) return [];
        return genre.split(/[\/,]/).map(g => {
            const trimmedGenre = g.trim();
            return trimmedGenre === 'Sci-Fi' ? 'Science-Fiction' : trimmedGenre;
        });
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    stripHtml(str) {
        if (!str) return '';
        let s = String(str)
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<\/p>/gi, '\n');
        // Strip tags to a fixpoint so nested fragments like "<scr<b>ipt>" cannot survive
        let prev;
        do {
            prev = s;
            s = s.replace(/<[^>]+>/g, '');
        } while (s !== prev);
        return s
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&nbsp;/g, ' ')
            // &amp; last, otherwise "&amp;lt;" would be double-unescaped to "<"
            .replace(/&amp;/g, '&')
            .replace(/\n{3,}/g, '\n\n')
            .trim();
    }

    /** Author match score from 0 to 1. */
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

    /** Converts a Storytel hit to Audiobookshelf metadata, or null if it does not fit `type`. */
    formatBookMetadata(bookData, type = 'all') {
        const slb = bookData.slb;
        if (!slb || !slb.book) return null;

        const book = slb.book;
        let abook = slb.abook;
        let ebook = slb.ebook;

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


        TITLE_CLEANUP_PATTERNS.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        if (seriesInfo) {
            if (book.seriesOrder) {
                subtitle = `${seriesName} ${book.seriesOrder}`;
            }

            // Titles equal to or ending with the series name keep it ("Två berättelser om Lotta på Bråkmakargatan")
            if (title.includes(seriesName) && title !== seriesName) {
                const safeSeriesName = this.escapeRegex(seriesName);

                // Length guard: a very long series name would make trailingRegex backtrack O(n*m)
                if (safeSeriesName.length <= 200) {
                    const trailingRegex = new RegExp(`^(.+?)[-,]\\s*${safeSeriesName}$`, 'i');
                    const trailingMatch = title.match(trailingRegex);
                    if (trailingMatch) {
                        title = trailingMatch[1].trim();
                    }
                    else if (title.startsWith(seriesName)) {
                        const remainder = title.slice(seriesName.length).replace(/^[\s,\-:]+/, '').trim();
                        if (remainder.length > 0) {
                            title = remainder;
                        }
                    }
                } else {
                    if (title.startsWith(seriesName)) {
                        const remainder = title.slice(seriesName.length).replace(/^[\s,\-:]+/, '').trim();
                        if (remainder.length > 0) {
                            title = remainder;
                        }
                    }
                }
            }
        }

        // Split on "-" only between spaces, so "Harry-Potter-Lexikon" stays whole
        if (title.includes(':') || title.includes(' - ')) {
            const parts = title.split(/:|(?<=\s)-(?=\s)/);
            if (parts.length > 1 && parts[0].trim().length >= 3 && parts[1].trim().length >= 3) {
                title = parts[0].trim();
                subtitle = parts.slice(1).map(p => p.trim()).join(' - ');
            }
        }

        if (GENERIC_LABEL_PATTERN.test(title.trim()) && subtitle) {
            title = subtitle;
            subtitle = undefined;
        }

        TITLE_CLEANUP_PATTERNS.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        title = title.trim();
        if (subtitle) {
            subtitle = subtitle.trim();
        }

        const genres = book.category
            ? this.splitGenre(this.ensureString(book.category.title || CATEGORY_ID_FALLBACK[book.category.id]))
            : [];

        const tags = book.tags && book.tags.length > 0
            ? book.tags.map(t => t.name)
            : undefined;

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
            isbn: this.ensureString(abook ? abook.isbn : ebook?.isbn),
            abridged: book.abridged === 1 ? true : undefined
        };

        Object.keys(metadata).forEach(key =>
            (metadata[key] === undefined || metadata[key] === null) && delete metadata[key]
        );

        return metadata;
    }

    /** Raw Storytel search; throws StorytelApiError on network errors, non-2xx status or a malformed payload. */
    async fetchFromApi(formattedQuery, locale) {
        const url = `${this.baseSearchUrl}?request_locale=${encodeURIComponent(locale)}&q=${encodeURIComponent(formattedQuery)}`;

        let response;
        // Storytel occasionally answers with a transient HTTP 5xx — retry once on 5xx/network errors
        for (let attempt = 1; ; attempt++) {
            try {
                response = await axios.get(url, {
                    timeout: AXIOS_TIMEOUT_MS,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
                        'Accept': 'application/json',
                        'Accept-Language': 'en-US,en;q=0.9'
                    }
                });
                break;
            } catch (err) {
                const status = err.response?.status;
                const retryable = !status || status >= 500;
                if (retryable && attempt < 2) {
                    logger.warn({ err: err.message, status, query: formattedQuery }, 'Storytel request failed — retrying once');
                    await new Promise(resolve => setTimeout(resolve, 500));
                    continue;
                }
                throw new StorytelApiError(status ? `Storytel responded with HTTP ${status}` : err.message, err);
            }
        }

        if (!response.data || typeof response.data !== 'object' || !Array.isArray(response.data.books)) {
            throw new StorytelApiError('Storytel returned an unexpected response format');
        }

        return response.data;
    }

    /** Searches Storytel; throws StorytelApiError when Storytel is unreachable. */
    async searchBooks(query, author = '', locale, type = 'all', limit = DEFAULT_LIMIT, isbn = '') {
        const cleanQuery = query.split(':')[0].trim();
        const searchQuery = author ? `${cleanQuery} ${author}` : cleanQuery;
        const formattedQuery = searchQuery.replace(/\s+/g, '+');
        const maxResults = Math.min(Math.max(Number.isFinite(limit) ? limit : DEFAULT_LIMIT, 1), MAX_LIMIT);

        // Limit is not part of the key — the full match list is cached and sliced per request
        const cacheKey = `${CACHE_KEY_PREFIX}${formattedQuery}-${locale}-${type}${isbn ? `-isbn:${isbn}` : ''}`;

        const sliceResult = result => ({ ...result, matches: result.matches.slice(0, maxResults) });

        if (getCache) {
            try {
                const cached = getCache.get(cacheKey, Date.now() - CACHE_EVICTION_DAYS * 24 * 60 * 60 * 1000);
                if (cached) {
                    logger.debug({ key: cacheKey }, 'cache hit');
                    return sliceResult(JSON.parse(cached.response));
                }
            } catch (err) {
                logger.warn({ err: err.message, key: cacheKey }, 'cache read failed — fetching from API');
            }
        }

        if (!inFlight.has(cacheKey)) {
            const apiCallPromise = this.fetchMatches(cleanQuery, formattedQuery, author, locale, type, isbn, cacheKey)
                .finally(() => inFlight.delete(cacheKey));
            inFlight.set(cacheKey, apiCallPromise);
        } else {
            logger.debug({ key: cacheKey }, 'deduplication hit — reusing in-flight request');
        }

        return sliceResult(await inFlight.get(cacheKey));
    }

    /** Puts exact ISBN hits first; failures are ignored because the ISBN only aids ranking. */
    async prependIsbnHits(books, isbn, locale) {
        try {
            const isbnData = await this.fetchFromApi(isbn, locale);
            const isbnBooks = isbnData.books.filter(b =>
                b.abook?.isbn === isbn || b.ebook?.isbn === isbn
            );
            logger.info({ count: isbnBooks.length, isbn }, 'isbn results received');
            const seen = new Set(isbnBooks.map(b => b.book?.id));
            return [...isbnBooks, ...books.filter(b => !seen.has(b.book?.id))];
        } catch (err) {
            logger.warn({ err: err.message, isbn }, 'isbn lookup failed — using regular results');
            return books;
        }
    }

    /** Fetches, formats, ranks and caches the full, unlimited match list. */
    async fetchMatches(cleanQuery, formattedQuery, author, locale, type, isbn, cacheKey) {
        let books;
        try {
            let searchData = await this.fetchFromApi(formattedQuery, locale);
            books = searchData.books;
            logger.info({ count: books.length, query: formattedQuery }, 'search results received');

            if (books.length === 0 && author) {
                const queryOnly = cleanQuery.replace(/\s+/g, '+');
                logger.info({ query: queryOnly }, 'retrying without author');
                searchData = await this.fetchFromApi(queryOnly, locale);
                books = searchData.books;
                logger.info({ count: books.length }, 'retry results received');
            }

            if (isbn) {
                books = await this.prependIsbnHits(books, isbn, locale);
            }
        } catch (error) {
            logger.error({ err: error.message, query: formattedQuery }, 'Storytel API request failed');
            throw error;
        }

        const isbnHits = new Set();
        let matches = [];
        for (const book of books) {
            if (!book.book || !book.book.id) continue;
            const metadata = this.formatBookMetadata({ slb: book }, type);
            if (metadata) {
                if (isbn && metadata.isbn === isbn) isbnHits.add(metadata);
                matches.push(metadata);
            }
        }

        if (author) {
            const score = m => (isbnHits.has(m) ? 2 : 0) + this.authorMatchScore(m.author, author);
            matches.sort((a, b) => score(b) - score(a));
        }

        const result = { matches };

        // Empty results usually mean an outage, so they are never cached
        if (matches.length > 0 && setCache) {
            try {
                setCache.run(cacheKey, JSON.stringify(result), Date.now());
                logger.debug({ key: cacheKey }, 'cache write');
            } catch (err) {
                logger.warn({ err: err.message, key: cacheKey }, 'cache write failed');
            }
        }

        return result;
    }

}

/** Cache status for the health endpoint. */
function getDbStatus() {
    if (!db) return { available: false, size: null };
    try {
        const row = db.prepare('SELECT COUNT(*) as count FROM search_cache').get();
        return { available: true, size: row.count };
    } catch (err) {
        return { available: false, size: null };
    }
}

/** Closes the SQLite cache. */
function closeDb() {
    if (db) {
        try {
            db.close();
            db = null;
        } catch (err) {
            // best-effort close
        }
    }
}

module.exports = { StorytelProvider, StorytelApiError, getDbStatus, closeDb };