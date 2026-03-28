// server.js
const express = require('express');
const cors = require('cors');
const { StorytelProvider, getDbStatus, closeDb } = require('./provider');
const logger = require('./logger');
const { PORT, DEFAULT_LIMIT } = require('./config');

const app = express();
const port = PORT;
const auth = process.env.AUTH;

app.use(cors());

const provider = new StorytelProvider();

const checkAuth = (req, res, next) => {
    if (auth && (!req.headers.authorization || req.headers.authorization !== auth)) {
        return res.status(401).json({ error: 'Unauthorized' });
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

// Log incoming requests for debugging
app.use((req, res, next) => {
    logger.info({ method: req.method, url: req.originalUrl, query: req.query }, 'request');
    next();
});

// Health endpoint (OPS-01)
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

// ABS sends mediaType=book for all book types — always search all
// The /audiobook/ and /book/ endpoints handle specific filtering

// Original search endpoint
app.get('/:region/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'all', limit ? parseInt(limit) : DEFAULT_LIMIT);
        res.json(results);
    } catch (error) {
        logger.error({ err: error.message }, 'search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// E-Book search endpoint
app.get('/:region/book/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'ebook', limit ? parseInt(limit) : DEFAULT_LIMIT);
        res.json(results);
    } catch (error) {
        logger.error({ err: error.message }, 'book search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Audiobook search endpoint
app.get('/:region/audiobook/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'audiobook', limit ? parseInt(limit) : DEFAULT_LIMIT);

        const audiobooks = results.matches;
        const stats = {
            total: audiobooks.length,
            withNarrator: audiobooks.filter(b => b.narrator).length,
            averageDuration: audiobooks.length > 0
                ? Math.round(audiobooks.reduce((acc, b) => acc + (b.duration || 0), 0) / audiobooks.length)
                : 0
        };

        res.json({
            matches: audiobooks,
            stats
        });
    } catch (error) {
        logger.error({ err: error.message }, 'audiobook search error');
        res.status(500).json({ error: 'Internal server error' });
    }
});

const server = app.listen(port, () => {
    logger.info({ port }, 'Storytel provider listening');
});

// Graceful shutdown (OPS-02)
function shutdown(signal) {
    logger.info({ signal }, 'shutdown signal received — closing server');
    server.close(() => {
        logger.info('HTTP server closed');
        closeDb();
        logger.info('database closed — exiting');
        process.exit(0);
    });

    // Force exit after 10 seconds if server.close() hangs
    setTimeout(() => {
        logger.warn('forced exit after timeout');
        process.exit(1);
    }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));