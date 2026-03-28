// logger.js
const pino = require('pino');

const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
    base: { service: 'storytel-provider' }
});

module.exports = logger;
