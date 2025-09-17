const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const logger = require('../../utils/logger');
const { authMiddleware } = require('../../middleware/auth');
const config = require('../../config');

// Mock settings service - in production, this would connect to your settings database
const settingsService = {
    async getSettings() {
        return {
            botName: config.botName || 'Ilom Bot',
            prefix: config.prefix || '.',
            publicMode: config.publicMode || false,
            timezone: config.timezone || 'UTC',
            autoRead: config.autoRead || false,
            antiSpam: config.antiSpam || true,
            welcomeMessage: config.welcomeMessage || true,
            adminNumbers: config.ownerNumbers || []
        };
    },
    
    async updateSetting(key, value) {
        // Mock implementation - in production, save to database
        logger.info(`Setting updated: ${key} = ${value}`);
        return { success: true, key, value };
    },
    
    async resetSettings() {
        logger.info('Settings reset to defaults');
        return { success: true, message: 'Settings reset to defaults' };
    }
};

// Get all settings
router.get('/', authMiddleware, async (req, res) => {
    try {
        const settings = await settingsService.getSettings();
        res.json({ success: true, settings });
    } catch (error) {
        logger.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update a setting
router.patch('/:key', authMiddleware, [
    body('value').exists().withMessage('Value is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { key } = req.params;
        const { value } = req.body;
        
        // Validate setting key
        const validKeys = ['botName', 'prefix', 'publicMode', 'timezone', 'autoRead', 'antiSpam', 'welcomeMessage'];
        if (!validKeys.includes(key)) {
            return res.status(400).json({ error: 'Invalid setting key' });
        }
        
        const result = await settingsService.updateSetting(key, value);
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Bulk update settings
router.put('/', authMiddleware, [
    body('settings').isObject().withMessage('Settings object is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { settings } = req.body;
        const results = [];
        
        for (const [key, value] of Object.entries(settings)) {
            const result = await settingsService.updateSetting(key, value);
            results.push(result);
        }
        
        res.json({ success: true, results });
    } catch (error) {
        logger.error('Error bulk updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Reset settings to defaults
router.post('/reset', authMiddleware, async (req, res) => {
    try {
        const result = await settingsService.resetSettings();
        res.json({ success: true, result });
    } catch (error) {
        logger.error('Error resetting settings:', error);
        res.status(500).json({ error: 'Failed to reset settings' });
    }
});

// Get bot configuration info
router.get('/info', async (req, res) => {
    try {
        const info = {
            botName: config.botName,
            version: config.version || '1.0.0',
            uptime: process.uptime(),
            nodeVersion: process.version,
            platform: process.platform,
            environment: config.nodeEnv || 'development'
        };
        
        res.json({ success: true, info });
    } catch (error) {
        logger.error('Error fetching bot info:', error);
        res.status(500).json({ error: 'Failed to fetch bot info' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'settings', timestamp: new Date().toISOString() });
});

module.exports = router;