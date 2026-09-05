import { Router } from 'express';
import {
  getMyActiveChatsHandler,
  getChatHandler,
  getWaitingQueueHandler,
} from '../controllers/chat.controller';
import { authenticateHttp } from '../middlewares/auth.middleware';

const router = Router();

router.get('/my-active', authenticateHttp, getMyActiveChatsHandler);
router.get('/queue', authenticateHttp, getWaitingQueueHandler);
router.get('/:chatId', authenticateHttp, getChatHandler);

export default router;
