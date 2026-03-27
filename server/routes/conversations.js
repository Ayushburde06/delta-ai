const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Chat = require('../models/Chat');
const { protect } = require('../middleware/authMiddleware');

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Conversation route works!' });
});

// GET all conversations used for Sidebar history
router.get('/', protect, async (req, res) => {
    try {
        const conversations = await Conversation.find({ userId: req.user._id }).sort({ updatedAt: -1 });
        res.json(conversations);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST create a new conversation
router.post('/', protect, async (req, res) => {
    const conversation = new Conversation({
        userId: req.user._id,
        title: req.body.title || "New Chat",
    });
    try {
        const newConversation = await conversation.save();
        res.status(201).json(newConversation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// GET messages for a specific conversation
router.get('/:id/messages', protect, async (req, res) => {
    try {
        // Option to verify if conversation belongs to user:
        const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
        if (!conversation) {
            return res.status(404).json({ message: 'Conversation not found' });
        }
        const messages = await Chat.find({ conversationId: req.params.id }).sort({ createdAt: 1 });
        res.json(messages);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PATCH update title
router.patch('/:id', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
        if (!conversation) return res.status(404).json({ message: 'Not found' });
        if (req.body.title) {
            conversation.title = req.body.title;
        }
        const updatedConversation = await conversation.save();
        res.json(updatedConversation);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a conversation
router.delete('/:id', protect, async (req, res) => {
    try {
        const conversation = await Conversation.findOne({ _id: req.params.id, userId: req.user._id });
        if (!conversation) return res.status(404).json({ message: 'Not found' });

        await Conversation.findByIdAndDelete(req.params.id);
        await Chat.deleteMany({ conversationId: req.params.id });
        res.json({ message: 'Conversation deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
