// config.js
module.exports = {
    PORT: parseInt(process.env.PORT || '3000', 10),
    AXIOS_TIMEOUT_MS: parseInt(process.env.AXIOS_TIMEOUT_MS || '15000', 10),
    DEFAULT_LIMIT: parseInt(process.env.DEFAULT_LIMIT || '5', 10),
    MAX_LIMIT: parseInt(process.env.MAX_LIMIT || '50', 10),
    CACHE_DB_PATH: process.env.CACHE_DB || require('path').join(__dirname, '..', 'data', 'cache.db'),
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    CACHE_EVICTION_DAYS: parseInt(process.env.CACHE_EVICTION_DAYS || '30', 10),
};
