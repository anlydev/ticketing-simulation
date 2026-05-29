import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, RotateCcw, Users } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import EventModal from '../components/EventModal.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { socket } from '../socket.js';

export default function QueuePage() {
  const { performanceId } = useParams();
  const navigate = useNavigate();
  const { selectedPerformance, stats, patchStats, mode } = useSimulation();
  const [queue, setQueue] = useState({ queueNumber: 0, ahead: 0, message: '대기열 연결 중...' });
  const [event, setEvent] = useState(null);
  const [refreshed, setRefreshed] = useState(false);
  const [botStatus, setBotStatus] = useState(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join-performance', {
      performanceId,
      phase: 'queue',
      reactionMs: selectedPerformance?.reactionMs ?? stats.openReactionMs ?? 900,
      botMode: selectedPerformance?.botMode ?? stats.botMode ?? 'live',
      missionZone: selectedPerformance?.missionZone ?? mode.missionZone,
      roomKey: selectedPerformance?.roomKey ?? mode.roomKey
    });

    socket.on('queue-assigned', setQueue);
    socket.on('queue-update', (payload) => {
      setQueue((prev) => ({ ...prev, ...payload }));
      if (payload.pushedBack) patchStats((prev) => ({ errors: prev.errors + 1 }));
      if (payload.ahead <= 0) navigate(`/seats/${performanceId}`);
    });
    socket.on('random-event', setEvent);
    socket.on('bot-status', (payload) => {
      setBotStatus(payload);
      patchStats({
        botSeatsSold: payload.sold ?? 0,
        botSeatsReleased: payload.released ?? 0
      });
    });

    return () => {
      socket.off('queue-assigned');
      socket.off('queue-update');
      socket.off('random-event');
      socket.off('bot-status');
    };
  }, [performanceId, navigate]);

  const refreshRisk = () => {
    const reset = Math.random() < 0.25;
    setRefreshed(true);
    if (reset) {
      setQueue((prev) => ({
        ...prev,
        ahead: Math.max(prev.ahead + 450, 900),
        message: '새로고침으로 대기번호가 일부 재배정되었습니다.'
      }));
      patchStats((prev) => ({ errors: prev.errors + 1 }));
    } else {
      setQueue((prev) => ({ ...prev, message: '재접속 확인 완료. 기존 순번을 유지합니다.' }));
    }
  };

  const progress = queue.queueNumber ? Math.min(100, ((queue.queueNumber - queue.ahead) / queue.queueNumber) * 100) : 0;

  useEffect(() => {
    if (queue.ahead <= 0 && queue.queueNumber > 0) {
      navigate(`/seats/${performanceId}`);
    }
  }, [queue.ahead, queue.queueNumber, navigate, performanceId]);

  return (
    <AppShell compact>
      <EventModal
        event={event}
        onClose={() => setEvent(null)}
        onRecover={() => {
          patchStats((prev) => ({ errors: Math.max(0, prev.errors - 1) }));
          setEvent(null);
        }}
      />
      <div className="mx-auto max-w-[900px] border border-[#dddddd] bg-white">
        <div className="border-b border-[#eeeeee] px-8 py-6">
          <p className="text-sm text-[#777]">{selectedPerformance?.title ?? performanceId}</p>
          <h2 className="mt-1 text-3xl font-bold">예매 대기 중</h2>
          {queue.reactionMs != null && (
            <p className="mt-2 text-sm text-[#777]">
              오픈 클릭 반응속도 <strong className="text-[var(--melon)]">{queue.reactionMs}ms</strong> 기준으로 대기열이 배정되었습니다.
            </p>
          )}
        </div>

        <section className="px-8 py-10 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#eafff0] text-[var(--melon)]">
            <Users size={38} />
          </div>
          <p className="mt-6 text-[#666]">현재 내 앞 대기자</p>
          <strong className="mt-2 block text-7xl font-black tracking-[-0.05em] text-[var(--melon)]">
            {queue.ahead.toLocaleString()}
          </strong>
          <p className="mt-4 text-sm text-[#777]">{queue.message}</p>
          {botStatus && (
            <div className="mx-auto mt-6 grid max-w-[620px] gap-2 text-left sm:grid-cols-3">
              <div className="border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-xs text-[#777]">Bot mode</p>
                <strong className="mt-1 block text-lg capitalize">{botStatus.mode}</strong>
              </div>
              <div className="border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-xs text-[#777]">Active bots</p>
                <strong className="mt-1 block text-lg">{botStatus.total}</strong>
              </div>
              <div className="border border-[#eeeeee] bg-[#fafafa] p-3">
                <p className="text-xs text-[#777]">Bot sold seats</p>
                <strong className="mt-1 block text-lg text-[var(--danger)]">{botStatus.sold}</strong>
              </div>
            </div>
          )}

          <div className="mx-auto mt-8 h-3 max-w-[620px] overflow-hidden rounded-full bg-[#eeeeee]">
            <div className="h-full bg-[var(--melon)] transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <aside className="grid gap-4 border-t border-[#eeeeee] bg-[#fafafa] p-6 md:grid-cols-[1fr_220px]">
          <div className="flex gap-3 text-left">
            <AlertCircle size={22} className="mt-1 shrink-0 text-[var(--danger)]" />
            <div>
              <p className="font-bold">훈련 포인트</p>
              <p className="mt-1 text-sm leading-6 text-[#666]">
                대기열에서는 오류가 낮은 확률로만 발생합니다. 순번은 큰 폭으로 줄어들며, 오래 머물지 않도록 서버가 자동 통과를 보장합니다.
              </p>
            </div>
          </div>
          <button
            onClick={refreshRisk}
            className="flex items-center justify-center gap-2 border border-[#cccccc] bg-white px-4 py-3 font-bold text-[#555] hover:border-[var(--melon)] hover:text-[var(--melon)]"
          >
            <RotateCcw size={17} />
            새로고침 연습
          </button>
          {refreshed && <p className="text-sm text-[#777] md:col-span-2">새로고침 결과가 대기열에 반영되었습니다.</p>}
        </aside>
      </div>
    </AppShell>
  );
}
