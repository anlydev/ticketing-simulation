import { CalendarDays, Gauge, MapPin, Ticket } from 'lucide-react';

export default function PerformanceCard({ performance, onSelect }) {
  return (
    <article className="overflow-hidden rounded border border-white/10 bg-ticket-panel shadow-glow">
      <div className="relative h-56">
        <img className="h-full w-full object-cover" src={performance.poster} alt={performance.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="text-2xl font-black">{performance.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-200">
            {performance.tags.map((tag) => (
              <span key={tag} className="rounded border border-white/15 bg-black/45 px-2 py-1">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="grid gap-3 text-sm text-slate-300">
          <p className="flex items-center gap-2">
            <MapPin size={16} className="text-ticket-cyan" />
            {performance.venue}
          </p>
          <p className="flex items-center gap-2">
            <CalendarDays size={16} className="text-ticket-cyan" />
            {performance.date}
          </p>
          <p className="flex items-center gap-2">
            <Ticket size={16} className="text-ticket-lime" />
            {performance.price}
          </p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-slate-300">
              <Gauge size={14} /> 예매 난이도
            </span>
            <strong className="text-ticket-red">{performance.difficulty}%</strong>
          </div>
          <div className="h-2 overflow-hidden rounded bg-white/10">
            <div className="h-full bg-ticket-red" style={{ width: `${performance.difficulty}%` }} />
          </div>
        </div>
        <button
          onClick={() => onSelect(performance)}
          className="w-full rounded bg-ticket-red px-4 py-3 font-bold text-white transition hover:bg-rose-500"
        >
          예매 연습 시작
        </button>
      </div>
    </article>
  );
}
