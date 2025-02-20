const express = require('express');
const cors = require('cors');
const StorytelProvider = require('./provider');

const app = express();
const port = process.env.PORT || 3000;
const auth = process.env.AUTH;

app.use(cors());

const provider = new StorytelProvider();

app.get('/:region/search/', async (req, res) => {
    if (auth !== undefined && (!req.headers.authorization || req.headers.authorization !== auth)) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Request received from IP:', req.ip, req.headers, 'for query:', req.query.query);

    try {
        const query = req.query.query;
        const author = req.query.author;
        const region = req.params.region;

        if (!query) {
            return res.status(400).json({ error: 'Query parameter is required' });
        }

        const results = await provider.searchBooks(query, author, region);
        console.log(`Sending ${results.matches.length} matches back to client`); // Added log
        res.json(results);
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`Storytel provider listening on port ${port}`);
});