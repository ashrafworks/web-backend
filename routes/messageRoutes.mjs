import express from 'express';
import { checkAuth } from '../middlewares/authMiddleware.js';
import { archiveConversation, deleteConversation, getAllConversations, getMessages, getOrCreateConversation, sendMessage } from '../controllers/MessageController.js';

const router = express.Router();

// Get or create conversation
router.post('/conversation', checkAuth, getOrCreateConversation);

// Get all conversations
router.get('/conversations', checkAuth, getAllConversations);

// Get messages for a conversation
router.get('/conversation/:conversationId/messages', checkAuth, getMessages);

// Send message
router.post('/message', checkAuth, sendMessage);

// Archive conversation
router.patch('/conversation/:conversationId/archive', checkAuth, archiveConversation);

// Delete conversation
router.delete('/conversation/:conversationId', checkAuth, deleteConversation);

export default router;