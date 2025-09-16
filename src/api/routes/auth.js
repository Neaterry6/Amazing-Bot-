const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../../utils/logger');
const config = require('../../config');

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    message: { error: 'Too many authentication attempts, please try again later' },
    standardHeaders: true,
    legacyHeaders: false
});

// Login endpoint
router.post('/login', authLimiter, [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { username, password } = req.body;

        // For demo purposes - in production, validate against database
        if (username === config.adminUsername && bcrypt.compareSync(password, config.adminPasswordHash)) {
            const token = jwt.sign(
                { username, role: 'admin' },
                config.jwtSecret || 'fallback-secret',
                { expiresIn: '24h' }
            );

            logger.info(`Admin login successful: ${username}`);
            res.json({
                success: true,
                token,
                user: { username, role: 'admin' }
            });
        } else {
            logger.warn(`Failed login attempt: ${username}`);
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Token validation endpoint
router.get('/validate', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret || 'fallback-secret');
        res.json({ valid: true, user: decoded });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    // In a real implementation, you might blacklist the token
    res.json({ success: true, message: 'Logged out successfully' });
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'auth', timestamp: new Date().toISOString() });
});

module.exports = router;