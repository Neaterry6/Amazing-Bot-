const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const commandHandler = require('../../handlers/commandHandler');
const logger = require('../../utils/logger');
const authMiddleware = require('../../middleware/auth');

// Get all available commands
router.get('/', async (req, res) => {
    try {
        const commands = await commandHandler.getAllCommands();
        res.json({
            success: true,
            commands: commands.map(cmd => ({
                name: cmd.name,
                aliases: cmd.aliases,
                description: cmd.description,
                category: cmd.category,
                usage: cmd.usage,
                cooldown: cmd.cooldown,
                premium: cmd.premium,
                adminOnly: cmd.adminOnly
            }))
        });
    } catch (error) {
        logger.error('Error fetching commands:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

// Get commands by category
router.get('/category/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const commands = await commandHandler.getCommandsByCategory(category);
        res.json({ success: true, commands });
    } catch (error) {
        logger.error('Error fetching commands by category:', error);
        res.status(500).json({ error: 'Failed to fetch commands' });
    }
});

// Get command statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await commandHandler.getCommandStats();
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching command stats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Execute command (for testing purposes)
router.post('/execute', authMiddleware, [
    body('command').notEmpty().withMessage('Command is required'),
    body('args').isArray().optional()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { command, args = [] } = req.body;
        
        // This is a test endpoint - in production, commands should only be executed via WhatsApp
        logger.info(`API command execution requested: ${command}`);
        
        res.json({
            success: true,
            message: 'Command execution request received',
            command,
            args,
            note: 'Commands are executed via WhatsApp messages, not API calls'
        });
    } catch (error) {
        logger.error('Error in command execution endpoint:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'commands', timestamp: new Date().toISOString() });
});

module.exports = router;