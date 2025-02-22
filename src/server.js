// server.js
const express = require('express');
const cors = require('cors');
const StorytelProvider = require('./provider');

const app = express();
const port = process.env.PORT || 3000;
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

// Original search endpoint
app.get('/:region/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', author = '' } = req.query;
    const region = req.params.region;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(query, author, region);
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// E-Book search endpoint
app.get('/:region/book/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', author = '' } = req.query;
    const region = req.params.region;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(query, author, region);
        const ebooks = results.matches.filter(book => 
            book && !book.duration // Filter für E-Books (keine duration = E-Book)
        );

        res.json({
            matches: ebooks
        });
    } catch (error) {
        console.error('Book search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Audiobook search endpoint
app.get('/:region/audiobook/search', checkAuth, validateRegion, async (req, res) => {
    const { query = '', author = '' } = req.query;
    const region = req.params.region;

    if (!query) {
        return res.status(400).json({ error: 'Query parameter is required' });
    }

    try {
        const results = await provider.searchBooks(query, author, region);
        const audiobooks = results.matches.filter(book => 
            book && book.duration !== undefined
        );

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
        console.error('Audiobook search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Storytel provider listening on port ${port}`);
});