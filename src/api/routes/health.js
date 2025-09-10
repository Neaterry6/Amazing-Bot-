const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    res.json({
        status: 'healthy',
        uptime: Math.floor(uptime),
        memory: {
            used: Math.floor(memoryUsage.heapUsed / 1024 / 1024),
            total: Math.floor(memoryUsage.heapTotal / 1024 / 1024)
        },
        timestamp: new Date().toISOString(),
        service: 'WhatsApp Bot API'
    });
});

router.get('/ping', (req, res) => {
    res.json({ 
        status: 'ok', 
        message: 'pong',
        timestamp: Date.now()
    });
});

module.exports = router;