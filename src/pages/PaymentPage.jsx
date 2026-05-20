import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, CreditCard, Smartphone } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import Countdown from '../components/Countdown.jsx';
import EventModal from '../components/EventModal.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { socket } from '../socket.js';
import { buildResult } from '../utils/scoring.js';

const agreements = [
  '[필수] 예매 및 취소 수수료/취소기한을 확인하였으며 동의합니다.',
  '[필수] 카카오 전자금융 이용약관 동의',
  '[필수] 개인정보 수집/이용에 동의합니다.',
  '[필수] 개인정보 제3자 제공 동의 및 주의사항',
  '[필수] 멜론티켓 이용약관 동의합니다.'
];

export default function PaymentPage() {
  const { performanceId } = useParams();
  const navigate = useNavigate();
  const { selectedPerformance, selectedSeat, stats, patchStats, setResult } = useSimulation();
  const [seconds, setSeconds] = useState(65);
  const [method, setMethod] = useState('money');
  const [installment, setInstallment] = useState('일시불');
  const [checked, setChecked] = useState([]);
  const [event, setEvent] = useState(null);

  useEffect(() => {
    if (!selectedSeat) {
      navigate(`/seats/${performanceId}`);
      return;
    }

    socket.emit('set-phase', { phase: 'payment' });
    socket.on('random-event', (payload) => {
      setEvent(payload);
      if (payload.type === 'installment-delay') {
        setSeconds((prev) => Math.max(1, prev - 7));
        patchStats((prev) => ({ errors: prev.errors + 1 }));
      }
      if (payload.type === 'browser-payment-blocked') {
        setMethod('card');
      }
      if (payload.type === 'captcha-repeat') {
        patchStats((prev) => ({ captchaAttempts: prev.captchaAttempts + 1, errors: prev.errors + 1 }));
      }
    });
    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          socket.emit('release-seat', { seatId: selectedSeat.id });
          const nextResult = buildResult({
            stats,
            success: false,
            failureReason: '결제 제한 시간 초과'
          });
          setResult(nextResult);
          navigate('/result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      socket.off('random-event');
    };
  }, [selectedSeat, performanceId, navigate, stats]);

  const toggleAll = (enabled) => {
    setChecked(enabled ? agreements : []);
  };

  const toggleAgreement = (agreement) => {
    setChecked((prev) => (prev.includes(agreement) ? prev.filter((item) => item !== agreement) : [...prev, agreement]));
  };

  const completePayment = () => {
    if (checked.length !== agreements.length) {
      setEvent({
        title: '예매자 동의 필요',
        message: '필수 약관을 모두 확인해야 결제 단계가 완료됩니다.',
        severity: 'warning',
        action: '전체동의 체크'
      });
      return;
    }

    if ((method === 'kakao-card' || method === 'money') && Math.random() < 0.32) {
      setEvent({
        type: 'pay-error',
        title: '간편결제 인증 지연',
        message: '카카오페이/간편결제 인증 응답이 늦습니다. 신용/체크카드 또는 무통장입금으로 바꿔보세요.',
        severity: 'danger',
        action: '결제수단 변경'
      });
      patchStats((prev) => ({ errors: prev.errors + 1 }));
      return;
    }

    socket.emit('complete-payment', { seatId: selectedSeat.id });
    const nextResult = buildResult({ stats, success: true, failureReason: null });
    setResult(nextResult);
    navigate('/result');
  };

  return (
    <AppShell ticketWindow>
      <EventModal
        event={event}
        onClose={() => setEvent(null)}
        onRecover={() => {
          setMethod('money');
          patchStats((prev) => ({ crisisHandled: prev.crisisHandled + 1 }));
          setEvent(null);
        }}
      />

      <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_330px]">
        <section className="overflow-y-auto">
          <div className="grid h-[60px] grid-cols-3 border-b border-[#cccccc] text-center text-xl font-bold text-[#aaa]">
            <div className="flex items-center justify-center gap-2">STEP 1 좌석 선택</div>
            <div className="flex items-center justify-center gap-2">STEP 2 가격 선택</div>
            <div className="flex items-center justify-center gap-2 text-[var(--melon)]">STEP 3 배송/결제</div>
          </div>

          <div className="space-y-9 p-9">
            <section>
              <h2 className="mb-5 text-2xl font-bold">수령방법</h2>
              <div className="flex flex-wrap gap-8 text-lg">
                <label><input type="radio" defaultChecked className="mr-2" /> 현장수령</label>
                <label className="text-[#bbb]"><input type="radio" disabled className="mr-2" /> 모바일티켓</label>
                <label className="text-[#bbb]"><input type="radio" disabled className="mr-2" /> 배송(3,700원)</label>
              </div>
              <p className="mt-3 text-[#777]">공연 당일 현장 교부처에서 예매번호 및 본인 확인 후 티켓을 수령하여 입장이 가능합니다.</p>
            </section>

            <section className="bg-[#fafafa] p-6">
              <h2 className="mb-6 text-xl font-medium">주문자정보</h2>
              <div className="grid gap-5 md:grid-cols-2">
                <label className="grid grid-cols-[90px_1fr] items-center text-[#777]">
                  이름 <input className="border border-[#dddddd] bg-white px-3 py-2" defaultValue="이예은" />
                </label>
                <label className="grid grid-cols-[90px_1fr] items-center text-[#777]">
                  이메일 <input className="border border-[#111] bg-white px-3 py-2" />
                </label>
              </div>
              <p className="mt-5 text-sm text-[var(--danger)]">티켓 수령 및 본인 확인을 위해 반드시 정확한 연락처와 이메일주소를 입력해 주세요.</p>
            </section>

            <section>
              <h2 className="mb-5 text-2xl font-bold">결제수단</h2>
              <div className="grid gap-3 md:grid-cols-2">
                <button onClick={() => setMethod('money')} className={`h-[60px] border text-xl font-bold ${method === 'money' ? 'border-[var(--melon)] bg-[#effff4]' : 'border-[#dddddd]'}`}>
                  <Smartphone className="mr-2 inline text-[#111]" /> 카카오페이 머니
                </button>
                <button onClick={() => setMethod('kakao-card')} className={`h-[60px] border text-xl font-bold ${method === 'kakao-card' ? 'border-[var(--melon)] bg-[#effff4]' : 'border-[#dddddd]'}`}>
                  <Smartphone className="mr-2 inline text-[#111]" /> 카카오페이 카드
                </button>
                <button onClick={() => setMethod('card')} className={`h-[60px] border text-xl font-bold ${method === 'card' ? 'border-[var(--melon)] bg-[#effff4]' : 'border-[#dddddd]'}`}>
                  <CreditCard className="mr-2 inline" /> 신용/체크카드
                </button>
                <button onClick={() => setMethod('bank')} className={`h-[60px] border text-xl font-bold ${method === 'bank' ? 'border-[var(--melon)] bg-[#effff4]' : 'border-[#dddddd]'}`}>
                  무통장입금
                </button>
              </div>
              {method === 'card' && (
                <div className="mt-4 grid gap-2 md:grid-cols-[160px_1fr] md:items-center">
                  <label className="font-bold text-[#555]">무이자 선택</label>
                  <select
                    value={installment}
                    onChange={(event) => {
                      setInstallment(event.target.value);
                      setSeconds((prev) => Math.max(1, prev - 4));
                      setEvent({
                        title: '무이자 옵션 확인 중',
                        message: '카드 할부 조건을 확인하는 동안 시간이 줄어듭니다. 실전에서는 기본값으로 빠르게 진행하는 편이 안전합니다.',
                        severity: 'warning',
                        action: '빠른 선택'
                      });
                    }}
                    className="h-11 border border-[#dddddd] px-3"
                  >
                    <option>일시불</option>
                    <option>2개월 무이자</option>
                    <option>3개월 무이자</option>
                    <option>6개월 부분무이자</option>
                  </select>
                </div>
              )}
              <div className="mt-6 bg-[#fafafa] p-6 leading-8 text-[#777]">
                카카오페이 머니는 카카오톡 내에서 카카오머니를 충전하여 결제 시 간단하게 비밀번호만으로 결제할 수 있는 간편결제 서비스입니다.
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-center justify-between border-b border-[#dddddd] pb-4">
                <h2 className="text-2xl font-bold">예매자동의</h2>
                <label className="text-lg">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={checked.length === agreements.length}
                    onChange={(event) => toggleAll(event.target.checked)}
                  />
                  전체동의
                </label>
              </div>
              <div className="mb-5 bg-[#fafafa] px-9 py-5 text-center">
                <div className="grid grid-cols-2 border-b border-[#eeeeee] py-3 text-[#999]">
                  <span>취소일</span>
                  <span>취소수수료</span>
                </div>
                {['2026.05.21 ~ 2026.05.27 없음', '2026.05.28 ~ 2026.05.30 티켓금액의 10%', '2026.05.31 ~ 2026.06.03 티켓금액의 20%', '2026.06.04 ~ 2026.06.05 티켓금액의 30%'].map((row) => (
                  <p key={row} className="grid grid-cols-2 py-1 text-[#777]">
                    <span>{row.split(' ').slice(0, 3).join(' ')}</span>
                    <span>{row.split(' ').slice(3).join(' ')}</span>
                  </p>
                ))}
              </div>
              <div>
                {agreements.map((agreement) => (
                  <label key={agreement} className="block border-t border-[#dddddd] py-4 text-[#555]">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={checked.includes(agreement)}
                      onChange={() => toggleAgreement(agreement)}
                    />
                    {agreement}
                    <button className="ml-3 rounded-full border border-[#cccccc] px-3 py-1 text-sm text-[#777]" type="button">상세보기</button>
                  </label>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className="border-l border-[#dddddd] bg-[#fafafa] p-4">
          <div className="melon-logo mb-8 text-center text-3xl">Melon티켓</div>
          <h2 className="mb-3 text-xl">{selectedPerformance?.title ?? 'BXB LAST FANMEETING'}</h2>
          <div className="border border-[#e5e5e5] bg-white p-4 leading-8 text-[#555]">
            <p>2026.06.06(토) 18:00</p>
            <hr className="my-3" />
            <p>총 1석 선택</p>
            <p>{selectedSeat?.id ?? '좌석 미선택'}</p>
          </div>

          <h2 className="mb-3 mt-7 text-xl">결제금액</h2>
          <div className="border border-[#e5e5e5] bg-white p-4 leading-10">
            <p className="flex justify-between"><span>티켓금액</span><span>88,000원</span></p>
            <p className="flex justify-between text-[#777]"><span>기본가</span><span>88,000원</span></p>
            <p className="flex justify-between text-[#777]"><span>가격할인</span><span>0원</span></p>
            <p className="flex justify-between"><span>예매수수료</span><span>2,000원</span></p>
            <p className="flex justify-between"><span>배송료</span><span>0원</span></p>
            <hr className="my-3" />
            <p className="flex justify-between text-xl"><span>총 결제금액</span><strong className="text-3xl text-[var(--melon)]">90,000원</strong></p>
          </div>
          <p className="mt-3 text-sm text-[var(--danger)]">* 취소기한 : 2026년 6월 5일(금) 16:59 까지</p>

          <div className="mt-7">
            <Countdown seconds={seconds} label="결제 제한 시간" />
          </div>

          <div className="mt-7 grid grid-cols-2">
            <button onClick={() => navigate(`/seats/${performanceId}`)} className="flex h-[62px] items-center justify-center gap-2 border border-[#cccccc] bg-white text-lg text-[#777]">
              <ChevronLeft size={22} />
              이전
            </button>
            <button onClick={completePayment} className="h-[62px] bg-[#888] text-lg font-bold text-white hover:bg-[var(--melon)]">
              결제하기
            </button>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
