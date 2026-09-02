import { Router } from 'express';
import {
  loginAgentHandler,
  loginManagerHandler,
  createCustomerSessionHandler,
  getProfileHandler,
  listAgentsHandler,
} from '../controllers/auth.controller';
import { authenticateHttp } from '../middlewares/auth.middleware';

const router = Router();

router.post('/agent/login', loginAgentHandler);
router.post('/manager/login', loginManagerHandler);
router.post('/customer/session', createCustomerSessionHandler);
router.get('/agents', listAgentsHandler);
router.get('/me', authenticateHttp, getProfileHandler);

export default router;
