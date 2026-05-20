import express from 'express';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { performances, randomEvents } from './mockData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '..', 'dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173', 'http://localhost:5174'],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4000;

app.use(express.json());

app.get('/api/performances', (_req, res) => {
  res.json(performances);
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDistPath));
}

const buildSeats = () => {
  const sections = ['DIAMOND', 'STANDING', 'SEATED', 'BALCONY'];
  return sections.flatMap((section) =>
    Array.from({ length: 36 }, (_, index) => ({
      id: `${section}-${index + 1}`,
      section,
      number: index + 1,
      status: Math.random() < 0.12 ? 'taken' : 'available',
      price: section === 'DIAMOND' ? 198000 : section === 'BALCONY' ? 132000 : 165000
    }))
  );
};

const rooms = new Map();

const getRoom = (performanceId) => {
  if (!rooms.has(performanceId)) {
    rooms.set(performanceId, {
      seats: buildSeats(),
      queueBase: Math.floor(Math.random() * 900) + 1100
    });
  }

  return rooms.get(performanceId);
};

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const reactionTier = (reactionMs = 900) => {
  if (reactionMs <= 90) return 'perfect';
  if (reactionMs <= 250) return 'fast';
  if (reactionMs <= 650) return 'normal';
  return 'late';
};

const queuePenaltyByTier = {
  perfect: 120,
  fast: 520,
  normal: 1100,
  late: 1900
};

const pressureByTier = {
  perfect: 0.03,
  fast: 0.08,
  normal: 0.16,
  late: 0.27
};

const forceEntryByTier = {
  perfect: 7000,
  fast: 10500,
  normal: 15500,
  late: 21000
};

const applySeatPressure = (room, tier) => {
  const pressure = pressureByTier[tier] ?? 0.14;
  room.seats.forEach((seat) => {
    if (seat.status === 'available' && Math.random() < pressure) {
      seat.status = 'taken';
    }
  });
};

io.on('connection', (socket) => {
  socket.on('join-performance', ({ performanceId, phase = 'queue', reactionMs = 900 }) => {
    const roomName = `performance:${performanceId}`;
    const room = getRoom(performanceId);
    const tier = reactionTier(reactionMs);

    socket.join(roomName);
    socket.data.performanceId = performanceId;
    socket.data.phase = phase;
    socket.data.reactionMs = reactionMs;
    socket.data.reactionTier = tier;

    if (phase === 'queue') {
      applySeatPressure(room, tier);
      const queueNumber = Math.floor(Math.random() * room.queueBase) + queuePenaltyByTier[tier];
      socket.data.queueNumber = queueNumber;
      socket.data.queueRank = queueNumber;
      socket.data.queueStartedAt = Date.now();
      socket.data.queueBumpUsed = false;

      socket.emit('queue-assigned', {
        queueNumber,
        ahead: queueNumber,
        reactionMs,
        tier,
        message: `오픈 클릭 반응 ${reactionMs}ms. ${tier === 'perfect' ? '최상위 진입입니다.' : tier === 'fast' ? '빠른 진입입니다.' : tier === 'normal' ? '보통 속도로 진입했습니다.' : '늦은 진입으로 경쟁이 치열합니다.'}`
      });
    }

    socket.emit('seat-map', room.seats);
  });

  socket.on('set-phase', ({ phase }) => {
    socket.data.phase = phase;
  });

  socket.on('claim-seat', ({ seatId }) => {
    const room = getRoom(socket.data.performanceId);
    const seat = room.seats.find((item) => item.id === seatId);

    const failChance = { perfect: 0.11, fast: 0.16, normal: 0.23, late: 0.32 }[socket.data.reactionTier] ?? 0.2;

    if (!seat || seat.status !== 'available' || Math.random() < failChance) {
      socket.emit('seat-claim-failed', {
        seatId,
        reason: '이미 선택된 좌석입니다.'
      });
      return;
    }

    seat.status = 'held';
    seat.holder = socket.id;
    io.to(`performance:${socket.data.performanceId}`).emit('seat-updated', seat);

    setTimeout(() => {
      const latestSeat = room.seats.find((item) => item.id === seatId);
      if (latestSeat?.status === 'held' && latestSeat.holder === socket.id) {
        latestSeat.status = 'available';
        delete latestSeat.holder;
        io.to(`performance:${socket.data.performanceId}`).emit('seat-updated', latestSeat);
        socket.emit('seat-released', {
          seatId,
          reason: '제한 시간 내 결제가 완료되지 않아 좌석이 해제되었습니다.'
        });
      }
    }, 90000);
  });

  socket.on('release-seat', ({ seatId }) => {
    const room = getRoom(socket.data.performanceId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (seat?.holder === socket.id) {
      seat.status = 'available';
      delete seat.holder;
      io.to(`performance:${socket.data.performanceId}`).emit('seat-updated', seat);
    }
  });

  socket.on('complete-payment', ({ seatId }) => {
    const room = getRoom(socket.data.performanceId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (seat?.holder === socket.id) {
      seat.status = 'sold';
      io.to(`performance:${socket.data.performanceId}`).emit('seat-updated', seat);
    }
  });
});

setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.data.performanceId || socket.data.phase !== 'queue' || socket.data.queueRank <= 0) return;

    const elapsed = Date.now() - socket.data.queueStartedAt;
    const forcedEntry = elapsed > (forceEntryByTier[socket.data.reactionTier] ?? 17000);
    const pushedBack = !socket.data.queueBumpUsed && elapsed > 4500 && Math.random() < 0.08;
    const speedBonus = { perfect: 320, fast: 230, normal: 160, late: 100 }[socket.data.reactionTier] ?? 160;
    const decrease = forcedEntry ? socket.data.queueRank : Math.floor(Math.random() * 210) + speedBonus;

    socket.data.queueBumpUsed = socket.data.queueBumpUsed || pushedBack;
    socket.data.queueRank = Math.max(0, socket.data.queueRank - decrease + (pushedBack ? 110 : 0));

    socket.emit('queue-update', {
      ahead: socket.data.queueRank,
      pushedBack,
      message: pushedBack ? '접속 재검증으로 순번이 잠시 보정되었습니다.' : '대기 순번이 갱신되었습니다.'
    });
  });
}, 900);

setInterval(() => {
  rooms.forEach((room, performanceId) => {
    const available = room.seats.filter((seat) => seat.status === 'available');
    const occupied = room.seats.filter((seat) => seat.status === 'taken');
    const target = Math.random() < 0.7 ? randomItem(available) : randomItem(occupied);
    if (!target) return;

    target.status = target.status === 'available' ? 'taken' : 'available';
    io.to(`performance:${performanceId}`).emit('seat-updated', target);
  });
}, 2100);

setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.data.performanceId) return;

    const phase = socket.data.phase ?? 'queue';
    const baseChanceByPhase = { queue: 0.04, seat: 0.3, payment: 0.3 };
    const tierAdd = { perfect: -0.06, fast: -0.02, normal: 0.03, late: 0.1 }[socket.data.reactionTier] ?? 0;
    if (Math.random() > Math.max(0.02, (baseChanceByPhase[phase] ?? 0.16) + tierAdd)) return;

    const phaseEvents = randomEvents.filter((event) => event.phase.includes(phase));
    socket.emit('random-event', randomItem(phaseEvents));
  });
}, 8000);

if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      next();
      return;
    }

    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Ticket drill server running on http://localhost:${PORT}`);
});
