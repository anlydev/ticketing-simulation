import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

export default function EventModal({ event, onClose, onRecover }) {
  if (!event) return null;

  const danger = event.severity === 'danger';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-[430px] rounded-[18px] border border-[#d8d8d8] bg-white p-7 text-center shadow-2xl">
        <button className="ml-auto block text-[#999] hover:text-[#111]" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <div className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${danger ? 'bg-[#fff0ea] text-[var(--danger)]' : 'bg-[#eafff0] text-[var(--melon)]'}`}>
          <AlertTriangle size={28} />
        </div>
        <h2 className="mt-5 text-2xl font-bold">{event.title}</h2>
        <p className="mt-3 break-keep text-[15px] leading-7 text-[#666]">{event.message}</p>
        {event.action && <p className="mt-3 text-sm font-bold text-[var(--melon)]">추천 대응: {event.action}</p>}
        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={onRecover} className="flex items-center justify-center gap-2 rounded-full bg-[var(--melon)] px-4 py-3 font-bold text-white">
            <CheckCircle2 size={18} />
            대처 완료
          </button>
          <button onClick={onClose} className="rounded-full border border-[#cccccc] px-4 py-3 font-bold text-[#555]">
            계속 진행
          </button>
        </div>
      </div>
    </div>
  );
}
