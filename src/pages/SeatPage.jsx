import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, Info, RefreshCw } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import CaptchaBox from '../components/CaptchaBox.jsx';
import Countdown from '../components/Countdown.jsx';
import EventModal from '../components/EventModal.jsx';
import SeatMap from '../components/SeatMap.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { socket } from '../socket.js';
import { createCaptcha } from '../utils/captcha.js';

export default function SeatPage() {
  const { performanceId } = useParams();
  const navigate = useNavigate();
  const { selectedPerformance, selectedSeat, setSelectedSeat, patchStats, recordClick } = useSimulation();
  const [seats, setSeats] = useState([]);
  const [event, setEvent] = useState(null);
  const [seconds, setSeconds] = useState(80);
  const [notice, setNotice] = useState('좌석을 선택해 주세요.');
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaValue, setCaptchaValue] = useState('');
  const [captchaPassed, setCaptchaPassed] = useState(false);
  const [captchaError, setCaptchaError] = useState('');

  useEffect(() => {
    if (!socket.connected) socket.connect();
    socket.emit('join-performance', { performanceId, phase: 'seat' });
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

    return () => {
      socket.off('seat-map');
      socket.off('seat-updated');
      socket.off('seat-claim-failed');
      socket.off('seat-released');
      socket.off('random-event');
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
          <SeatMap seats={seats} selectedSeat={selectedSeat} onSelectSeat={handleSelectSeat} />
          <div className="fixed bottom-0 left-0 right-0 h-[54px] bg-[#666] px-9 py-3 text-xl text-white lg:right-[332px]">
            {notice}
          </div>
        </section>

        <aside className="border-l border-[#cccccc] bg-white px-4 py-5">
          <div className="melon-logo mb-5 text-center text-3xl">Melon티켓</div>
          <div className="mx-auto mb-3 h-[225px] max-w-[260px] bg-[#f3f3f3] p-3">
            <div className="mb-2 h-5 bg-[#dddddd] text-center text-xs text-[#aaa]">STAGE</div>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 56 }, (_, index) => (
                <span key={index} className={`h-5 ${index === 42 ? 'bg-[#e76b9a]' : 'bg-[#d5d5d5]'}`} />
              ))}
            </div>
          </div>
          <button className="mb-8 ml-auto flex items-center text-sm text-[#777]">
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
