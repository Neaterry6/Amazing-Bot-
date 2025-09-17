const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const messageHandler = require('../../handlers/messageHandler');
const logger = require('../../utils/logger');
const { authMiddleware } = require('../../middleware/auth');

// Get recent messages (with pagination)
router.get('/', authMiddleware, [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const limit = parseInt(req.query.limit) || 50;
        const offset = parseInt(req.query.offset) || 0;
        
        const messages = await messageHandler.getRecentMessages(limit, offset);
        res.json({ success: true, messages, pagination: { limit, offset } });
    } catch (error) {
        logger.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Send a message
router.post('/send', authMiddleware, [
    body('to').notEmpty().withMessage('Recipient is required'),
    body('message').notEmpty().withMessage('Message content is required'),
    body('type').optional().isIn(['text', 'image', 'video', 'audio', 'document']).withMessage('Invalid message type')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { to, message, type = 'text', options = {} } = req.body;
        
        const result = await messageHandler.sendMessage(to, message, type, options);
        res.json({ success: true, messageId: result.messageId });
    } catch (error) {
        logger.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get message statistics
router.get('/stats', authMiddleware, async (req, res) => {
    try {
        const stats = await messageHandler.getMessageStats();
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching message stats:', error);
        res.status(500).json({ error: 'Failed to fetch message stats' });
    }
});

// Search messages
router.get('/search', authMiddleware, [
    query('q').notEmpty().withMessage('Search query is required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { q: query, limit = 20 } = req.query;
        const results = await messageHandler.searchMessages(query, limit);
        
        res.json({ success: true, results, query });
    } catch (error) {
        logger.error('Error searching messages:', error);
        res.status(500).json({ error: 'Failed to search messages' });
    }
});

// Delete a message
router.delete('/:messageId', authMiddleware, async (req, res) => {
    try {
        const { messageId } = req.params;
        const result = await messageHandler.deleteMessage(messageId);
        
        if (result) {
            res.json({ success: true, message: 'Message deleted successfully' });
        } else {
            res.status(404).json({ error: 'Message not found' });
        }
    } catch (error) {
        logger.error('Error deleting message:', error);
        res.status(500).json({ error: 'Failed to delete message' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'messages', timestamp: new Date().toISOString() });
});

module.exports = router;