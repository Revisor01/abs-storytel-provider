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
    
    setLocale(locale) {
        this.locale = locale;
    }

    ensureString(value) {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    upgradeCoverUrl(url) {
        if (!url) return undefined;
        return `https://storytel.com${url.replace('320x320', '640x640')}`;
    }

    cleanTitle(title, seriesName) {
        if (!title) return '';

        let cleanedTitle = title;
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
        ];

        for (const pattern of patterns) {
            cleanedTitle = cleanedTitle.replace(pattern, '');
        }

        if (seriesName) {
            const seriesPattern = new RegExp(`^${seriesName}[\\s,-]*\\d*:?\\s*`, 'i');
            cleanedTitle = cleanedTitle.replace(seriesPattern, '');
        }

        return cleanedTitle.trim();
    }

    cleanCategories(categories) {
        if (!categories || !Array.isArray(categories)) return [];
        return categories.filter(cat => !cat.match(/\d+\s*(bis|-)\s*\d+\s*(Jahre|Year|Age)/i));
    }

    splitGenre(genre) {
        if (!genre) return [];
        return genre.split('/').map(g => g.trim());
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

        const cleanupPatterns = {
            prefixPatterns: [
                /^.*?,\s*Folge\s*\d+:\s*/i,
                /^.*?,\s*Band\s*\d+:\s*/i,
                /^.*?\s+-\s+\d+:\s*/i,
                /^.*?\s+\d+:\s*/i,
                /^.*?,\s*Teil\s*\d+:\s*/i,
                /^.*?,\s*Volume\s*\d+:\s*/i
            ],
            suffixPatterns: [
                /\s*\((Ungekürzt|Gekürzt)\)\s*$/i,
                /,\s*Teil\s+\d+$/i,
                /-\s*.*?(?:Reihe|Serie)\s+\d+$/i
            ]
        };

        cleanupPatterns.prefixPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });
        cleanupPatterns.suffixPatterns.forEach(pattern => {
            title = title.replace(pattern, '');
        });

        if (seriesInfo) {
            subtitle = `${seriesName}, ${book.seriesOrder}`;

            if (title.includes(seriesName)) {
                const beforeSeriesMatch = title.match(new RegExp(`^(.+?)[-,]\\s*${seriesName}`));
                if (beforeSeriesMatch) {
                    title = beforeSeriesMatch[1].trim();
                }
            }

            cleanupPatterns.prefixPatterns.forEach(pattern => {
                title = title.replace(pattern, '');
            });
            cleanupPatterns.suffixPatterns.forEach(pattern => {
                title = title.replace(pattern, '');
            });
        }
        else if (title.includes(':')) {
            const parts = title.split(':');
            title = parts[0].trim();
            subtitle = parts[1].trim();
        }

        title = title.trim();
        if (subtitle) {
            subtitle = subtitle.trim();
        }

        const genres = book.category
            ? this.splitGenre(this.ensureString(book.category.title))
            : [];

        const tags = [...genres];

        const metadata = {
            title: this.ensureString(title),
            subtitle: subtitle,
            author: author,
            language: this.ensureString(book.language?.isoValue || this.locale),
            genres: genres.length > 0 ? genres : undefined,
            tags: tags.length > 0 ? tags : undefined,
            series: seriesInfo,
            cover: this.upgradeCoverUrl(book.largeCover)
        };

        if (abook) {
            metadata.duration = abook.length ? Math.floor(abook.length / 60000) : undefined;
            metadata.narrator = abook.narratorAsString || undefined;
            metadata.description = this.ensureString(abook.description);
            metadata.publisher = this.ensureString(abook.publisher?.name);
            metadata.publishedYear = abook.releaseDateFormat?.substring(0, 4);
            metadata.isbn = this.ensureString(abook.isbn);
        }
        else if (ebook) {
            metadata.description = this.ensureString(ebook.description);
            metadata.publisher = this.ensureString(ebook.publisher?.name);
            metadata.publishedYear = ebook.releaseDateFormat?.substring(0, 4);
            metadata.isbn = this.ensureString(ebook.isbn);
        }

        Object.keys(metadata).forEach(key =>
            metadata[key] === undefined && delete metadata[key]
        );

        return metadata;
    }

    async searchBooks(query, author = '') {
        const cleanQuery = query.split(':')[0].trim();
        const formattedQuery = cleanQuery.replace(/\s+/g, '+');

        const cacheKey = `${formattedQuery}-${author}-${this.locale}`;

        console.log(`Original query: "${query}"`);
        console.log(`Cleaned query: "${cleanQuery}"`);

        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            return cachedResult;
        }

        try {
            console.log(`Searching for: "${cleanQuery}" by "${author}" in locale: ${this.locale}`);

            const searchResponse = await axios.get(this.baseSearchUrl, {
                params: {
                    request_locale: this.locale,
                    q: formattedQuery
                },
                headers: {
                    'User-Agent': 'Storytel'
                }
            });

            if (!searchResponse.data || !searchResponse.data.books) {
                console.log('No books found');
                return { matches: [] };
            }

            const books = searchResponse.data.books;
            console.log(`Found ${books.length} books in search results`);

            const matches = await Promise.all(books.map(async book => {
                if (!book.book || !book.book.id) return null;
                const bookDetails = await this.getBookDetails(book.book.id);
                if (!bookDetails) return null;

                return this.formatBookMetadata(bookDetails);
            }));

            const validMatches = matches.filter(match => match !== null);
            console.log(`Processed ${validMatches.length} valid matches`);

            const result = { matches: validMatches };
            cache.set(cacheKey, result);
            return result;
        } catch (error) {
            console.error('Error searching books:', error.message);
            return { matches: [] };
        }
    }

    async getBookDetails(bookId) {
        try {
            const response = await axios.get(this.baseBookUrl, {
                params: {
                    bookId: bookId,
                    request_locale: this.locale
                },
                headers: {
                    'User-Agent': 'Storytel'
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