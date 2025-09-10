const express = require('express');
const config = require('../../config');
const router = express.Router();

router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
        bot: {
            name: config.botName,
            version: config.botVersion,
            uptime: Math.floor(uptime),
            status: 'online'
        },
        system: {
            memory: {
                used: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
                total: Math.floor(memoryUsage.heapTotal / 1024 / 1024)
            },
            platform: process.platform,
            nodeVersion: process.version
        },
        features: {
            database: config.database ? 'enabled' : 'disabled',
            redis: config.redis.enabled,
            ai: config.apis.openai.apiKey ? 'enabled' : 'disabled'
        }
    });
});

module.exports = router;