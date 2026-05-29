import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, DoorOpen, Heart, List, Share2, Swords, Target, Users } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { socket } from '../socket.js';

const dates = ['2026.05.29 (금)', '2026.05.30 (토)', '2026.05.31 (일)'];

const modeCards = [
  {
    id: 'free',
    title: '자유 연습 모드',
    detail: '현재 방식과 같은 기본 연습입니다. 아무 좌석이나 빠르게 잡는 것이 목표입니다.',
    icon: Swords
  },
  {
    id: 'mission',
    title: '미션 모드',
    detail: '지정된 구역의 좌석을 예매해야 성공합니다. 봇도 해당 구역을 집중 공략합니다.',
    icon: Target
  },
  {
    id: 'multi',
    title: '멀티 모드',
    detail: '같은 방키를 입력한 사용자끼리 함께 연습하고 결과 순위를 확인합니다.',
    icon: Users
  }
];

function makeMissionZone() {
  return Math.floor(Math.random() * 56) + 1;
}

export default function HomePage() {
  const [performances, setPerformances] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dates[1]);
  const [openTargetAt, setOpenTargetAt] = useState(() => Date.now() + 10000);
  const [now, setNow] = useState(Date.now());
  const [roomKeyInput, setRoomKeyInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const navigate = useNavigate();
  const { mode, setMode, setSelectedPerformance, resetSimulation, recordOpenClick, patchStats } = useSimulation();

  useEffect(() => {
    resetSimulation();
    fetch('/api/performances')
      .then((response) => response.json())
      .then((items) => {
        setPerformances(items);
        setActiveId(items[0]?.id ?? null);
      })
      .catch(() => setPerformances([]));
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setOpenTargetAt(Date.now() + 10000);
  }, [activeId, selectedDate, mode.type]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    socket.on('multi-room-created', ({ roomKey, participants }) => {
      setMode({
        type: 'multi',
        missionZone: null,
        roomKey,
        participantName: participants.at(-1)?.name ?? '참여자1',
        participants,
        rankings: []
      });
      setRoomError('');
    });
    socket.on('multi-room-joined', ({ roomKey, participants }) => {
      setMode({
        type: 'multi',
        missionZone: null,
        roomKey,
        participantName: participants.at(-1)?.name ?? `참여자${participants.length}`,
        participants,
        rankings: []
      });
      setRoomError('');
    });
    socket.on('multi-room-error', ({ message }) => setRoomError(message));
    socket.on('multi-participants', ({ participants }) => {
      setMode((prev) => ({ ...prev, participants }));
    });

    return () => {
      socket.off('multi-room-created');
      socket.off('multi-room-joined');
      socket.off('multi-room-error');
      socket.off('multi-participants');
    };
  }, [setMode]);

  const performance = performances.find((item) => item.id === activeId) ?? performances[0];
  const remainingMs = Math.max(0, openTargetAt - now);
  const isOpen = remainingMs <= 0;
  const countdown = `${String(Math.floor(remainingMs / 1000)).padStart(2, '0')}.${String(Math.floor((remainingMs % 1000) / 10)).padStart(2, '0')}`;

  const chooseMode = (type) => {
    if (type === 'multi') {
      setMode({ type: 'multi-setup', missionZone: null, roomKey: null, participantName: null, participants: [], rankings: [] });
      return;
    }

    setMode({
      type,
      missionZone: type === 'mission' ? makeMissionZone() : null,
      roomKey: null,
      participantName: null,
      participants: [],
      rankings: []
    });
  };

  const createRoom = () => {
    if (!socket.connected) socket.connect();
    socket.emit('create-multi-room');
  };

  const joinRoom = () => {
    if (!roomKeyInput.trim()) {
      setRoomError('방키를 입력해주세요.');
      return;
    }
    if (!socket.connected) socket.connect();
    socket.emit('join-multi-room', { roomKey: roomKeyInput.trim().toUpperCase() });
  };

  const handleReserve = () => {
    if (!performance || !isOpen) return;
    const reactionMs = recordOpenClick(openTargetAt);
    const botMode = mode.type === 'mission' ? 'mission' : 'live';

    setSelectedPerformance({
      ...performance,
      date: selectedDate,
      reactionMs,
      botMode,
      trainingMode: mode.type,
      missionZone: mode.missionZone,
      roomKey: mode.roomKey
    });
    patchStats({ botMode });
    navigate(`/queue/${performance.id}`);
  };

  if (!mode.type || mode.type === 'multi-setup') {
    return (
      <AppShell>
        <section className="mx-auto max-w-[980px] py-8">
          <div className="mb-8 text-center">
            <div className="melon-logo text-5xl">Melon티켓</div>
            <h1 className="mt-6 text-3xl font-black text-[#111]">티켓팅 연습 모드 선택</h1>
            <p className="mt-3 text-[#666]">먼저 플레이 방식을 고른 뒤 예매 대기와 좌석 선택 연습을 시작합니다.</p>
          </div>

          {mode.type !== 'multi-setup' ? (
            <div className="grid gap-4 md:grid-cols-3">
              {modeCards.map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.id}
                    onClick={() => chooseMode(card.id)}
                    className="min-h-[240px] border border-[#dddddd] bg-white p-6 text-left transition hover:border-[var(--melon)] hover:shadow-lg"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-[#eafff0] text-[var(--melon)]">
                      <Icon size={25} />
                    </span>
                    <strong className="mt-6 block text-2xl">{card.title}</strong>
                    <span className="mt-4 block break-keep leading-7 text-[#666]">{card.detail}</span>
                    <span className="mt-7 inline-flex items-center gap-1 font-bold text-[var(--melon)]">
                      선택하기 <ChevronRight size={16} />
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto grid max-w-[760px] gap-4 md:grid-cols-2">
              <section className="border border-[#dddddd] bg-white p-6">
                <DoorOpen className="text-[var(--melon)]" size={32} />
                <h2 className="mt-4 text-2xl font-black">방 생성</h2>
                <p className="mt-3 break-keep leading-7 text-[#666]">새 방키를 만들고 함께 연습할 사용자에게 공유합니다.</p>
                <button onClick={createRoom} className="mt-7 h-12 w-full bg-[var(--melon)] font-bold text-white">
                  방 만들기
                </button>
              </section>
              <section className="border border-[#dddddd] bg-white p-6">
                <Users className="text-[var(--melon)]" size={32} />
                <h2 className="mt-4 text-2xl font-black">방키 입력</h2>
                <p className="mt-3 break-keep leading-7 text-[#666]">이미 생성된 방키를 입력하면 같은 좌석 상황으로 참여합니다.</p>
                <input
                  value={roomKeyInput}
                  onChange={(event) => setRoomKeyInput(event.target.value.toUpperCase())}
                  className="mt-5 h-12 w-full border border-[#cccccc] px-4 text-center text-xl font-black tracking-[0.18em]"
                  placeholder="ABCD12"
                />
                <button onClick={joinRoom} className="mt-3 h-12 w-full border border-[var(--melon)] font-bold text-[var(--melon)]">
                  참여하기
                </button>
              </section>
              {roomError && <p className="md:col-span-2 text-center text-[var(--danger)]">{roomError}</p>}
              <button onClick={() => setMode({ type: null, missionZone: null, roomKey: null, participantName: null, participants: [], rankings: [] })} className="md:col-span-2 text-[#777] underline">
                모드 선택으로 돌아가기
              </button>
            </div>
          )}
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {performance && (
        <>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase text-[var(--melon)]">
                {mode.type === 'free' ? '자유 연습 모드' : mode.type === 'mission' ? `미션 모드 · ${mode.missionZone}구역 예매` : `멀티 모드 · 방키 ${mode.roomKey}`}
              </p>
              {mode.type === 'multi' && (
                <p className="mt-1 text-sm text-[#666]">
                  {mode.participants.map((player) => player.name).join(', ') || '참여자를 기다리는 중'}
                </p>
              )}
            </div>
            <button onClick={resetSimulation} className="border border-[#cccccc] px-4 py-2 text-sm font-bold text-[#555]">
              모드 다시 선택
            </button>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {performances.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveId(item.id)}
                className={`rounded-full border px-4 py-2 text-sm font-bold ${activeId === item.id ? 'border-[var(--melon)] bg-[var(--melon)] text-white' : 'border-[#dddddd] bg-white text-[#555]'}`}
              >
                {item.title.length > 28 ? `${item.title.slice(0, 28)}...` : item.title}
              </button>
            ))}
          </div>

          <section className="ticket-window">
            <div className="grid gap-9 p-9 lg:grid-cols-[240px_1fr_260px]">
              <div>
                <img className="h-[320px] w-full object-cover" src={performance.poster} alt={performance.title} />
                <div className="mt-3 flex justify-center gap-2">
                  <button className="grid h-8 w-8 place-items-center border border-[#dddddd] text-[#4267b2]" aria-label="공유">
                    <Share2 size={16} />
                  </button>
                  <button className="grid h-8 w-8 place-items-center border border-[#dddddd] text-[#555]" aria-label="관심">
                    <Heart size={16} />
                  </button>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap gap-1">
                  {performance.tags.map((tag, index) => (
                    <span key={tag} className={`px-2 py-1 text-sm font-bold text-white ${index === 0 ? 'bg-[var(--melon)]' : index === 1 ? 'bg-[#ef3f6b]' : 'bg-[#2f80ed]'}`}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h1 className="mt-4 max-w-[680px] break-keep text-[32px] font-medium leading-tight">{performance.title}</h1>

                <dl className="mt-16 grid max-w-[720px] grid-cols-1 gap-x-16 gap-y-5 text-[16px] md:grid-cols-2">
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">공연기간</dt>
                    <dd>2026.05.29 - 2026.05.31</dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">공연장</dt>
                    <dd className="flex items-center gap-2">
                      {performance.venue}
                      <ChevronRight size={15} className="text-[#bbb]" />
                    </dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">관람시간</dt>
                    <dd>120분</dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">가격</dt>
                    <dd>{performance.price}</dd>
                  </div>
                </dl>
              </div>

              <div className="hidden justify-self-end lg:block">
                <button className="mb-3 flex h-14 w-[200px] items-center justify-center gap-2 rounded-full border-2 border-[#cccccc] font-bold text-[#555]">
                  <Heart size={20} />
                  관심공연 담기
                </button>
                <button className="h-14 w-[200px] rounded-full border-2 border-[#cccccc] font-bold text-[#777]">Foreigner</button>
              </div>
            </div>

            <div className="grid border-t border-[#dddddd] lg:grid-cols-[420px_1fr]">
              <div className="border-r border-[#eeeeee]">
                <div className="flex items-center gap-4 border-b border-[#eeeeee] px-8 py-5 text-xl font-bold">
                  <CalendarDays size={22} className="text-[#bbb]" />
                  <List size={25} className="text-[var(--melon)]" />
                  날짜 선택
                  <ChevronRight className="ml-auto text-[#cccccc]" />
                </div>
                <div className="space-y-2 px-10 py-7">
                  {dates.map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`block w-full border px-5 py-3 text-left text-xl ${selectedDate === date ? 'border-[var(--melon)] text-[var(--melon)]' : 'border-transparent text-[#555] hover:border-[#dddddd]'}`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid min-h-[240px] grid-rows-[auto_1fr_auto]">
                <div className="border-b border-[#eeeeee] px-8 py-5 text-center text-xl font-bold">시간 선택</div>
                <div className="grid place-items-center">
                  <button className="w-[300px] border border-[var(--melon)] px-8 py-3 text-xl text-[var(--melon)]">17:00</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eeeeee] p-4">
                  <div className="text-sm text-[#777]">
                    <strong className={isOpen ? 'text-[var(--melon)]' : 'text-[var(--danger)]'}>
                      {isOpen ? '예매 오픈' : `오픈까지 ${countdown}초`}
                    </strong>
                    <span className="ml-2">정각 클릭 속도가 대기순번과 좌석 경쟁에 반영됩니다.</span>
                  </div>
                  <button
                    onClick={handleReserve}
                    disabled={!isOpen}
                    className={`h-[62px] w-[325px] text-xl font-bold text-white ${isOpen ? 'bg-[var(--melon)] hover:bg-[var(--melon-dark)]' : 'bg-[#b8b8b8]'}`}
                  >
                    {isOpen ? '예매하기' : '오픈 대기'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
