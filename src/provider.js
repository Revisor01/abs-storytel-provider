const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 600
});

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
            seriesInfo = [{
                series: this.ensureString(seriesName),
                sequence: book.seriesOrder ? this.ensureString(book.seriesOrder) : undefined
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
            if (parts[1] && parts[1].trim().length >= 3) {
                title = parts[0].trim();
                subtitle = parts[1].trim();
            }
        }

        // If title is only a number, swap with subtitle
        if (/^\d+$/.test(title.trim()) && subtitle) {
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
     * @param type {string} Type filter: 'audiobook', 'ebook', or 'all'
     * @param limit {number} Max results (1-10, default 5)
     * @returns {Promise<{matches: *[]}>}
     */
    async searchBooks(query, author = '', locale, type = 'all', limit = 5) {
        const cleanQuery = query.split(':')[0].trim();
        const formattedQuery = cleanQuery.replace(/\s+/g, '+');
        const maxResults = Math.min(Math.max(limit, 1), 10);

        const cacheKey = `${formattedQuery}-${author}-${locale}-${type}`;

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

            const books = searchResponse.data.books;
            console.log(`Found ${books.length} books in search results`);

            const matches = [];
            for (const book of books) {
                if (matches.length >= maxResults) break;
                if (!book.book || !book.book.id) continue;
                const metadata = this.formatBookMetadata({ slb: book }, type);
                if (metadata) {
                    matches.push(metadata);
                }
            }

            const result = { matches };
            cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error searching books:', error.message);
            return { matches: [] };
        }
    }

}

module.exports = StorytelProvider;