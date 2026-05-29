import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, CircleX, Home, RotateCcw, Trophy } from 'lucide-react';
import AppShell from '../components/AppShell.jsx';
import { useSimulation } from '../context/SimulationContext.jsx';
import { buildResult } from '../utils/scoring.js';
import { socket } from '../socket.js';

export default function ResultPage() {
  const location = useLocation();
  const { result, stats, resetSimulation, mode, setMode, selectedSeat } = useSimulation();
  const fallback = buildResult({
    stats,
    success: location.state?.success ?? false,
    failureReason: location.state?.failureReason ?? '연습이 중단되었습니다.'
  });
  const report = result ?? fallback;

  useEffect(() => {
    socket.on('multi-ranking', ({ rankings }) => {
      setMode((prev) => ({ ...prev, rankings }));
    });
    return () => socket.off('multi-ranking');
  }, [setMode]);

  const metrics = [
    ['오픈 클릭 반응', report.openReactionMs != null ? `${report.openReactionMs}ms` : '기록 없음'],
    ['오픈 반응 점수', `${report.openReactionScore}점`],
    ['종합 점수', `${report.totalScore ?? 0}점`],
    ['평균 클릭 간격', report.averageClickSpeed ? `${report.averageClickSpeed}ms` : '기록 부족'],
    ['좌석 선택 시간', report.seatSelectionTime ? `${report.seatSelectionTime}초` : '미선택'],
    ['CAPTCHA 성공률', `${report.captchaRate}%`],
    ['서버 오류 대처 점수', `${report.serverReactionScore}점`],
    ['좌석 실패 횟수', `${report.seatFailures}회`],
    ['총 오류 노출', `${report.totalErrors}회`],
    ['AI 경쟁 모드', report.botMode ?? 'live'],
    ['봇 결제 완료 좌석', `${report.botSeatsSold ?? 0}개`],
    ['봇 압박 이벤트', `${report.botPressureEvents ?? 0}회`]
  ];

  return (
    <AppShell>
      <section className="mx-auto max-w-[760px] border border-[#dddddd] bg-white p-9 text-center">
        <div className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${report.success ? 'bg-[#eafff0] text-[var(--melon)]' : 'bg-[#fff3ee] text-[var(--danger)]'}`}>
          {report.success ? <Trophy size={40} /> : <CircleX size={40} />}
        </div>
        <h2 className="mt-6 text-4xl font-black">{report.success ? '예매 성공' : '예매 실패'}</h2>
        <p className="mt-3 text-[#666]">
          {report.success ? '좌석 선택과 결제 시뮬레이션을 완료했습니다.' : report.failureReason}
        </p>

        {mode.type === 'mission' && (
          <p className="mt-3 font-bold text-[#e76b9a]">
            미션: {mode.missionZone}구역 · 선택 좌석: {selectedSeat?.zone ? `${selectedSeat.zone}구역` : '없음'}
          </p>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {metrics.map(([label, value]) => (
            <div key={label} className="border border-[#eeeeee] bg-[#fafafa] p-5 text-left">
              <p className="flex items-center gap-2 text-sm text-[#777]">
                <BarChart3 size={15} className="text-[var(--melon)]" />
                {label}
              </p>
              <strong className="mt-2 block text-2xl font-black">{value}</strong>
            </div>
          ))}
        </div>

        {mode.type === 'multi' && (
          <section className="mt-8 border border-[#eeeeee] bg-[#fafafa] p-5 text-left">
            <h3 className="text-xl font-black">멀티 순위</h3>
            <div className="mt-4 space-y-2">
              {(mode.rankings.length ? mode.rankings : mode.participants).map((player, index) => (
                <div key={player.id ?? player.name} className="flex items-center justify-between border border-[#e5e5e5] bg-white px-4 py-3">
                  <span className="font-bold">
                    {index + 1}위 · {player.name}
                  </span>
                  <span className="text-[var(--melon)]">{player.score != null ? `${player.score}점` : '결과 대기'}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            onClick={resetSimulation}
            className="inline-flex items-center justify-center gap-2 bg-[var(--melon)] px-6 py-4 font-black text-white"
          >
            <RotateCcw size={18} />
            다시하기
          </Link>
          <Link to="/" onClick={resetSimulation} className="inline-flex items-center justify-center gap-2 border border-[#cccccc] px-6 py-4 font-black text-[#555]">
            <Home size={18} />
            모드 선택
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
