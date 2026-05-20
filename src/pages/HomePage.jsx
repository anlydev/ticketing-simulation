import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronRight, Heart, List, Share2 } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';

const dates = ['2026년 05월 29일 금요일', '2026년 05월 30일 토요일', '2026년 05월 31일 일요일'];

export default function HomePage() {
  const [performances, setPerformances] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dates[1]);
  const [openTargetAt, setOpenTargetAt] = useState(() => Date.now() + 10000);
  const [now, setNow] = useState(Date.now());
  const navigate = useNavigate();
  const { setSelectedPerformance, resetSimulation, recordOpenClick } = useSimulation();

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

  const performance = performances.find((item) => item.id === activeId) ?? performances[0];
  const remainingMs = Math.max(0, openTargetAt - now);
  const isOpen = remainingMs <= 0;
  const countdown = `${String(Math.floor(remainingMs / 1000)).padStart(2, '0')}.${String(Math.floor((remainingMs % 1000) / 10)).padStart(2, '0')}`;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setOpenTargetAt(Date.now() + 10000);
  }, [activeId, selectedDate]);

  const handleReserve = () => {
    if (!performance || !isOpen) return;
    const reactionMs = recordOpenClick(openTargetAt);
    setSelectedPerformance({
      ...performance,
      date: selectedDate.replace('년 ', '.').replace('월 ', '.').replace('일', ''),
      reactionMs
    });
    navigate(`/queue/${performance.id}`);
  };

  return (
    <AppShell>
      {performance && (
        <>
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
                <h1 className="mt-4 max-w-[680px] break-keep text-[32px] font-medium leading-tight tracking-[-0.04em]">
                  {performance.title}
                </h1>

                <dl className="mt-24 grid max-w-[720px] grid-cols-1 gap-x-16 gap-y-5 text-[16px] md:grid-cols-2">
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
                    <dd>-</dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">관람등급</dt>
                    <dd>미취학아동입장불가</dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">장르</dt>
                    <dd>콘서트</dd>
                  </div>
                  <div className="grid grid-cols-[88px_1fr]">
                    <dt className="text-[#777]">할인혜택</dt>
                    <dd>
                      <button className="border border-[#cccccc] px-3 py-1 text-sm">무이자</button>
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="hidden justify-self-end lg:block">
                <button className="mb-3 flex h-14 w-[200px] items-center justify-center gap-2 rounded-full border-2 border-[#cccccc] font-bold text-[#555]">
                  <Heart size={20} />
                  공연플래너 담기
                </button>
                <button className="h-14 w-[200px] rounded-full border-2 border-[#cccccc] font-bold text-[#777]">
                  Foreigner / 外國人
                </button>
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
                  <button className="w-[300px] border border-[var(--melon)] px-8 py-3 text-xl text-[var(--melon)]">17시 00분</button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#eeeeee] p-4">
                  <div className="text-sm text-[#777]">
                    <strong className={isOpen ? 'text-[var(--melon)]' : 'text-[var(--danger)]'}>
                      {isOpen ? '티켓 오픈' : `오픈까지 ${countdown}초`}
                    </strong>
                    <span className="ml-2">정각 클릭 속도가 대기순번과 잔여좌석에 반영됩니다.</span>
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

          <section className="mt-7 border-t border-[#eeeeee]">
            <div className="flex h-16 items-center justify-center gap-20 bg-[#fafafa] text-lg font-bold text-[#999]">
              <span>상세정보</span>
              <span>공연장정보</span>
              <span className="border-b-2 border-[var(--melon)] px-5 py-5 text-[#333]">예매안내</span>
            </div>
            <div className="space-y-10 px-3 py-14 text-[20px] leading-10 tracking-[-0.03em]">
              <h2 className="text-3xl font-medium">예매 유의사항</h2>
              <p>- 멜론티켓에서 판매하는 공연 및 행사의 세부 내용은 주최/주관사의 결정에 따릅니다. 예매 전 반드시 상세정보를 확인해 주시기 바랍니다.</p>
              <h2 className="text-3xl font-medium">티켓 수령 방법 안내</h2>
              <p>현장수령 - 예매번호가 포함되어 있는 예매확인서와 예매자의 실물 신분증을 매표소에 제출하시면 편리하게 티켓을 수령하실 수 있습니다.</p>
            </div>
          </section>
        </>
      )}
    </AppShell>
  );
}
