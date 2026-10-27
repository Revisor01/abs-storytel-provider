const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { StorytelProvider, StorytelApiError, getDbStatus, closeDb } = require('./provider');
const logger = require('./logger');
const { PORT, DEFAULT_LIMIT, AXIOS_TIMEOUT_MS } = require('./config');

const app = express();
const port = PORT;
const auth = process.env.AUTH;

const allowedOrigins = process.env.ALLOWED_ORIGINS;
if (allowedOrigins) {
    const origins = allowedOrigins.split(',').map(o => o.trim());
    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || origins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        }
    }));
} else {
    app.use(cors());
}

const provider = new StorytelProvider();

const checkAuth = (req, res, next) => {
    if (auth) {
        const token = req.headers.authorization || '';
        if (token.length !== auth.length) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const a = Buffer.from(token);
        const b = Buffer.from(auth);
        if (!crypto.timingSafeEqual(a, b)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }
    next();
};

const validateRegion = (req, res, next) => {
    const region = req.params.region;
    if (!region) {
        return res.status(400).json({ error: 'Region parameter is required' });
    }
    next();
};

const validateQuery = (req, res, next) => {
    // Express parses repeated params (?query=a&query=b) into arrays — reject non-strings
    for (const key of ['query', 'title', 'author', 'limit', 'isbn']) {
        if (req.query[key] !== undefined && typeof req.query[key] !== 'string') {
            return res.status(400).json({ error: `Parameter '${key}' must be a single string value` });
        }
    }
    const queryParam = typeof req.query.query === 'string' ? req.query.query : '';
    const titleParam = typeof req.query.title === 'string' ? req.query.title : '';
    const query = queryParam || titleParam;
    if (query.length > 200) {
        return res.status(400).json({ error: 'Query too long (max 200 characters)' });
    }
    if (/[<>{|}\\]/.test(query)) {
        return res.status(400).json({ error: 'Query contains invalid characters' });
    }
    if (typeof req.query.limit === 'string' && !/^\d{1,3}$/.test(req.query.limit)) {
        return res.status(400).json({ error: "Parameter 'limit' must be a positive integer" });
    }
    next();
};

app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.originalUrl, query: req.query }, 'request');
    next();
});

app.get('/health', (req, res) => {
    const cacheStatus = getDbStatus();
    res.json({
        status: 'ok',
        uptime: Math.floor(process.uptime()),
        cache: {
            available: cacheStatus.available,
            size: cacheStatus.size
        }
    });
});

// ABS sends mediaType=book for every book type, so the route path decides the filter
const searchHandler = (type, transform = results => results) => async (req, res) => {
    const { query = '', title = '', author = '', limit, isbn = '' } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
    // Malformed ISBNs are ignored rather than rejected — the ISBN only improves ranking
    const strippedIsbn = typeof isbn === 'string' ? isbn.replace(/[\s-]/g, '').toUpperCase() : '';
    const normalizedIsbn = /^(\d{9}[\dX]|\d{13})$/.test(strippedIsbn) ? strippedIsbn : '';

    try {
        const results = await provider.searchBooks(searchQuery, author, region, type, parsedLimit, normalizedIsbn);
        res.json(transform(results));
    } catch (error) {
        if (error instanceof StorytelApiError) {
            logger.warn({ err: error.message, type }, 'storytel API unavailable');
            res.status(503).json({ error: 'Storytel API unavailable', details: error.message });
        } else {
            logger.error({ err: error.message, stack: error.stack, type }, 'search error');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};

const withAudiobookStats = results => {
    const audiobooks = results.matches;
    return {
        matches: audiobooks,
        stats: {
            total: audiobooks.length,
            withNarrator: audiobooks.filter(b => b.narrator).length,
            averageDuration: audiobooks.length > 0
                ? Math.round(audiobooks.reduce((acc, b) => acc + (b.duration || 0), 0) / audiobooks.length)
                : 0
        }
    };
};

app.get('/:region/search', checkAuth, validateRegion, validateQuery, searchHandler('all'));

app.get('/:region/book/search', checkAuth, validateRegion, validateQuery, searchHandler('ebook'));

app.get('/:region/audiobook/search', checkAuth, validateRegion, validateQuery, searchHandler('audiobook', withAudiobookStats));

const server = app.listen(port, () => {
    logger.info({ port, axiosTimeoutMs: AXIOS_TIMEOUT_MS }, 'Storytel provider listening');
});

function shutdown(signal) {
    logger.info({ signal }, 'shutdown signal received — closing server');
    server.close(() => {
        logger.info('HTTP server closed');
        closeDb();
        logger.info('database closed — exiting');
        process.exit(0);
    });

    setTimeout(() => {
        logger.warn('forced exit after timeout');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
