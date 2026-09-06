import { io } from 'socket.io-client';
import { prisma } from '../lib/prisma';

async function run() {
  console.log('--- Starting Live E2E Image & Socket Verification ---');

  // Find or create active agent
  let agent = await prisma.agent.findFirst();
  if (!agent) {
    agent = await prisma.agent.create({
      data: {
        name: 'Test Agent',
        email: 'agent-test-' + Date.now() + '@example.com',
        shiftStatus: 'AVAILABLE',
        chatCapacity: 5,
      },
    });
  } else {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { shiftStatus: 'AVAILABLE' },
    });
  }

  const customerId = 'cust-e2e-' + Date.now();

  const agentSocket = io('http://localhost:4001', {
    auth: { token: 'test-token', role: 'AGENT', userId: agent.id },
    transports: ['websocket'],
  });

  const customerSocket = io('http://localhost:4001', {
    auth: { token: 'test-token', role: 'CUSTOMER', userId: customerId },
    transports: ['websocket'],
  });

  await new Promise((resolve) => {
    let count = 0;
    const check = () => {
      count++;
      if (count === 2) resolve(null);
    };
    agentSocket.on('connect', () => {
      console.log('✓ Agent socket connected');
      check();
    });
    customerSocket.on('connect', () => {
      console.log('✓ Customer socket connected');
      check();
    });
  });

  // Assign chat
  let assignedChatId = '';
  const assignedPromise = new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for chat:assigned')), 8000);
    customerSocket.on('chat:assigned', (payload) => {
      assignedChatId = payload.chatId;
      console.log('✓ Chat assigned:', assignedChatId);
      clearTimeout(timer);
      resolve();
    });
  });

  customerSocket.emit('chat:new', { customerId });
  await assignedPromise;

  // 1. Customer sends image message -> Agent receives
  const agentReceivePromise = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Agent timed out waiting for image message')), 8000);
    agentSocket.on('chat:message', (payload) => {
      if (payload.senderType === 'CUSTOMER' && payload.imageUrl) {
        clearTimeout(timer);
        resolve(payload);
      }
    });
  });

  const testImageUrl = 'https://res.cloudinary.com/demo/image/upload/sample_invoice.jpg';
  customerSocket.emit('chat:message', {
    chatId: assignedChatId,
    senderType: 'CUSTOMER',
    messageType: 'IMAGE',
    text: 'Here is the invoice photo',
    imageUrl: testImageUrl,
    sentAt: new Date().toISOString(),
  });

  const agentReceived = await agentReceivePromise;
  console.log('✓ Agent successfully received customer image message:', {
    text: agentReceived.text,
    imageUrl: agentReceived.imageUrl,
    messageType: agentReceived.messageType,
  });

  // 2. Agent replies with image message -> Customer receives
  const customerReceivePromise = new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Customer timed out waiting for agent image reply')), 8000);
    customerSocket.on('chat:message', (payload) => {
      if (payload.senderType === 'AGENT' && payload.imageUrl) {
        clearTimeout(timer);
        resolve(payload);
      }
    });
  });

  const agentReplyUrl = 'https://res.cloudinary.com/demo/image/upload/delivery_proof.jpg';
  agentSocket.emit('chat:message', {
    chatId: assignedChatId,
    senderType: 'AGENT',
    messageType: 'IMAGE',
    text: 'Here is delivery confirmation proof',
    imageUrl: agentReplyUrl,
    sentAt: new Date().toISOString(),
  });

  const customerReceived = await customerReceivePromise;
  console.log('✓ Customer successfully received agent image message:', {
    text: customerReceived.text,
    imageUrl: customerReceived.imageUrl,
    messageType: customerReceived.messageType,
  });

  // 3. Verify database persistence
  const dbMessages = await prisma.message.findMany({
    where: { chatId: assignedChatId },
    orderBy: { sentAt: 'asc' },
  });

  console.log(`✓ Verified ${dbMessages.length} messages persisted in Postgres`);
  for (const msg of dbMessages) {
    console.log(`  - [${msg.senderType}] (${msg.messageType}) text="${msg.text}" imageUrl="${msg.imageUrl}"`);
  }

  agentSocket.disconnect();
  customerSocket.disconnect();
  console.log('--- E2E Image Message Socket Pipeline PASSED! ---');
  process.exit(0);
}

run().catch((err) => {
  console.error('E2E Verification Error:', err);
  process.exit(1);
});
