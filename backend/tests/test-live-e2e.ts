import { io } from 'socket.io-client';

async function run() {
  const agentId = '8fd3584c-3386-4a76-a438-b6efd41e8da8';
  const customerId = 'cust-test-' + Date.now();

  const agentSocket = io('http://localhost:4001', {
    auth: { token: 'demo-token', role: 'AGENT', userId: agentId },
    transports: ['websocket', 'polling'],
  });

  const customerSocket = io('http://localhost:4001', {
    auth: { token: 'demo-token', role: 'CUSTOMER', userId: customerId },
    transports: ['websocket', 'polling'],
  });

  await new Promise((resolve) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 2) resolve(null);
    };
    agentSocket.on('connect', () => {
      console.log('AGENT_CONNECTED');
      check();
    });
    customerSocket.on('connect', () => {
      console.log('CUSTOMER_CONNECTED');
      check();
    });
  });

  agentSocket.emit('agent:status_changed', { agentId, shiftStatus: 'AVAILABLE' });
  console.log('AGENT_AVAILABLE');

  await new Promise((r) => setTimeout(r, 600));

  let assignedChatId = '';

  const assignedPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT_ASSIGNED')), 10000);
    customerSocket.on('chat:assigned', (payload) => {
      console.log('CUSTOMER_ASSIGNED:', payload.chatId, payload.agentName);
      assignedChatId = payload.chatId;
      clearTimeout(t);
      resolve(payload);
    });
  });

  customerSocket.emit('chat:new', { customerId });
  await assignedPromise;

  const agentReceivePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT_AGENT_RECEIVE')), 10000);
    agentSocket.on('chat:message', (payload) => {
      if (payload.senderType === 'CUSTOMER') {
        console.log('AGENT_RECEIVED_MSG:', payload.text);
        clearTimeout(t);
        resolve(payload);
      }
    });
  });

  customerSocket.emit('chat:message', {
    chatId: assignedChatId,
    senderType: 'CUSTOMER',
    text: 'Hello agent! Need help with my order.',
    sentAt: new Date().toISOString(),
  });

  await agentReceivePromise;

  const customerReceivePromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT_CUSTOMER_RECEIVE')), 10000);
    customerSocket.on('chat:message', (payload) => {
      if (payload.senderType === 'AGENT') {
        console.log('CUSTOMER_RECEIVED_REPLY:', payload.text);
        clearTimeout(t);
        resolve(payload);
      }
    });
  });

  agentSocket.emit('chat:message', {
    chatId: assignedChatId,
    senderType: 'AGENT',
    text: 'Hello! I am happy to help with your order.',
    sentAt: new Date().toISOString(),
  });

  await customerReceivePromise;

  const closedPromise = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('TIMEOUT_CLOSED')), 10000);
    customerSocket.on('chat:closed', (payload) => {
      console.log('CUSTOMER_CHAT_CLOSED:', payload.chatId);
      clearTimeout(t);
      resolve(payload);
    });
  });

  agentSocket.emit('chat:closed', { chatId: assignedChatId });
  await closedPromise;

  console.log('VERIFICATION_COMPLETE_SUCCESS');
  agentSocket.disconnect();
  customerSocket.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('ERROR:', err.message);
  process.exit(1);
});
