import { Timer } from 'lucide-react';

export default function Countdown({ seconds, label }) {
  const danger = seconds <= 10;

  return (
    <div className={`border px-4 py-3 ${danger ? 'border-[var(--danger)] bg-[#fff3ee]' : 'border-[#d9d9d9] bg-[#fafafa]'}`}>
      <p className="flex items-center gap-2 text-xs font-bold text-[#777]">
        <Timer size={15} />
        {label}
      </p>
      <strong className={`mt-1 block text-3xl font-black ${danger ? 'text-[var(--danger)]' : 'text-[var(--melon)]'}`}>
        {Math.max(0, seconds)}초
      </strong>
    </div>
  );
}
