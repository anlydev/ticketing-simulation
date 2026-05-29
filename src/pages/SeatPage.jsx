import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, RefreshCw } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import CaptchaBox from '../components/CaptchaBox.jsx';
import Countdown from '../components/Countdown.jsx';
import EventModal from '../components/EventModal.jsx';
import SeatMap, { ZoneOverview } from '../components/SeatMap.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { socket } from '../socket.js';
import { createCaptcha } from '../utils/captcha.js';

export default function SeatPage() {
  const { performanceId } = useParams();
  const navigate = useNavigate();
  const { selectedPerformance, selectedSeat, setSelectedSeat, patchStats, recordClick, mode } = useSimulation();
  const [seats, setSeats] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [event, setEvent] = useState(null);
  const [seconds, setSeconds] = useState(80);
  const [notice, setNotice] = useState('좌석을 선택해 주세요.');
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaError, setCaptchaError] = useState('');
  const [botStatus, setBotStatus] = useState(null);
  const [botEvent, setBotEvent] = useState(null);

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join-performance', {
      performanceId,
      phase: 'seat',
      reactionMs: selectedPerformance?.reactionMs ?? 900,
      botMode: selectedPerformance?.botMode ?? 'live',
      missionZone: selectedPerformance?.missionZone ?? mode.missionZone,
      roomKey: selectedPerformance?.roomKey ?? mode.roomKey
    });
    socket.emit('set-phase', { phase: 'seat' });

    socket.on('seat-map', setSeats);
    socket.on('seat-updated', (seat) => {
      setSeats((prev) => prev.map((item) => (item.id === seat.id ? seat : item)));
    });
    socket.on('seat-claim-failed', ({ reason }) => {
      setNotice(reason);
      setSelectedSeat(null);
      patchStats((prev) => ({ seatFailures: prev.seatFailures + 1, errors: prev.errors + 1 }));
    });
    socket.on('seat-released', ({ reason }) => {
      setNotice(reason);
      setSelectedSeat(null);
    });
    socket.on('random-event', (payload) => {
      setEvent(payload);
      if (payload.type === 'seat-taken') {
        if (selectedSeat) socket.emit('release-seat', { seatId: selectedSeat.id });
        setSelectedSeat(null);
        setNotice('이미 선택된 좌석입니다. 다른 좌석을 다시 선택해 주세요.');
        patchStats((prev) => ({ seatFailures: prev.seatFailures + 1, errors: prev.errors + 1 }));
      }
      if (payload.type === 'auto-refresh') {
        if (selectedSeat) socket.emit('release-seat', { seatId: selectedSeat.id });
        setSelectedSeat(null);
        setNotice('예매창이 새로고침되어 선택 좌석이 해제되었습니다.');
        patchStats((prev) => ({ errors: prev.errors + 1 }));
      }
      if (payload.type === 'captcha-repeat') {
        setCaptchaPassed(false);
        setCaptcha(createCaptcha());
        setCaptchaValue('');
        setCaptchaError('보안문자 재입력이 필요합니다.');
      }
      if (payload.type === 'server-lag' || payload.type === 'seat-delay') {
        setNotice('좌석 반영이 지연되고 있습니다. 주변 좌석을 같이 확인하세요.');
      }
    });
    socket.on('bot-status', (payload) => {
      setBotStatus(payload);
      patchStats({
        botSeatsSold: payload.sold ?? 0,
        botSeatsReleased: payload.released ?? 0
      });
    });
    socket.on('bot-event', (payload) => {
      setBotEvent(payload);
      patchStats((prev) => ({ botPressureEvents: (prev.botPressureEvents ?? 0) + 1 }));
    });

    return () => {
      socket.off('seat-map');
      socket.off('seat-updated');
      socket.off('seat-claim-failed');
      socket.off('seat-released');
      socket.off('random-event');
      socket.off('bot-status');
      socket.off('bot-event');
    };
  }, [performanceId, selectedSeat]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          navigate('/result', { state: { success: false, failureReason: '좌석 선택 제한 시간 초과' } });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

  const submitCaptcha = () => {
    if (captchaValue === captcha) {
      setCaptchaPassed(true);
      setCaptchaError('');
      patchStats((prev) => ({ captchaAttempts: prev.captchaAttempts + 1, captchaSuccess: prev.captchaSuccess + 1 }));
      return;
    }

    patchStats((prev) => ({ captchaAttempts: prev.captchaAttempts + 1, errors: prev.errors + 1 }));
    setCaptcha(createCaptcha());
    setCaptchaValue('');
    setCaptchaError('보안문자가 일치하지 않습니다. 다시 입력해 주세요.');
  };

  const handleSelectSeat = (seat) => {
    if (!captchaPassed) return;
    if (mode.type === 'mission' && mode.missionZone && seat.zone !== mode.missionZone) {
      setNotice(`미션 구역은 ${mode.missionZone}구역입니다. ${seat.zone}구역 좌석은 선택할 수 없습니다.`);
      patchStats((prev) => ({ errors: prev.errors + 1 }));
      return;
    }
    recordClick();
    setNotice(`${seat.id} 좌석 선택 요청 중...`);
    setSelectedSeat(seat);
    patchStats({ seatSelectedAt: Date.now() });
    socket.emit('claim-seat', { seatId: seat.id });
  };

  const goPayment = () => {
    if (!selectedSeat) {
      setNotice('좌석을 먼저 선택해 주세요.');
      return;
    }
    navigate(`/payment/${performanceId}`);
  };

  return (
    <AppShell ticketWindow>
      <EventModal
        event={event}
        onClose={() => setEvent(null)}
        onRecover={() => {
          patchStats((prev) => ({ errors: Math.max(0, prev.errors - 1) }));
          patchStats((prev) => ({ crisisHandled: prev.crisisHandled + 1 }));
          setEvent(null);
        }}
      />

      {!captchaPassed && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 p-4">
          <div className="w-full max-w-[420px] rounded-[14px] bg-white p-8 text-center shadow-2xl">
            <h2 className="text-3xl font-medium text-[var(--melon)]">인증예매</h2>
            <p className="mt-5 break-keep text-xl leading-8 text-[#666]">
              부정예매 방지를 위해 보안문자를 정확히 입력해주세요.
            </p>
            <div className="mt-6 text-left">
              <CaptchaBox
                captcha={captcha}
                value={captchaValue}
                onChange={setCaptchaValue}
                onRefresh={() => {
                  setCaptcha(createCaptcha());
                  setCaptchaValue('');
                }}
                onSubmit={submitCaptcha}
                error={captchaError}
              />
            </div>
            <button onClick={() => setCaptchaPassed(true)} className="mt-5 text-sm text-[#777] underline">
              좌석 먼저 확인하고 나중에 입력하기
            </button>
          </div>
        </div>
      )}

      <div className="grid min-h-screen lg:grid-cols-[1fr_332px]">
        <section>
          <header className="flex h-[66px] items-center gap-5 border-b border-[#bdbdbd] bg-white px-9">
            <strong className="text-xl">좌석 선택</strong>
            <span className="max-w-[380px] truncate text-lg">- {selectedPerformance?.title ?? 'The Trilogy I - 2026 SHINee WORLD VIII'}</span>
            <select className="ml-auto h-10 min-w-[275px] border border-[#bbbbbb] px-3 text-lg">
              <option>2026.05.30 (토) 17:00</option>
            </select>
          </header>
          <div className="px-14 py-10 text-[11px] leading-5 text-[#999]">
            ※ 좌석배치도 및 일부 좌석은 공연장 구조, 무대 연출 및 아티스트 위치에 따라 변경될 수 있습니다.
            <br />
            ※ 이미 선택된 좌석은 회색으로 표시되며, 선택 가능한 좌석은 분홍색으로 표시됩니다.
          </div>
          <SeatMap
            seats={seats}
            selectedSeat={selectedSeat}
            selectedZone={selectedZone}
            missionZone={mode.missionZone}
            onSelectZone={setSelectedZone}
            onBackToZones={() => setSelectedZone(null)}
            onSelectSeat={handleSelectSeat}
          />
          <div className="fixed bottom-0 left-0 right-0 h-[54px] bg-[#666] px-9 py-3 text-xl text-white lg:right-[332px]">
            {notice}
          </div>
        </section>

        <aside className="border-l border-[#cccccc] bg-white px-4 py-5">
          <div className="melon-logo mb-5 text-center text-3xl">Melon티켓</div>
          <div className="mx-auto mb-3 max-w-[260px] bg-[#f3f3f3]">
            <ZoneOverview seats={seats} selectedZone={selectedZone} missionZone={mode.missionZone} onSelectZone={setSelectedZone} compact />
          </div>
          <button onClick={() => setSelectedZone(null)} className="mb-8 ml-auto flex items-center text-sm text-[#777]">
            좌석도 전체보기 <ChevronRight size={14} />
          </button>

          <div className="mb-5 flex items-center justify-between">
            <h2 className="flex items-center gap-1 text-xl">좌석등급/잔여석 <Info size={16} className="text-[#aaa]" /></h2>
            <button className="flex items-center gap-1 rounded-full border border-[#dddddd] px-3 py-1 text-sm text-[#777]">
              <RefreshCw size={14} />
              새로고침
            </button>
          </div>

          <div className="border border-[#dddddd] p-4 text-[16px] leading-8">
            <p><span className="mr-2 inline-block h-3 w-3 bg-[#b49d7a]" />다이아몬드석 198,000원</p>
            <p><span className="mr-2 inline-block h-3 w-3 bg-[#7558d9]" />일반석(STANDING) 165,000원</p>
            <p><span className="mr-2 inline-block h-3 w-3 bg-[#e76b9a]" />일반석(SEATED) 165,000원</p>
          </div>

          {botStatus && (
            <div className="mt-5 border border-[#dddddd] bg-[#fafafa] p-4 text-sm leading-7 text-[#555]">
              <div className="mb-2 flex items-center justify-between">
                <strong className="text-[#111]">AI 경쟁 현황</strong>
                <span className="rounded-full bg-white px-2 py-1 text-xs uppercase text-[var(--melon)]">{botStatus.mode}</span>
              </div>
              <p>활성 봇 {botStatus.total}명 · 임시 점유 {botStatus.held}석</p>
              <p>봇 결제 완료 {botStatus.sold}석 · 반환 {botStatus.released}석</p>
              {botEvent && <p className="mt-2 border-t border-[#e5e5e5] pt-2 text-xs text-[#777]">{botEvent.message}</p>}
            </div>
          )}

          <div className="mt-6">
            <Countdown seconds={seconds} label="좌석 선택 제한 시간" />
          </div>

          <button
            onClick={goPayment}
            className={`mt-6 flex h-[62px] w-full items-center justify-center gap-3 text-xl font-bold text-white ${selectedSeat ? 'bg-[var(--melon)]' : 'bg-[#888]'}`}
          >
            좌석 선택 완료
            <ChevronRight size={22} />
          </button>
        </aside>
      </div>
    </AppShell>
  );
}
