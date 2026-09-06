import { Router } from 'express';
import {
  getMyActiveChatsHandler,
  getChatHandler,
  getWaitingQueueHandler,
  getAgentPerformanceChatsHandler,
  getUploadSignatureHandler,
  getCannedResponsesHandler,
} from '../controllers/chat.controller';
import { authenticateHttp } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-active', authenticateHttp, getMyActiveChatsHandler);
router.get('/queue', authenticateHttp, getWaitingQueueHandler);
router.get('/canned-responses', authenticateHttp, getCannedResponsesHandler);
router.get('/upload-signature', authenticateHttp, getUploadSignatureHandler);
router.post('/upload-signature', authenticateHttp, getUploadSignatureHandler);
router.get('/agent/:agentId/performance-chats', authenticateHttp, getAgentPerformanceChatsHandler);
router.get('/:chatId', authenticateHttp, getChatHandler);

export default router;
