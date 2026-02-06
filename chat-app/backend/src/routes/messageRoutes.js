import express from 'express';
import { getConversation, sendMessage } from '../controllers/messageController.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', auth, sendMessage);
router.get('/:userId', auth, getConversation);

export default router;
