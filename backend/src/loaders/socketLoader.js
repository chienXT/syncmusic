const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const socketHandler = require('../socket/socketHandler');

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  if (process.env.REDIS_URL) {
    const pubClient = createClient({ url: process.env.REDIS_URL });
    const subClient = pubClient.duplicate();
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
      })
      .catch((error) => {
        console.error('Redis adapter connection failed:', error);
      });
  }

  socketHandler.socketAuthentication(io);

  io.on('connection', (socket) => {
    socketHandler.handleConnection(io, socket);
  });

  return io;
};

module.exports = { initializeSocket };
