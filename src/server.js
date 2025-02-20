const express = require('express');
const cors = require('cors');
const StorytelProvider = require('./provider');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());

const provider = new StorytelProvider();

app.get('/:locale/search', async (req, res) => {
  try {
    console.log('Received search request:', req.query);
    const query = req.query.query;
    const author = req.query.author;
    const { locale } = req.params;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    provider.setLocale(locale);
    const results = await provider.searchBooks(query, author);
    console.log(`Sending ${results.matches.length} matches back to client`);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Storytel provider listening on port ${port}`);
});