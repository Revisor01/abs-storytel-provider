const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 600
});

class StorytelProvider {
    constructor() {
        this.baseSearchUrl = 'https://www.storytel.com/api/search.action';
        this.baseBookUrl = 'https://www.storytel.com/api/getBookInfoForContent.action';
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
        return `https://storytel.com${url.replace('320x320', '640x640')}`;
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
     * Formats the book metadata to the ABS format
     * @param bookData
     * @returns {{title: (string|string), subtitle: *, author: (string|string), language: (string|string), genres: (*[]|undefined), tags: undefined, series: null, cover: string, duration: (number|undefined), narrator: (*|undefined), description: (string|string), publisher: (string|string), publishedYear: string | undefined, isbn: (string|string)}|null}
     */
    formatBookMetadata(bookData) {
        const slb = bookData.slb;
        if (!slb || !slb.book) return null;

        const book = slb.book;
        const abook = slb.abook;
        const ebook = slb.ebook;

        if (!abook && !ebook) return null;

        let seriesInfo = null;
        let seriesName = null;
        if (book.series && book.series.length > 0 && book.seriesOrder) {
            seriesName = book.series[0].name;
            seriesInfo = [{
                series: this.ensureString(seriesName),
                sequence: this.ensureString(book.seriesOrder)
            }];
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

        const allPatterns = [...patterns, ...germanPatterns];

        // Clean up the title by removing all pattern matches
        allPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        if (seriesInfo) {
            subtitle = `${seriesName} ${book.seriesOrder}`;

            // Removes series from title name
            if (title.includes(seriesName)) {
                const safeSeriesName = this.escapeRegex(seriesName);
                const regex = new RegExp(`^(.+?)[-,]\\s*${safeSeriesName}`, 'i');

                const beforeSeriesMatch = title.match(regex);
                if (beforeSeriesMatch) {
                    title = beforeSeriesMatch[1].trim();
                }

                title = title.replace(seriesName, '');
            }
        }

        // Check if there is a subtitle (separated by : or -)
        if (title.includes(':') || title.includes('-')) {
            const parts = title.split(/[:\-]/);
            if (parts[1] && parts[1].trim().length >= 3) {
                title = parts[0].trim();
                subtitle = parts[1].trim();
            }
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

        const metadata = {
            title: this.ensureString(title),
            subtitle: subtitle,
            author: author,
            language: this.ensureString(book.language?.isoValue || this.locale),
            genres: genres.length > 0 ? genres : undefined,
            series: seriesInfo,
            cover: this.upgradeCoverUrl(book.largeCover),
            duration: abook ? (abook.length ? Math.floor(abook.length / 60000) : undefined) : undefined,
            narrator: abook ? abook.narratorAsString || undefined : undefined,
            description: this.ensureString(abook ? abook.description : ebook?.description),
            publisher: this.ensureString(abook ? abook.publisher?.name : ebook?.publisher?.name),
            publishedYear: (abook ? abook.releaseDateFormat : ebook?.releaseDateFormat)?.substring(0, 4),
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
     * @returns {Promise<{matches: *[]}>}
     */
    async searchBooks(query, author = '', locale) {
        const cleanQuery = query.split(':')[0].trim();
        const formattedQuery = cleanQuery.replace(/\s+/g, '+');

        const cacheKey = `${formattedQuery}-${author}-${locale}`;

        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            const searchResponse = await axios.get(this.baseSearchUrl, {
                params: {
                    request_locale: locale,
                    q: formattedQuery
                },
                headers: {
                    'User-Agent': 'Storytel ABS-Scraper'
                }
            });

            if (!searchResponse.data || !searchResponse.data.books) {
                return { matches: [] };
            }

            const books = searchResponse.data.books.slice(0, 5);
            console.log(`Found ${books.length} books in search results`);

            const matches = await Promise.all(books.map(async book => {
                if (!book.book || !book.book.id) return null;
                const bookDetails = await this.getBookDetails(book.book.id, locale);
                if (!bookDetails) return null;

                return this.formatBookMetadata(bookDetails);
            }));

            const validMatches = matches.filter(match => match !== null);

            const result = { matches: validMatches };
            cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error searching books:', error.message);
            return { matches: [] };
        }
    }
    
    /**
    * Gets detailed book information from Storytel API
    * @param bookId {string|number} The book ID to fetch details for
    * @param locale {string} Locale for the request
    * @returns {Promise<*>}
    */
    async getBookDetails(bookId, locale) {
        try {
            const response = await axios.get(this.baseBookUrl, {
                params: {
                    bookId: bookId,
                    request_locale: locale
                },
                headers: {
                    'User-Agent': 'Storytel ABS-Scraper'
                }
            });
            
            return response.data;
        } catch (error) {
            console.error(`Error fetching book details for ID ${bookId}:`, error.message);
            return null;
        }
    }
}

module.exports = StorytelProvider;