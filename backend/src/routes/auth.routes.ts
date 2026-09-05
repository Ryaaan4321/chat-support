import { Router } from 'express';
import {
  signupHandler,
  loginAgentHandler,
  loginManagerHandler,
  createCustomerSessionHandler,
  getProfileHandler,
  listAgentsHandler,
  updateAgentCapacityHandler,
  logoutHandler,
} from '../controllers/auth.controller';
import { authenticateHttp } from '../middlewares/auth.middleware';

const router = Router();

router.post('/signup', signupHandler);
router.post('/agent/login', loginAgentHandler);
router.post('/manager/login', loginManagerHandler);
router.post('/customer/session', createCustomerSessionHandler);
router.post('/logout', authenticateHttp, logoutHandler);
router.get('/agents', listAgentsHandler);
router.patch('/agents/:id/capacity', updateAgentCapacityHandler);
router.get('/me', authenticateHttp, getProfileHandler);

export default router;

