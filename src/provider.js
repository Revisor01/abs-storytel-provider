const axios = require('axios');
const NodeCache = require('node-cache');

const cache = new NodeCache({
    stdTTL: 600
});

class StorytelProvider {
    constructor() {
        this.baseSearchUrl = 'https://www.storytel.com/api/search.action';
        this.baseBookUrl = 'https://www.storytel.com/api/getBookInfoForContent.action';
    }

    ensureString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

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
        return genre.split(/[\/,]/).map(g => g.trim());
    }

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
        
        const patterns = [
            /^.*?,\s*Folge\s*\d+:\s*/i,
            /^.*?,\s*Band\s*\d+:\s*/i,
            /^.*?\s+-\s+\d+:\s*/i,
            /^.*?\s+\d+:\s*/i,
            /^.*?,\s*Teil\s*\d+:\s*/i,
            /^.*?,\s*Volume\s*\d+:\s*/i,
            /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,
            /,\s*Teil\s+\d+$/i,
            /-\s*.*?(?:Reihe|Serie)\s+\d+$/i
        ]

        patterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        if (seriesInfo) {
            subtitle = `${seriesName} ${book.seriesOrder}`;

            // Removes series from title name
            if (title.includes(seriesName)) {
                const beforeSeriesMatch = title.match(new RegExp(`^(.+?)[-,]\\s*${seriesName}`));
                if (beforeSeriesMatch) {
                    title = beforeSeriesMatch[1].trim();
                }
            }
        }

        // Check if there is a subtitle now
        if (title.includes(':') || title.includes('-')) {
            const parts = title.split(/[:\-]/);
            if (parts[1] && parts[1].trim().length >= 3) {
                title = parts[0].trim();
                subtitle = parts[1].trim();
            }
        }

        // This should be redundant, but just in case
        patterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });


        title = title.trim();
        if (subtitle) {
            subtitle = subtitle.trim();
        }

        const genres = book.category
            ? this.splitGenre(this.ensureString(book.category.title))
            : [];

        // This is completely redundant, as it does not provide anything, but spam ABS
        const tags = [...genres];

        const metadata = {
            title: this.ensureString(title),
            subtitle: subtitle,
            author: author,
            language: this.ensureString(book.language?.isoValue || 'de'),
            genres: genres.length > 0 ? genres : undefined,
            tags: undefined,
            series: seriesInfo,
            cover: this.upgradeCoverUrl(book.largeCover),
            duration: abook ? (abook.length ? Math.floor(abook.length / 60000) : undefined) : undefined,
            narrator: abook ? abook.narratorAsString || undefined : undefined,
            description: this.ensureString(abook ? abook.description : ebook?.description),
            publisher: this.ensureString(abook ? abook.publisher?.name : ebook?.publisher?.name),
            publishedYear: (abook ? abook.releaseDateFormat : ebook?.releaseDateFormat)?.substring(0, 4),
            isbn: this.ensureString(abook ? abook.isbn : ebook?.isbn)
        };

        Object.keys(metadata).forEach(key =>
            metadata[key] === undefined && delete metadata[key]
        );

        return metadata;
    }

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
                console.log('No books found');
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