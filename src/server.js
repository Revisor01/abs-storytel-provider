// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { StorytelProvider, StorytelApiError } = require('./provider');

const app = express();
const port = process.env.PORT || 3000;
const auth = process.env.AUTH;

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : null;  // null = kein Wildcard-Default mehr, nur explizit erlaubte Origins

app.use(cors({
    origin: (origin, callback) => {
        // Erlaubt: kein Origin-Header (same-origin, curl, ABS-intern)
        if (!origin) return callback(null, true);
        // Erlaubt: wenn ALLOWED_ORIGINS gesetzt und Origin enthalten
        if (allowedOrigins && allowedOrigins.includes(origin)) return callback(null, true);
        // Abgelehnt: wenn ALLOWED_ORIGINS gesetzt aber Origin nicht enthalten
        if (allowedOrigins) return callback(new Error(`Origin ${origin} not allowed`), false);
        // Kein ALLOWED_ORIGINS gesetzt: alle Origins erlauben (Entwicklungsmodus)
        return callback(null, true);
    },
    credentials: true
}));

const provider = new StorytelProvider();

const checkAuth = (req, res, next) => {
    if (!auth) return next();  // Kein Auth konfiguriert — durchlassen
    const provided = req.headers.authorization || '';
    // crypto.timingSafeEqual braucht Buffer gleicher Länge
    const authBuf = Buffer.from(auth);
    const providedBuf = Buffer.alloc(authBuf.length);
    Buffer.from(provided).copy(providedBuf);
    const valid = crypto.timingSafeEqual(authBuf, providedBuf)
        && provided.length === auth.length;  // Längen-Check separat (sicherheitshalber explizit)
    if (!valid) {
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

const validateQuery = (req, res, next) => {
    const query = req.query.query || req.query.title || '';
    if (query.length > 200) {
        return res.status(400).json({ error: 'Query too long (max 200 characters)' });
    }
    // Blockiere Sonderzeichen die in API-Queries nichts zu suchen haben
    // Erlaubt: Buchstaben, Zahlen, Leerzeichen, Bindestrich, Apostroph, Punkt, Komma, Doppelpunkt, Anführungszeichen
    if (/[<>{|}\\]/.test(query)) {
        return res.status(400).json({ error: 'Query contains invalid characters' });
    }
    next();
};

// Log incoming requests for debugging
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} query=${JSON.stringify(req.query)}`);
    next();
});

// ABS sends mediaType=book for all book types — always search all
// The /audiobook/ and /book/ endpoints handle specific filtering

// Original search endpoint
app.get('/:region/search', checkAuth, validateRegion, validateQuery, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'all', limit ? parseInt(limit) : 5);
        res.json(results);
    } catch (error) {
        if (error instanceof StorytelApiError) {
            console.error('Storytel API error:', error.message);
            return res.status(503).json({ error: 'Storytel API unavailable', details: error.message });
        }
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// E-Book search endpoint
app.get('/:region/book/search', checkAuth, validateRegion, validateQuery, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'ebook', limit ? parseInt(limit) : 5);
        res.json(results);
    } catch (error) {
        if (error instanceof StorytelApiError) {
            console.error('Storytel API error:', error.message);
            return res.status(503).json({ error: 'Storytel API unavailable', details: error.message });
        }
        console.error('Book search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Audiobook search endpoint
app.get('/:region/audiobook/search', checkAuth, validateRegion, validateQuery, async (req, res) => {
    const { query = '', title = '', author = '', limit } = req.query;
    const searchQuery = query || title;
    const region = req.params.region;

    if (!searchQuery) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(searchQuery, author, region, 'audiobook', limit ? parseInt(limit) : 5);

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
        if (error instanceof StorytelApiError) {
            console.error('Storytel API error:', error.message);
            return res.status(503).json({ error: 'Storytel API unavailable', details: error.message });
        }
        console.error('Audiobook search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Storytel provider listening on port ${port}`);
});