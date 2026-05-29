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
  const seats = [];

  for (let zone = 1; zone <= 56; zone += 1) {
    const rows = 7 + Math.floor(Math.random() * 4);
    const cols = 7 + Math.floor(Math.random() * 5);
    let number = 1;

    for (let row = 1; row <= rows; row += 1) {
      for (let col = 1; col <= cols; col += 1) {
        const gap = Math.random() < 0.08;
        const section = zone <= 8 ? 'DIAMOND' : zone <= 24 ? 'STANDING' : 'SEATED';
        seats.push({
          id: `${zone}구역-${number}`,
          zone,
          section,
          row,
          col,
          number,
          gap,
          status: gap ? 'gap' : Math.random() < 0.12 ? 'taken' : 'available',
          price: section === 'DIAMOND' ? 198000 : 165000
        });
        number += 1;
      }
    }
  }

  return seats;
};

const rooms = new Map();
const multiplayerRooms = new Map();

const botModeConfig = {
  relaxed: { label: 'Relaxed', baseBots: 18, ghostRatio: 0.55, spawnWindow: 9000, buySuccess: 0.42 },
  live: { label: 'Live', baseBots: 42, ghostRatio: 0.45, spawnWindow: 6500, buySuccess: 0.58 },
  bloodbath: { label: 'Bloodbath', baseBots: 78, ghostRatio: 0.36, spawnWindow: 4200, buySuccess: 0.72 },
  mission: { label: 'Mission', baseBots: 64, ghostRatio: 0.38, spawnWindow: 4300, buySuccess: 0.68 }
};

const botSeatWeight = (seat, missionZone = null) => {
  const sectionWeight = {
    DIAMOND: 8,
    STANDING: 5,
    SEATED: 4,
    BALCONY: 2
  }[seat.section] ?? 1;
  const numberBoost = Math.max(1, 40 - seat.number) / 40;
  const missionBoost = missionZone && seat.zone === missionZone ? 24 : 0;
  return sectionWeight + numberBoost * 4 + missionBoost + Math.random();
};

const pickBotSeat = (room) => {
  const available = room.seats.filter((seat) => seat.status === 'available');
  if (!available.length) return null;

  const total = available.reduce((sum, seat) => sum + botSeatWeight(seat, room.missionZone), 0);
  let cursor = Math.random() * total;
  return available.find((seat) => {
    cursor -= botSeatWeight(seat, room.missionZone);
    return cursor <= 0;
  }) ?? available[0];
};

const emitBotStatus = (roomId, room) => {
  io.to(`performance:${roomId}`).emit('bot-status', {
    mode: room.botMode,
    total: room.botStats.ghostActive + room.botStats.buyerActive,
    ghost: room.botStats.ghostActive,
    buyer: room.botStats.buyerActive,
    held: room.seats.filter((seat) => seat.status === 'held' && seat.heldBy === 'bot').length,
    sold: room.botStats.sold,
    released: room.botStats.released
  });
};

const emitBotEvent = (roomId, room, payload) => {
  room.botStats.lastEvent = payload;
  io.to(`performance:${roomId}`).emit('bot-event', payload);
  emitBotStatus(roomId, room);
};

const stopRoomBots = (room) => {
  room.botTimers.forEach((timer) => clearTimeout(timer));
  room.botTimers = [];
  room.botRunning = false;
  room.seats.forEach((seat) => {
    if (seat.status === 'held' && seat.heldBy === 'bot') {
      seat.status = 'available';
      delete seat.holder;
      delete seat.heldBy;
    }
  });
  room.botStats.ghostActive = 0;
  room.botStats.buyerActive = 0;
};

const scheduleBotTimer = (room, callback, delay) => {
  const timer = setTimeout(() => {
    room.botTimers = room.botTimers.filter((item) => item !== timer);
    callback();
  }, delay);
  room.botTimers.push(timer);
};

const startRoomBots = (roomId, room, mode = 'live', missionZone = null, performanceId = roomId) => {
  const nextMode = botModeConfig[mode] ? mode : 'live';
  if (room.botRunning && room.botMode === nextMode) {
    emitBotStatus(roomId, room);
    return;
  }

  if (room.botRunning) stopRoomBots(room);

  const config = botModeConfig[nextMode];
  room.missionZone = missionZone ? Number(missionZone) : room.missionZone ?? null;
  const performance = performances.find((item) => item.id === performanceId);
  const popularity = Math.max(0.35, Math.min(1.25, (performance?.difficulty ?? 80) / 100));
  const totalBots = Math.max(8, Math.round(config.baseBots * popularity));
  const ghostBots = Math.round(totalBots * config.ghostRatio);
  const buyerBots = totalBots - ghostBots;

  room.botMode = nextMode;
  room.botRunning = true;
  room.botStats = {
    ghostActive: ghostBots,
    buyerActive: buyerBots,
    sold: 0,
    released: 0,
    lastEvent: null
  };

  const runGhostBot = (index) => {
    if (!room.botRunning) return;
    const seat = pickBotSeat(room);
    if (!seat) {
      scheduleBotTimer(room, () => runGhostBot(index), 3500 + Math.random() * 5000);
      return;
    }

    const botId = `ghost:${index}`;
    seat.status = 'held';
    seat.holder = botId;
    seat.heldBy = 'bot';
    io.to(`performance:${roomId}`).emit('seat-updated', seat);
    emitBotEvent(roomId, room, {
      type: 'ghost-hold',
      message: `Ghost bot temporarily held ${seat.id}.`
    });

    scheduleBotTimer(room, () => {
      if (seat.status === 'held' && seat.holder === botId) {
        seat.status = 'available';
        delete seat.holder;
        delete seat.heldBy;
        room.botStats.released += 1;
        io.to(`performance:${roomId}`).emit('seat-updated', seat);
        emitBotEvent(roomId, room, {
          type: 'ghost-release',
          message: `Ghost bot released ${seat.id}.`
        });
      }
      scheduleBotTimer(room, () => runGhostBot(index), 7000 + Math.random() * 15000);
    }, 9000 + Math.random() * 26000);
  };

  const runBuyerBot = (index) => {
    if (!room.botRunning) return;
    const seat = pickBotSeat(room);
    if (!seat) {
      room.botStats.buyerActive = Math.max(0, room.botStats.buyerActive - 1);
      emitBotStatus(roomId, room);
      return;
    }

    const botId = `buyer:${index}`;
    seat.status = 'held';
    seat.holder = botId;
    seat.heldBy = 'bot';
    io.to(`performance:${roomId}`).emit('seat-updated', seat);
    emitBotEvent(roomId, room, {
      type: 'buyer-hold',
      message: `Buyer bot is checking out ${seat.id}.`
    });

    scheduleBotTimer(room, () => {
      if (seat.status !== 'held' || seat.holder !== botId) return;

      if (Math.random() < config.buySuccess) {
        seat.status = 'sold';
        delete seat.holder;
        delete seat.heldBy;
        room.botStats.sold += 1;
        io.to(`performance:${roomId}`).emit('seat-updated', seat);
        emitBotEvent(roomId, room, {
          type: 'buyer-sold',
          message: `Buyer bot completed payment for ${seat.id}.`
        });
      } else {
        seat.status = 'available';
        delete seat.holder;
        delete seat.heldBy;
        room.botStats.released += 1;
        io.to(`performance:${roomId}`).emit('seat-updated', seat);
        emitBotEvent(roomId, room, {
          type: 'buyer-failed',
          message: `Buyer bot payment failed and ${seat.id} returned.`
        });
      }

      room.botStats.buyerActive = Math.max(0, room.botStats.buyerActive - 1);
      emitBotStatus(roomId, room);
    }, 3500 + Math.random() * 12500);
  };

  for (let index = 0; index < ghostBots; index += 1) {
    scheduleBotTimer(room, () => runGhostBot(index), Math.random() * config.spawnWindow);
  }

  for (let index = 0; index < buyerBots; index += 1) {
    scheduleBotTimer(room, () => runBuyerBot(index), Math.random() * config.spawnWindow);
  }

  emitBotStatus(roomId, room);
};

const getRoom = (roomId) => {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      seats: buildSeats(),
      queueBase: Math.floor(Math.random() * 900) + 1100,
      botMode: 'live',
      missionZone: null,
      botRunning: false,
      botTimers: [],
      botStats: {
        ghostActive: 0,
        buyerActive: 0,
        sold: 0,
        released: 0,
        lastEvent: null
      }
    });
  }

  return rooms.get(roomId);
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
  socket.on('create-multi-room', () => {
    const roomKey = Math.random().toString(36).slice(2, 8).toUpperCase();
    const participant = { id: socket.id, name: '참여자1', joinedAt: Date.now() };
    multiplayerRooms.set(roomKey, {
      roomKey,
      roomId: `multi:${roomKey}`,
      participants: [participant],
      results: []
    });
    socket.join(`multi:${roomKey}`);
    socket.data.multiRoomKey = roomKey;
    socket.emit('multi-room-created', { roomKey, participants: [participant] });
  });

  socket.on('join-multi-room', ({ roomKey }) => {
    const normalizedKey = String(roomKey ?? '').trim().toUpperCase();
    const multiRoom = multiplayerRooms.get(normalizedKey);
    if (!multiRoom) {
      socket.emit('multi-room-error', { message: '존재하지 않는 방키입니다.' });
      return;
    }

    const existing = multiRoom.participants.find((participant) => participant.id === socket.id);
    const participant = existing ?? {
      id: socket.id,
      name: `참여자${multiRoom.participants.length + 1}`,
      joinedAt: Date.now()
    };
    if (!existing) multiRoom.participants.push(participant);

    socket.join(`multi:${normalizedKey}`);
    socket.data.multiRoomKey = normalizedKey;
    socket.emit('multi-room-joined', { roomKey: normalizedKey, participants: multiRoom.participants });
    io.to(`multi:${normalizedKey}`).emit('multi-participants', { participants: multiRoom.participants });
  });

  socket.on('join-performance', ({ performanceId, phase = 'queue', reactionMs = 900, botMode = 'live', missionZone = null, roomKey = null }) => {
    const multiRoom = roomKey ? multiplayerRooms.get(String(roomKey).toUpperCase()) : null;
    const roomId = multiRoom?.roomId ?? performanceId;
    const roomName = `performance:${roomId}`;
    const room = getRoom(roomId);
    const tier = reactionTier(reactionMs);

    socket.join(roomName);
    socket.data.performanceId = performanceId;
    socket.data.roomId = roomId;
    socket.data.phase = phase;
    socket.data.reactionMs = reactionMs;
    socket.data.reactionTier = tier;
    socket.data.missionZone = missionZone ? Number(missionZone) : null;

    startRoomBots(roomId, room, botMode, missionZone, performanceId);

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
    emitBotStatus(roomId, room);
  });

  socket.on('set-phase', ({ phase }) => {
    socket.data.phase = phase;
  });

  socket.on('claim-seat', ({ seatId }) => {
    const room = getRoom(socket.data.roomId ?? socket.data.performanceId);
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
    seat.heldBy = 'player';
    io.to(`performance:${socket.data.roomId ?? socket.data.performanceId}`).emit('seat-updated', seat);

    setTimeout(() => {
      const latestSeat = room.seats.find((item) => item.id === seatId);
      if (latestSeat?.status === 'held' && latestSeat.holder === socket.id) {
        latestSeat.status = 'available';
        delete latestSeat.holder;
        delete latestSeat.heldBy;
        io.to(`performance:${socket.data.roomId ?? socket.data.performanceId}`).emit('seat-updated', latestSeat);
        socket.emit('seat-released', {
          seatId,
          reason: '제한 시간 내 결제가 완료되지 않아 좌석이 해제되었습니다.'
        });
      }
    }, 90000);
  });

  socket.on('release-seat', ({ seatId }) => {
    const room = getRoom(socket.data.roomId ?? socket.data.performanceId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (seat?.holder === socket.id) {
      seat.status = 'available';
      delete seat.holder;
      delete seat.heldBy;
      io.to(`performance:${socket.data.roomId ?? socket.data.performanceId}`).emit('seat-updated', seat);
    }
  });

  socket.on('complete-payment', ({ seatId, result = null }) => {
    const room = getRoom(socket.data.roomId ?? socket.data.performanceId);
    const seat = room.seats.find((item) => item.id === seatId);
    if (seat?.holder === socket.id) {
      seat.status = 'sold';
      delete seat.holder;
      delete seat.heldBy;
      io.to(`performance:${socket.data.roomId ?? socket.data.performanceId}`).emit('seat-updated', seat);
    }

    if (socket.data.multiRoomKey) {
      const multiRoom = multiplayerRooms.get(socket.data.multiRoomKey);
      const participant = multiRoom?.participants.find((item) => item.id === socket.id);
      if (multiRoom && participant) {
        const nextResult = {
          id: socket.id,
          name: participant.name,
          seatId,
          score: result?.totalScore ?? result?.score ?? 0,
          openReactionMs: result?.openReactionMs ?? null,
          completedAt: Date.now()
        };
        multiRoom.results = [...multiRoom.results.filter((item) => item.id !== socket.id), nextResult]
          .sort((a, b) => b.score - a.score || (a.openReactionMs ?? 999999) - (b.openReactionMs ?? 999999));
        io.to(`multi:${socket.data.multiRoomKey}`).emit('multi-ranking', { rankings: multiRoom.results });
      }
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
