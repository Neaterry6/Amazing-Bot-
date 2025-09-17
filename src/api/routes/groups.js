const express = require('express');
const router = express.Router();
const { param, body, validationResult } = require('express-validator');
const groupHandler = require('../../handlers/groupHandler');
const logger = require('../../utils/logger');
const { authMiddleware } = require('../../middleware/auth');

// Get all groups bot is in
router.get('/', authMiddleware, async (req, res) => {
    try {
        const groups = await groupHandler.getAllGroups();
        res.json({ success: true, groups });
    } catch (error) {
        logger.error('Error fetching groups:', error);
        res.status(500).json({ error: 'Failed to fetch groups' });
    }
});

// Get specific group info
router.get('/:groupId', authMiddleware, [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const groupInfo = await groupHandler.getGroupInfo(groupId);
        
        if (!groupInfo) {
            return res.status(404).json({ error: 'Group not found' });
        }

        res.json({ success: true, group: groupInfo });
    } catch (error) {
        logger.error('Error fetching group info:', error);
        res.status(500).json({ error: 'Failed to fetch group info' });
    }
});

// Get group participants
router.get('/:groupId/participants', authMiddleware, [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const participants = await groupHandler.getGroupParticipants(groupId);
        
        res.json({ success: true, participants });
    } catch (error) {
        logger.error('Error fetching group participants:', error);
        res.status(500).json({ error: 'Failed to fetch participants' });
    }
});

// Send message to group
router.post('/:groupId/message', authMiddleware, [
    param('groupId').notEmpty().withMessage('Group ID is required'),
    body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const { message } = req.body;
        
        const result = await groupHandler.sendGroupMessage(groupId, message);
        res.json({ success: true, messageId: result.messageId });
    } catch (error) {
        logger.error('Error sending group message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Get group statistics
router.get('/:groupId/stats', authMiddleware, [
    param('groupId').notEmpty().withMessage('Group ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { groupId } = req.params;
        const stats = await groupHandler.getGroupStats(groupId);
        
        res.json({ success: true, stats });
    } catch (error) {
        logger.error('Error fetching group stats:', error);
        res.status(500).json({ error: 'Failed to fetch group stats' });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'active', service: 'groups', timestamp: new Date().toISOString() });
});

module.exports = router;